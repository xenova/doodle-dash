

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { throttle } from '../utils.js';

const START_DRAW_EVENTS = ['mousedown', 'touchstart'];
const DRAW_EVENTS = ['mousemove', 'touchmove'];
const STOP_DRAW_EVENTS = ['mouseup', 'mouseout', 'touchend'];

// Ensure the canvas is at least as large as the screen
const CANVAS_SIZE = Math.max(window.screen.width, window.screen.height);

const SKETCH_PADDING = 4; // number of pixels around the sketch

const addEventListeners = (item, events, fn) => {
  for (let event of events) {
    item.addEventListener(event, fn);
  }
}

const removeEventListeners = (item, events, fn) => {
  for (let event of events) {
    item.removeEventListener(event, fn);
  }
}

const getPosition = (event) => {
  if (event.touches && event.touches[0]) {
    // Account for "safe area" on iPhones (i.e., notch)
    const diff = (event.target.offsetHeight - document.body.offsetHeight) / 2;
    return [event.touches[0].clientX, event.touches[0].clientY - diff]
  } else {
    return [event.offsetX, event.offsetY];
  }
}


const SketchCanvas = forwardRef(({
  onSketchChange
}, ref) => {

  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [sketchBoundingBox, setSketchBoundingBox] = useState(null); // [x1, y1, x2, y2]
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(16);


  // const handleBrushSizeChange = (event) => {
  //   setBrushSize(parseInt(event.target.value, 10));
  // };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!contextRef.current) {
      // Set up the canvas context on initial render
      // NOTE: We set `willReadFrequently` to true to improve performance.
      contextRef.current = canvas.getContext('2d', { willReadFrequently: true });
    }

    const context = contextRef.current;

    // Setup the brush
    context.imageSmoothingEnabled = true;
    context.lineWidth = brushSize;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = 'black';
    context.shadowColor = 'rgba(0, 0, 0, 0.9)'; // Set shadow color
    context.shadowBlur = 1; // Set shadow blur

    const paddingLeft = (canvas.width - window.innerWidth) / 2;
    const paddingTop = (canvas.height - window.innerHeight) / 2;

    const brushRadius = brushSize / 2;

    const handleResize = () => {
      // NOTE: We adjust the style's width and height to avoid clearing the canvas data. 
      canvas.style.width = window.innerWidth;
      canvas.style.height = window.innerHeight;
    };

    const startDrawing = (event) => {
      if (event.button !== 0) return; // Only draw on left click
      const [offsetX, offsetY] = getPosition(event);
      const canvasX = offsetX + paddingLeft;
      const canvasY = offsetY + paddingTop;
      context.moveTo(canvasX, canvasY);
      context.beginPath();
      context.lineTo(canvasX, canvasY);
      context.stroke();

      onSketchChange();

      setIsDrawing(true);

      setSketchBoundingBox(x => x === null
        ? [canvasX, canvasY, canvasX, canvasY]
        : [
          Math.min(x[0], canvasX - brushRadius),
          Math.min(x[1], canvasY - brushRadius),
          Math.max(x[2], canvasX + brushRadius),
          Math.max(x[3], canvasY + brushRadius),
        ]
      );
    };

    const draw = throttle((event) => {
      if (!isDrawing) return;

      const [offsetX, offsetY] = getPosition(event);
      const canvasX = offsetX + paddingLeft;
      const canvasY = offsetY + paddingTop;



      setSketchBoundingBox(x => [
        Math.min(x[0], canvasX - brushRadius),
        Math.min(x[1], canvasY - brushRadius),
        Math.max(x[2], canvasX + brushRadius),
        Math.max(x[3], canvasY + brushRadius),
      ]);

      context.lineTo(canvasX, canvasY);
      context.stroke();
      onSketchChange();
    }, 10);

    const stopDrawing = () => {
      setIsDrawing(false);
    };

    handleResize();

    window.addEventListener('resize', handleResize);

    addEventListeners(canvas, START_DRAW_EVENTS, startDrawing);
    addEventListeners(canvas, DRAW_EVENTS, draw);
    addEventListeners(canvas, STOP_DRAW_EVENTS, stopDrawing);

    return () => {
      window.removeEventListener('resize', handleResize);

      removeEventListeners(canvas, START_DRAW_EVENTS, startDrawing);
      removeEventListeners(canvas, DRAW_EVENTS, draw);
      removeEventListeners(canvas, STOP_DRAW_EVENTS, stopDrawing);
    };
  }, [isDrawing, brushSize, onSketchChange]);


  const getCanvasData = () => {
    if (sketchBoundingBox === null) return null;

    const context = contextRef.current;

    // Ensure sketch is square (and that aspect ratio is maintained)
    let left = sketchBoundingBox[0];
    let top = sketchBoundingBox[1];
    let width = sketchBoundingBox[2] - sketchBoundingBox[0];
    let height = sketchBoundingBox[3] - sketchBoundingBox[1];
    let sketchSize = 2 * SKETCH_PADDING;

    // Center the crop
    if (width >= height) {
      sketchSize += width;
      top = Math.max(top - (width - height) / 2, 0);
    } else {
      sketchSize += height;
      left = Math.max(left - (height - width) / 2, 0);
    }

    const imgData = context.getImageData(left - SKETCH_PADDING, top - SKETCH_PADDING, sketchSize, sketchSize);

    // DEBUG:
    // context.putImageData(imgData, 1920 / 2, 1920 / 2)
    // context.strokeRect(1920 / 2, 1920 / 2, sketchSize, sketchSize);

    return imgData;
  };

  const clearCanvas = () => {
    setSketchBoundingBox(null);
    const canvas = canvasRef.current;
    const context = contextRef.current;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setIsDrawing(false);
  };

  // Expose the getCanvasData/clearCanvas functions to the parent component
  useImperativeHandle(ref, () => ({
    getCanvasData: getCanvasData,
    clearCanvas: clearCanvas,
  }));

  return (
    <canvas
      className='object-none w-full h-full'
      ref={canvasRef}

      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
    />
  );
});
SketchCanvas.displayName = 'SketchCanvas'; // Add the display name

export default SketchCanvas;
