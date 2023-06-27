import { useEffect } from 'react';
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

  return (
    <>
      <h1 className="text-3xl font-bold underline">
        Hello world!
      </h1>

      <div className="d-flex justify-center items-center text-center h-screen w-screen fixed top-0 left-0">
        <SketchCanvas />
      </div>
    </>
  )
}

export default App
