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

  // componentDidUpdate
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

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

const counterFactory = initial => () => initial++;
const counter = counterFactory(4);

function App() {
  const [data, setData] = useState({ legend: {}, rows: [] });

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
    async function getData() {
      // fetch CSV.
      const response = await fetch("/data/canvas01.csv");

      // read csv as string
      const reader = response.body.getReader();
      const result = await reader.read(); // raw array
      const decoder = new TextDecoder("utf-8");
      const csv = decoder.decode(result.value); // the csv text

      // append property names to parse more clearly <x, y, type, prop>
      // papa parse takes the first row in the CSV to be each row object's property name.
      const results = Papa.parse(`x,y,type,prop\n${csv}`, { header: true }); // object with { data, errors, meta }
      const rows = results.data; // array of objects

      // generates unique set of colors for each prop &
      // generates unique set of regular sided polygons for each type.
      const data = _formatData(rows);
      setData({
        legend: { colors: data.colors, shapes: data.shapes },
        rows: data.rows
      });
    }

    getData();
  }, []);

  return (
    <div>
      <Canvas {...data} />
    </div>
  );
}

export default App;
