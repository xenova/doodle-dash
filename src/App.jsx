import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css'
import SketchCanvas from './components/SketchCanvas'
import constants from './constants'
import Menu from './components/Menu';
import GameOver from './components/GameOver';
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

  // Model loading
  const [ready, setReady] = useState(false);

  // Game state
  const [gameState, setGameState] = useState('menu');
  const [countdown, setCountdown] = useState(constants.COUNTDOWN_TIMER);
  const [gameCurrentTime, setGameCurrentTime] = useState(null);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [output, setOutput] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [sketchHasChanged, setSketchHasChanged] = useState(false);

  // What the user must sketch
  const [targets, setTargets] = useState(null);
  const [targetIndex, setTargetIndex] = useState(0);
  const [predictions, setPredictions] = useState([]);

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
            const timespent = canvasRef.current.getTimeSpentDrawing();

            // Slowly start rejecting labels that are not the target
            const applyEasyMode = timespent - constants.REJECT_TIME_DELAY;
            if (applyEasyMode > 0 && filteredResult[0].score > constants.START_REJECT_THRESHOLD) {

              // The number of labels to reject
              let amount = applyEasyMode / constants.REJECT_TIME_PER_LABEL;

              for (let i = 0; i < filteredResult.length && i < amount + 1; ++i) {
                if (filteredResult[i].label === targets[targetIndex]) {
                  // The target label should not be rejected
                  continue;
                }
                if (amount > i) {
                  filteredResult[i].score = 0;
                } else {
                  // fractional amount
                  filteredResult[i].score *= (i - amount);
                }
              }

              // sort again
              filteredResult.sort((a, b) => b.score - a.score);
            }

            // Normalize to be a probability distribution
            const sum = filteredResult.reduce((acc, x) => acc + x.score, 0);
            filteredResult.forEach(x => x.score /= sum);

            setOutput(filteredResult);
          }
          break;
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener('message', onMessageReceived);
    // worker.current.addEventListener('error', alert);

    // Define a cleanup function for when the component is unmounted.
    return () => worker.current.removeEventListener('message', onMessageReceived);
  });

  // Set up classify function
  const classify = useCallback(() => {
    if (worker.current && canvasRef.current) {
      const image = canvasRef.current.getCanvasData();
      if (image !== null) {
        setIsPredicting(true);
        worker.current.postMessage({ action: 'classify', image })
      }
    }
  }, []);

  const canvasRef = useRef(null);

  const handleEndGame = (cancelled = false) => {
    endGame(cancelled);
  };

  const handleClearCanvas = (resetTimeSpentDrawing = false) => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas(resetTimeSpentDrawing);
    }
  };

  const beginCountdown = () => {
    setGameState('countdown');

    // Choose the targets here and shuffle
    const possibleLabels = Object.values(constants.LABELS)
      .filter(x => !constants.BANNED_LABELS.includes(x));
    shuffleArray(possibleLabels);

    setTargets(possibleLabels);
    setTargetIndex(0);
  }

  const handleMainClick = () => {
    if (!ready) {
      setGameState('loading');
      worker.current.postMessage({ action: 'load' })
    } else {
      beginCountdown();
    }
  };

  const handleGameOverClick = (playAgain) => {
    if (playAgain) {
      beginCountdown();
    } else {
      endGame(true);
    }
  };

  // Detect for start of game
  useEffect(() => {
    if (gameState === 'countdown' && countdown <= 0) {
      setGameStartTime(performance.now());
      setPredictions([]);
      setGameState('playing');
    }
  }, [gameState, countdown])

  const addPrediction = useCallback((isCorrect) => {
    // take snapshot of canvas
    const image = canvasRef.current.getCanvasData();

    setPredictions(prev => [...prev, {
      output: output?.[0] ?? null,
      image: image,
      correct: isCorrect,
      target: targets[targetIndex],
    }]);
  }, [output, targetIndex, targets]);

  const endGame = useCallback((cancelled = false) => {
    if (!cancelled) {
      addPrediction(false);
    }

    // reset
    setGameStartTime(null);
    setOutput(null);
    setSketchHasChanged(false);
    handleClearCanvas(true);
    setCountdown(constants.COUNTDOWN_TIMER);
    setGameState(cancelled ? 'menu' : 'end');
  }, [addPrediction]);

  // Detect for end of game
  useEffect(() => {
    if (gameState === 'playing' && gameCurrentTime !== null && gameStartTime !== null && (gameCurrentTime - gameStartTime) / 1000 > constants.GAME_DURATION) {
      endGame();
    }
  }, [endGame, gameState, gameStartTime, gameCurrentTime])


  const goNext = useCallback((isCorrect = false) => {
    if (!isCorrect) {
      // apply skip penalty (done by pretending the game started earlier)
      setGameStartTime(prev => {
        return prev - constants.SKIP_PENALTY
      });
    }
    addPrediction(isCorrect);

    setTargetIndex(prev => prev + 1);
    setOutput(null);
    setSketchHasChanged(false);
    handleClearCanvas(true);
  }, [addPrediction])

  // detect for correct and go onto next
  useEffect(() => {
    if (gameState === 'playing' && output !== null && targets !== null) {
      // console.log(targets[targetIndex], output[0])

      if (targets[targetIndex] === output[0].label) {
        // Correct! Switch to next
        goNext(true);
      }
    }
  }, [goNext, gameState, output, targets, targetIndex]);

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

      const classifyTimer = setInterval(() => {
        if (sketchHasChanged) {
          !isPredicting && classify();
        }
        setSketchHasChanged(false);

        setGameCurrentTime(performance.now());
      }, constants.PREDICTION_REFRESH_TIME);

      return () => {
        clearInterval(classifyTimer);
      };
    } else if (gameState === 'end') {
      // The game ended naturally (after timer expired)
      handleClearCanvas(true);
    }
  }, [gameState, isPredicting, sketchHasChanged, addPrediction, classify]);

  useEffect(() => {
    if (gameState === 'playing') {
      const preventDefault = (e) => e.preventDefault();
      document.addEventListener('touchmove', preventDefault, { passive: false });
      return () => {
        document.removeEventListener('touchmove', preventDefault, { passive: false });
      }
    }
  }, [gameState]);
  const menuVisible = gameState === 'menu' || gameState === 'loading';
  const isPlaying = gameState === 'playing';
  const countdownVisible = gameState === 'countdown';
  const gameOver = gameState === 'end';
  return (
    <>
      <div className={`h-full w-full top-0 left-0 absolute ${isPlaying ? '' : 'pointer-events-none'}`}>
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

      <AnimatePresence
        initial={false}
        mode='wait'
      >
        {gameOver && (
          <GameOver predictions={predictions} onClick={handleGameOverClick} />
        )}
      </AnimatePresence>

      {((isPlaying && gameCurrentTime !== null && targets)) && (

        <div className='absolute top-5 text-center'>
          <h2 className='text-4xl'>Draw &quot;{targets[targetIndex]}&quot;</h2>
          <h3 className='text-2xl'>
            {formatTime(Math.max(constants.GAME_DURATION - (gameCurrentTime - gameStartTime) / 1000, 0))}
          </h3>
        </div>
      )}

      {menuVisible && (
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

      {isPlaying && (
        <div className='absolute bottom-5 text-center'>

          <h1 className="text-2xl font-bold mb-3">
            {output && `Prediction: ${output[0].label} (${(100 * output[0].score).toFixed(1)}%)`}
          </h1>

          <div className='flex gap-2 justify-center'>
            <button onClick={() => { handleClearCanvas() }}>Clear</button>
            <button onClick={() => { goNext(false) }}>Skip</button>
            <button onClick={() => { handleEndGame(true) }}>Exit</button>
          </div>
        </div>
      )}
    </>
  )
}

export default App
