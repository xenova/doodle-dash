
import { motion } from 'framer-motion';

const dropIn = {
    hidden: {
        y: "100vh",
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
    },
    exit: {
        scale: 8,
        opacity: 0,

        transition: {
            duration: 1,
            type: "ease-out",
        },
    },
};

const Countdown = ({ countdown }) => {

    return (
        <motion.div
            initial='hidden'
            animate={'visible'}
            variants={dropIn}
            exit="exit"
            className='pointer-events-none absolute w-full h-full flex justify-center items-center'
        >
            <h1
            style={{transform: 'translateY(-5%)'}}
            
            className='text-8xl'>{countdown > 0 ? countdown : 'Draw!'}</h1>

        </motion.div>
    );
};

export default Countdown;
