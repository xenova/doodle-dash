import { useEffect, useRef, useState } from 'react';
import './App.css'
import SketchCanvas from './components/SketchCanvas'
import constants from './constants'

function App() {

  useEffect(() => {
    const preventDefault = (e) => e.preventDefault();
    document.addEventListener('touchmove', preventDefault, { passive: false });
    return () => {
      document.removeEventListener('touchmove', preventDefault, { passive: false });
    }
  }, []);

  // Inputs and outputs
  const [model, setModel] = useState(constants.DEFAULT_MODEL);
  const [quantized, setQuantized] = useState(constants.DEFAULT_QUANTIZED);

  // Model loading
  const [ready, setReady] = useState(null);
  const [disabled, setDisabled] = useState(false);
  const [progressItems, setProgressItems] = useState([]);

  const [output, setOutput] = useState('');

  // Create a reference to the worker object.
  const worker = useRef(null);

  // We use the `useEffect` hook to setup the worker as soon as the `App` component is mounted.
  useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module'
      });
    }

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e) => {
      switch (e.data.status) {
        case 'initiate':
          // Model file start load: add a new progress item to the list.
          setReady(false);
          setProgressItems(prev => [...prev, e.data]);
          break;

        case 'progress':
          // Model file progress: update one of the progress items.
          setProgressItems(
            prev => prev.map(item => {
              if (item.file === e.data.file) {
                return { ...item, progress: e.data.progress }
              }
              return item;
            })
          );
          break;

        case 'done':
          // Model file loaded: remove the progress item from the list.
          setProgressItems(
            prev => prev.filter(item => item.file !== e.data.file)
          );
          break;

        case 'ready':
          // Pipeline ready: the worker is ready to accept messages.
          setReady(true);
          break;

        case 'update':
          // Generation update: update the output text.
          setOutput(e.data.output);
          break;

        case 'complete':
          // Generation complete: re-enable the "Translate" button
          setDisabled(false);
          break;
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener('message', onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () => worker.current.removeEventListener('message', onMessageReceived);
  });

  const classify = () => {
    console.log('classify', worker.current)
    if (worker.current && canvasRef.current) {
        const image = canvasRef.current.getCanvasData();
        if(image === null) {
          console.warn('nothing to predict')
        }else{
          worker.current.postMessage({ image, model, quantized })
        }
    }
  };

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
        <button onClick={classify}>Classify</button>
        <button onClick={handleGetCanvasData}>Get Canvas Data</button>
        <button onClick={handleClearCanvas}>Clear Canvas</button>
      </div>
    </>
  )
}

export default App
