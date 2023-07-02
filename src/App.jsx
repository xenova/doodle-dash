import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css'
import SketchCanvas from './components/SketchCanvas'
import constants from './constants'
import Menu from './components/Menu';
import Countdown from './components/Countdown';

import { AnimatePresence } from 'framer-motion'
function App() {

  useEffect(() => {
    const preventDefault = (e) => e.preventDefault();
    document.addEventListener('touchmove', preventDefault, { passive: false });
    return () => {
      document.removeEventListener('touchmove', preventDefault, { passive: false });
    }
  }, []);

  // Game state: menu, loading, start, playing, end
  const [gameState, setGameState] = useState('menu');

  // Inputs and outputs
  const [model, setModel] = useState(constants.DEFAULT_MODEL);
  const [quantized, setQuantized] = useState(constants.DEFAULT_QUANTIZED);

  // Model loading
  const [ready, setReady] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [progressItems, setProgressItems] = useState([]);

  const [output, setOutput] = useState('');

  const [countdown, setCountdown] = useState(3);

  const [timer, setTimer] = useState(60);

  // const [gameStartTime, setGameStartTime] = useState(null);
  // const [gamePrevTime, setGamePrevTime] = useState(null);
  // const [gameCurrentTime, setGameCurrentTime] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const [sketchHasChanged, setSketchHasChanged] = useState(false);

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
      const result = e.data;

      switch (result.status) {

        case 'ready':
          // Pipeline ready: the worker is ready to accept messages.
          setReady(true);
          beginCountdown();
          break;

        case 'update':
          // Generation update: update the output text.
          break;

        case 'result':
          // TODO optimize:

          setIsPredicting(false);

          {
            const filteredResult = result.data.filter(x => !constants.BANNED_LABELS.includes(x.label));
            console.log('filteredResult', filteredResult)
            setOutput(filteredResult);
          }
          setDisabled(false);

          // nextFrame();
          break;
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener('message', onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () => worker.current.removeEventListener('message', onMessageReceived);
  });

  const classify = useCallback(() => {
    if (worker.current && canvasRef.current) {
      const image = canvasRef.current.getCanvasData();
      if (image !== null) {
        setIsPredicting(true);
        worker.current.postMessage({ action: 'classify', image, model, quantized })
      }
    }
  }, [model, quantized]);

  const canvasRef = useRef(null);

  const handleEndGame = () => {
    setGameState('menu');
  };

  const handleClearCanvas = () => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();
    }
  };

  // start game loop timer on mount
  // useEffect(() => {
  //   console.log('game lop')
  //   const t = setInterval(() => {
  //     console.log('game loop')
  //   }, 1000 / 60);
  //   return () => clearInterval(t)
  // })

  // useEffect(() => {
  //   if (countdown <= 0) {
  //     startGame();
  //   }
  // }, [countdown]);

  const beginCountdown = () => {
    console.log('start game')
    setGameState('countdown');
  }

  const handleMainClick = () => {
    console.log('a', ready)

    if (!ready) {
      setGameState('loading');
      console.log('loading', ready)

      worker.current.postMessage({ action: 'load', model, quantized })
      // setTimeout(() => {
      // }, 5000)
    } else {
      beginCountdown();
    }

  };

  // Detect for start of game
  useEffect(() => {
    if (gameState === 'countdown' && countdown <= 0) {
      setGameState('playing');
    }
  }, [gameState, countdown])

  // useEffect(() => {
  //   if (gameState === 'playing') {
  //     startGame();
  //   }
  // }, [gameState, countdown])

  // GAME LOOP:
  useEffect(() => {
    if (gameState === 'countdown') {
      const timer = setInterval(() => {
        setCountdown((prevCount) => prevCount - 1);
      }, 1000);

      return () => {
        clearInterval(timer);
      };
    } else if (gameState === 'playing') {

      // const startGameTime = performance.now();
      // const timer = setInterval(() => {
      //   classify();

      // }, 100);
      const timer = setInterval(() => {
        !isPredicting && sketchHasChanged && classify();
        setSketchHasChanged(false);
        // setGameCurrentTime(performance.now());
      }, 10);

      return () => {
        console.log('clear timer')
        clearInterval(timer);
      };
    } else if (gameState === 'end') {
      // reset game
      setCountdown(3);
      setGameState('menu');
      // setGameStartTime(null);
      // setGameCurrentTime(null);
      setOutput('');
    }
  }, [gameState, classify, isPredicting, sketchHasChanged]);

  const menuVisible = gameState === 'menu' || gameState === 'loading';
  const countdownVisible = gameState === 'countdown';
  return (
    <>

      <div className="h-full w-full top-0 left-0 absolute">
        <SketchCanvas onSketchChange={() => {
          setSketchHasChanged(true);
        }} ref={canvasRef} />
      </div>
      <AnimatePresence
        initial={false}
        mode='wait'
      >
        {menuVisible && (
          <Menu gameState={gameState} onClick={handleMainClick} />
        )}
      </AnimatePresence>

      <AnimatePresence
        initial={false}
        mode='wait'
      >
        {countdownVisible && (
          <Countdown countdown={countdown} />
        )}
      </AnimatePresence>

      {gameState === 'playing' && (
        <div> {timer.toFixed(0)} </div>
      )}


      <div className='absolute bottom-5 text-center'>

        <h1 className="text-2xl font-bold mb-2">
          {output && `Prediction: ${output[0].label} (${(100 * output[0].score).toFixed(1)}%)`}
        </h1>

        <div className='flex gap-2 justify-center'>
          <button onClick={handleEndGame}>End game</button>
          <button onClick={handleClearCanvas}>Clear Canvas</button>
        </div>
      </div>

      {
        menuVisible && (
          <div className='absolute bottom-4'>
            Made with{" "}
            <a
              className='underline'
              href='https://github.com/xenova/transformers.js'
            >
              🤗 Transformers.js
            </a>
          </div>
        )}
    </>
  )
}

export default App
