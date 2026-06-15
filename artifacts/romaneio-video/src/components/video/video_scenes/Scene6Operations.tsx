import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene6Operations() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 6500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-10 bg-bg-dark"
      initial={{ clipPath: 'polygon(50% 0, 50% 0, 50% 100%, 50% 100%)' }}
      animate={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
      exit={{ opacity: 0, scale: 1.1, transition: { duration: 0.5 } }}
      transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="flex w-full h-full">
        {/* LOGGI Side */}
        <div className="w-1/2 h-full bg-loggi/10 relative flex flex-col items-center justify-center border-r border-white/10">
          <motion.div
            className="absolute inset-0 bg-loggi/20"
            initial={{ opacity: 0 }}
            animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 1 }}
          />
          <motion.div
            className="z-10 text-center"
            initial={{ x: -100, opacity: 0 }}
            animate={phase >= 2 ? { x: 0, opacity: 1 } : { x: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <h2 className="text-[5vw] font-display font-black text-white">LOGGI</h2>
            <p className="text-[1.5vw] text-white/80">Operação dedicada</p>
          </motion.div>
        </div>

        {/* AMAZON Side */}
        <div className="w-1/2 h-full bg-amazon/10 relative flex flex-col items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-amazon/20"
            initial={{ opacity: 0 }}
            animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 1 }}
          />
          <motion.div
            className="z-10 text-center"
            initial={{ x: 100, opacity: 0 }}
            animate={phase >= 3 ? { x: 0, opacity: 1 } : { x: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <h2 className="text-[5vw] font-display font-black text-white">AMAZON</h2>
            <p className="text-[1.5vw] text-white/80">Malha integrada</p>
          </motion.div>
        </div>
      </div>
      
      {/* Center Divider Logo/Text */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-dark border border-white/20 px-8 py-4 rounded-full z-20"
        initial={{ scale: 0, opacity: 0 }}
        animate={phase >= 2 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.5 }}
      >
        <span className="font-bold tracking-widest uppercase text-sm">UM SISTEMA</span>
      </motion.div>

    </motion.div>
  );
}
