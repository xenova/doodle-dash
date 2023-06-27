

import { useEffect, useRef, useState } from 'react';

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
      const { offsetX, offsetY } = event;

      context.moveTo(offsetX + paddingLeft, offsetY + paddingTop);
      context.beginPath();
      setIsDrawing(true);
    };

    const draw = (event) => {
      if (!isDrawing) return;

      const { offsetX, offsetY } = event;
      context.lineTo(offsetX + paddingLeft, offsetY + paddingTop);
      context.stroke();
    };

    const stopDrawing = () => {
      setIsDrawing(false);
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
    };
  }, [isDrawing, brushSize]);

  return (
    <canvas
      className='object-none w-full h-full'
      ref={canvasRef}
      style={{ border: '1px solid black' }}

      // Ensures that the canvas is scaled to the device's pixel ratio
      width={window.screen.width}
      height={window.screen.height}
    />
  );
};

export default SketchCanvas;
