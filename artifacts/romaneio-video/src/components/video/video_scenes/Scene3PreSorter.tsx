import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3PreSorter() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2000), // Beep 1
      setTimeout(() => setPhase(4), 2500), // Beep 2
      setTimeout(() => setPhase(5), 3000), // Beep 3
      setTimeout(() => setPhase(6), 4000),
      setTimeout(() => setPhase(7), 7500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-between px-20 z-10 bg-bg-dark"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%', transition: { duration: 0.6, ease: [0.76, 0, 0.24, 1] } }}
      transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="w-1/2 pr-12">
        <motion.h2 
          className="text-[5vw] font-display font-bold leading-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
        >
          Pré-Sorter Industrial
        </motion.h2>
        <motion.p
          className="text-[1.8vw] text-text-secondary mt-6"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          Bipagem ultrarrápida.
          <br/>Recepção instantânea.
        </motion.p>
      </div>

      <div className="w-1/2 relative h-[60vh] bg-bg-muted rounded-3xl border border-white/10 overflow-hidden flex flex-col items-center justify-center">
        {/* Abstract Scanner UI */}
        <div className="w-full px-12 space-y-4">
          {[3, 4, 5].map((p, i) => (
            <motion.div 
              key={p}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-6 flex justify-between items-center"
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={phase >= p ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 50, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <div className="font-mono text-xl tracking-wider">AMZ-99{i}827X</div>
              <div className="px-4 py-1 rounded bg-success/20 text-success text-sm font-bold">LIDO</div>
            </motion.div>
          ))}
        </div>

        {/* Scan line effect */}
        <motion.div 
          className="absolute top-0 left-0 right-0 h-1 bg-success shadow-[0_0_20px_rgba(16,185,129,0.8)]"
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}
