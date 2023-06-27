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

  return (
    <>
      <h1 className="text-3xl font-bold underline">
        Hello world!
      </h1>

      <div className="d-flex justify-center items-center text-center h-full w-full top-0 left-0 absolute">
        <SketchCanvas ref={canvasRef} />
      </div>
      <button onClick={handleGetCanvasData} className='absolute bottom-5 mx-auto'>Get Canvas Data</button>
    </>
  )
}

export default App
