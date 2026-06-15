import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2Solution() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 6500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-10"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.5 } }}
      transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="flex flex-col items-center justify-center w-full max-w-6xl px-12">
        <motion.div
          className="text-text-secondary uppercase tracking-widest text-[1.2vw] font-mono mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          A Solução
        </motion.div>

        <motion.h1 
          className="text-[6vw] font-display font-black leading-none mb-12"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={phase >= 1 ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          Sistema de Romaneios
        </motion.h1>

        <div className="flex gap-12 mt-8 w-full justify-center">
          <motion.div 
            className="flex-1 max-w-sm bg-bg-muted/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center"
            initial={{ opacity: 0, x: -50 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <div className="w-16 h-16 rounded-full bg-loggi/20 border border-loggi mx-auto mb-6 flex items-center justify-center">
              <span className="text-loggi font-bold text-xl">L</span>
            </div>
            <h3 className="text-2xl font-bold mb-2">LOGGI</h3>
            <p className="text-text-secondary">Cadastro dedicado</p>
          </motion.div>

          <motion.div 
            className="flex-1 max-w-sm bg-bg-muted/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center"
            initial={{ opacity: 0, x: 50 }}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <div className="w-16 h-16 rounded-full bg-amazon/20 border border-amazon mx-auto mb-6 flex items-center justify-center">
              <span className="text-amazon font-bold text-xl">A</span>
            </div>
            <h3 className="text-2xl font-bold mb-2">AMAZON</h3>
            <p className="text-text-secondary">Cadastro integrado</p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
