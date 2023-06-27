import { useEffect, useRef } from 'react';
import './App.css'
import SketchCanvas from './components/SketchCanvas'

function App() {

  useEffect(() => {
    const preventDefault = (e) => e.preventDefault();
    document.addEventListener('touchmove', preventDefault, { passive: false });
    return () => {
      document.removeEventListener('touchmove', preventDefault, { passive: false });
    }
  }, []);

  const canvasRef = useRef(null);

  const handleGetCanvasData = () => {
    if (canvasRef.current) {
      const canvasData = canvasRef.current.getCanvasData();
      // Do something with the canvas data
      console.log(canvasData);
    }
  };

  const handleClearCanvas = () => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold underline">
        Hello world!
      </h1>

      <div className="h-full w-full top-0 left-0 absolute">
        <SketchCanvas ref={canvasRef} />
      </div>

      <div className='flex absolute bottom-5 gap-2'>
        <button onClick={handleGetCanvasData}>Get Canvas Data</button>
        <button onClick={handleClearCanvas}>Clear Canvas</button>
      </div>
    </>
  )
}

export default App
