
import { motion } from 'framer-motion';

const dropIn = {
    hidden: {
        y: "-100vh",
        transition: {
            delay: 0.1,
            type: "spring",
            damping: 10,
            stiffness: 100,
        },
    },
    visible: {
        y: "0",
        opacity: 1,
        transition: {
            type: "spring",
            damping: 10,
            stiffness: 100,
        },
    }
};

function createImageFromImageData(imageData) {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Set the canvas dimensions to match the ImageData dimensions
    canvas.width = imageData.width;
    canvas.height = imageData.height;

    // Put the ImageData onto the canvas
    context.putImageData(imageData, 0, 0);

    // // Create a new image element
    // const image = new Image();

    // // Set the source of the image to the canvas data
    // image.src = canvas.toDataURL();

    return canvas.toDataURL();
}


const GameOver = ({ predictions, onClick }) => {

    console.log('predictions', predictions)

    return (
        <motion.div
            initial='hidden'
            animate={'visible'}
            variants={dropIn}
            exit="hidden"
            // animate={{ opacity:  }}
            className='absolute w-full h-full flex justify-center items-center flex-col px-8 text-center'
        >
            <h1
                className='sm:text-7xl text-6xl mb-3 font-bold tracking-tight text-slate-900 text-center'>
                Game Over!
            </h1>

            <h2
                className='mb-4 sm:text-2xl text-xl font-semibold text-slate-900'>
                Score: {predictions.filter(p => p.correct).length} / {predictions.length}
            </h2>

            <div
                className='overflow-x-auto flex gap-4 px-8 p-4 rounded-lg shadow-[0_5px_25px_-5px_rgb(0,0,0,0.1),_0_8px_10px_-6px_rgb(0,0,0,0.1);]'
            >
                {predictions.map((p, i) => {
                    return (
                        <div
                            key={i}
                            className='flex justify-center items-center w-full flex-col'
                        >


                            <img className='max-h-[12rem] min-w-[12rem]' src={p.image ? createImageFromImageData(p.image) : ''}></img>

                            <p className='text-slate-900 text-lg font-semibold mt-2'>{p.target} {p.correct ? '✅' : '❌'}</p>
                        </div>
                    )
                })}
            </div>

            <div className='flex mt-6 gap-4'>
                <button
                    onClick={() => onClick(true)}
                    type="button"
                    className={`
          inline-flex items-center px-4 py-2 font-semibold
          leading-6 shadow rounded-md text-white bg-indigo-500 hover:bg-indigo-400
          transition ease-in-out duration-150
          `}>
                    Play Again
                </button>
                <button
                    onClick={() => onClick(false)}
                    type="button"
                    className={`
    inline-flex items-center px-4 py-2 font-semibold
    leading-6 shadow rounded-md text-white bg-yellow-500 hover:bg-yellow-400
    transition ease-in-out duration-150
  `}
                >
                    Main Menu
                </button>

            </div>
        </motion.div>
    );
};

export default GameOver;
