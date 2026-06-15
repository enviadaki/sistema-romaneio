import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene7Outro() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 5500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-10 bg-bg-dark"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      transition={{ duration: 1 }}
    >
      <div className="text-center">
        <motion.h1 
          className="text-[6vw] font-display font-black tracking-tight"
          initial={{ y: 50, opacity: 0 }}
          animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          Sistema de Romaneios
        </motion.h1>
        
        <motion.p
          className="text-[2vw] text-text-secondary mt-4 font-mono tracking-widest uppercase"
          initial={{ y: 20, opacity: 0 }}
          animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: 20, opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          Logística Inteligente de Última Milha
        </motion.p>
      </div>

      <motion.div 
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4"
        initial={{ opacity: 0 }}
        animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 1, duration: 1 }}
      >
        <div className="w-12 h-1 bg-loggi rounded" />
        <div className="w-12 h-1 bg-amazon rounded" />
      </motion.div>
    </motion.div>
  );
}
