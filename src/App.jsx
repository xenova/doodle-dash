import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css'
import SketchCanvas from './components/SketchCanvas'
import constants from './constants'
import Menu from './components/Menu';
import Countdown from './components/Countdown';

import { AnimatePresence } from 'framer-motion'

const formatTime = (seconds) => {
  seconds = Math.floor(seconds);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// https://stackoverflow.com/a/12646864/13989043
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

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

  const [output, setOutput] = useState(null);

  const [countdown, setCountdown] = useState(constants.COUNTDOWN_TIMER);

  const [gameCurrentTime, setGameCurrentTime] = useState(null);

  const [gameStartTime, setGameStartTime] = useState(null);
  // const [gamePrevTime, setGamePrevTime] = useState(null);
  // const [gameCurrentTime, setGameCurrentTime] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [timeSpentDrawing, setTimeSpentDrawing] = useState(0);

  const [sketchHasChanged, setSketchHasChanged] = useState(false);

  // What the user must sketch
  const [targets, setTargets] = useState(null);
  const [targetIndex, setTargetIndex] = useState(0);


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
            console.log('timespent', timeSpentDrawing)
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
    setGameState('countdown');

    // Choose the targets here and shuffle
    const possibleLabels = Object.values(constants.LABELS)
      .filter(x => !constants.BANNED_LABELS.includes(x));
    shuffleArray(possibleLabels);

    console.log('possibleLabels', possibleLabels);
    setTargets(possibleLabels);
    setTargetIndex(0);
  }

  const handleMainClick = () => {

    if (!ready) {
      setGameState('loading');
      console.log('loading', ready)

      worker.current.postMessage({ action: 'load', model, quantized })

    } else {
      beginCountdown();
    }

  };

  // Detect for start of game
  useEffect(() => {
    if (gameState === 'countdown' && countdown <= 0) {
      setGameStartTime(performance.now());
      setTimeSpentDrawing(0);
      setGameState('playing');
    }
  }, [gameState, countdown])

  const reset = useCallback(() => {
    setOutput(null);
    setSketchHasChanged(false);
    // 
    // setGameStartTime(null);
    setTimeSpentDrawing(0);
    handleClearCanvas();
  }, []);

  // Detect for end of game
  useEffect(() => {
    if (gameState === 'playing' && gameCurrentTime !== null && gameStartTime !== null && (gameCurrentTime - gameStartTime) / 1000 > constants.GAME_DURATION) {
      setGameStartTime(null);
      reset();
      setGameState('end');
    }
  }, [reset, gameState, gameStartTime, gameCurrentTime])

  // detect for correct and go onto next
  useEffect(() => {
    if (gameState === 'playing' && output !== null && targets !== null) {
      // console.log(targets[targetIndex], output[0])

      if (targets[targetIndex] === output[0].label) {
        console.log('correct!')
        // Correct! Switch to next
        setTargetIndex(prev => prev + 1);
        setOutput(null);
        reset();
      }
    }
  }, [gameState, output, targets, targetIndex, reset]);



  // useEffect(() => {
  //   if (gameState === 'playing') {
  //     startGame();
  //   }
  // }, [gameState, countdown])

  // GAME LOOP:
  useEffect(() => {
    if (gameState === 'countdown') {
      const countdownTimer = setInterval(() => {
        setCountdown((prevCount) => prevCount - 1);
      }, 1000);

      return () => {
        clearInterval(countdownTimer);
      };
    } else if (gameState === 'playing') {

      // const startGameTime = performance.now();
      // const timer = setInterval(() => {
      //   classify();

      // }, 100);

      const refreshTime = 10;

      const classifyTimer = setInterval(() => {
        if (sketchHasChanged) {
          !isPredicting && classify();
          console.log('run')

          setTimeSpentDrawing((prev) => prev + refreshTime)

        }
        setSketchHasChanged(false);

        setGameCurrentTime(performance.now());
      }, refreshTime);

      // setTimer
      // gameStartTime
      // setGameStartTime

      return () => {
        clearInterval(classifyTimer);
      };
    } else if (gameState === 'end') {
      // reset game
      setCountdown(constants.COUNTDOWN_TIMER);
      setGameState('menu');
      // setGameStartTime(null);
      // setGameCurrentTime(null);
      setOutput(null);
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

      {((gameState === 'playing' && gameCurrentTime !== null && targets)) && (

        <div className='absolute top-5 text-center'>
          <span>targetIndex {targetIndex}</span>
          <h2 className='text-4xl'>Draw &quot;{targets[targetIndex]}&quot;</h2>
          <h3 className='text-2xl'>
            {formatTime(constants.GAME_DURATION - (gameCurrentTime - gameStartTime) / 1000)}
          </h3>
        </div>
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
