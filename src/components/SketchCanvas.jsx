

import { useEffect, useRef, useState } from 'react';

const START_DRAW_EVENTS = ['mousedown', 'touchstart'];
const DRAW_EVENTS = ['mousemove', 'touchmove'];
const STOP_DRAW_EVENTS = ['mouseup', 'mouseout', 'touchend'];

// Ensure the canvas is at least as large as the screen
const CANVAS_SIZE = Math.max(window.screen.width, window.screen.height);

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

const SketchCanvas = () => {
  const canvasRef = useRef(null);
  // const [context, setContext] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(8);

  // const handleBrushSizeChange = (event) => {
  //   setBrushSize(parseInt(event.target.value, 10));
  // };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

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

    const handleResize = () => {
      // NOTE: We adjust the style's width and height to avoid clearing the canvas data. 
      canvas.style.width = window.innerWidth;
      canvas.style.height = window.innerHeight;
    };

    const startDrawing = (event) => {

      const [offsetX, offsetY] = getPosition(event);
      context.moveTo(offsetX + paddingLeft, offsetY + paddingTop);
      context.beginPath();
      setIsDrawing(true);
    };

    const draw = (event) => {
      if (!isDrawing) return;

      const [offsetX, offsetY] = getPosition(event);
      context.lineTo(offsetX + paddingLeft, offsetY + paddingTop);
      context.stroke();
    };

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
  }, [isDrawing, brushSize]);

  return (
    <canvas
      className='object-none w-full h-full'
      ref={canvasRef}
      style={{ border: '1px solid black' }}

      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
    />
  );
};

export default SketchCanvas;
