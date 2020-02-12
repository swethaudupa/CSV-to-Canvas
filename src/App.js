import React, { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import "./App.css";

const Canvas = ({ legend, rows }) => {
  const canvasRef = useRef(null);
  // helper to draw regular polygon
  // source: https://www.arungudelli.com/html5/html5-canvas-polygon/
  const _regularPolygon = (ctx, x, y, radius, sides, color) => {
    if (sides < 3) return;

    var a = (Math.PI * 2) / sides;

    ctx.beginPath();
    ctx.translate(x, y);
    ctx.moveTo(radius, 0);

    for (var i = 1; i < sides; i++) {
      ctx.lineTo(radius * Math.cos(a * i), radius * Math.sin(a * i));
    }

    ctx.closePath();

    //resetting transformation
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = color;
    ctx.stroke();
    ctx.fill();
  };

  // Get the mouse co ordinates to show x,y,type, prop when hovered over the points
  const getCoords = e => {
    const canvas = canvasRef.current;
    let bound = canvas.getBoundingClientRect();
    //get the mouse x and y co-ordinates
    let mouseX = e.pageX - bound.top;
    let mouseY = e.pageY - bound.left;
    let coOrdinates;

    if (rows) {
      rows.forEach(row => {
        const { x, y } = row;
        /* Check if the distance between two points 
           is less than 5 so that it shows the tooltip for
           the entire area of the polygon and not just the centre (x,y)
           TODO If there is any method on canvas to achieve this (eg isPointInPath)
        */
        if (distance(mouseX, mouseY, x, y) < 5) {
          coOrdinates = row;
        }
      });
    }
    return coOrdinates;
  };

  // componentDidUpdate
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Uncomment to add the mousemove listener to show co ordinates 
    // canvas.addEventListener('mousemove', getCoords, false);

    if (rows.length && ctx) {
      // go through every row
      rows.forEach(row => {
        const { x, y, type, prop, nextOccurrence } = row;
        const radius = 5;
        const shape = legend.shapes[type];
        const color = legend.colors[prop];
        // Reset the current path
        if (nextOccurrence) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(nextOccurrence.x, nextOccurrence.y);
          ctx.stroke();
        }

        _regularPolygon(ctx, x, y, radius, shape, color);
      });
    }
  }, [rows]);

  return (
    <canvas ref={canvasRef} className="canvas" width="1000" height="1000">
      This browser doesn't support canvas. Please use Chrome/Mozilla/Safari or
      >Internet 9
    </canvas>
  );
};

// distance between two points
const distance = (x0, y0, x1, y1) => Math.hypot(x1 - x0, y1 - y0);

const counterFactory = initial => () => initial++;
const counter = counterFactory(3);
// Establish websocket connection globally so that the connection happens just once on component mounts
const ws = new WebSocket("ws://192.168.88.92:8080/");

function App() {
  const [data, setData] = useState({ legend: {}, rows: [] });
  const [dataFromWebSocket, setdataFromWebSocket] = useState([]);

  const initWebsocket = () => {
    ws.onopen = () => {
      console.log("connection established...");
    };
    ws.onmessage = event => {
      const response = JSON.parse(event.data);
      /* Construct an array which has the same structure
         as the csv response so that it can be directly
          sent to _formatData method
      */
      const newData = {
        x: response[0],
        y: response[1],
        type: response[2],
        prop: response[3]
      };
      setdataFromWebSocket(prevState => {
        return [...prevState, newData];
      });
    };
    ws.onclose = () => {
      initWebsocket();
    };
  };

  const _getRandomColor = () =>
    `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padEnd(6, 0)
      .toUpperCase()}`;

  const _formatData = rows => {
    let newResult = {
      colors: {},
      shapes: {},
      rows: []
    };

    rows.forEach((row, index) => {
      //Should only check every row below current row
      const arrayToCheck = [...rows.slice(index + 1)];
      //Find the next occurrence of the row which has the same type and property ans add it to newResult
      const nextOccurrence = arrayToCheck.find(
        r => row.type === r.type && row.prop === r.prop
      );

      newResult.rows = [...newResult.rows, { ...row, nextOccurrence }];

      newResult = {
        ...newResult,

        colors: newResult.colors.hasOwnProperty(row.prop)
          ? newResult.colors
          : {
              ...newResult.colors,
              [row.prop]: _getRandomColor()
            },
        shapes: newResult.shapes.hasOwnProperty(row.type)
          ? newResult.shapes
          : {
              ...newResult.shapes,
              [row.type]: counter()
            }
      };
    });
    return newResult;
  };

  useEffect(() => {
    /* call initWebSocket function in useEffect without any dependency as 
        the event listener keep checking for any new message from websocket
        once the websocket connection is established. 
        Note: This logic is assumed to work and not been tested.
        If it doesn't work, we might have to add dataFromWebSocket
        state variable as a dependency to it
    */
    initWebsocket();

    // Uncomment the below function to read from csv
    // async function getData() {
    //   //fetch CSV.
    //   const response = await fetch("/data/canvas01.csv");

    //   // read csv as string
    //   const reader = response.body.getReader();
    //   const result = await reader.read(); // raw array
    //   const decoder = new TextDecoder("utf-8");
    //   const csv = decoder.decode(result.value); // the csv text

    //   // append property names to parse more clearly <x, y, type, prop>
    //   // papa parse takes the first row in the CSV to be each row object's property name.
    //   const results = Papa.parse(`x,y,type,prop\n${csv}`, { header: true }); // object with { data, errors, meta }
    //   const rows = results.data; // array of objects
    // }

    // getData();

    const data = _formatData(dataFromWebSocket);
    setData({
      legend: { colors: data.colors, shapes: data.shapes },
      rows: data.rows
    });
  }, []);

  return (
    <div>
      <Canvas {...data} />
    </div>
  );
}

export default App;