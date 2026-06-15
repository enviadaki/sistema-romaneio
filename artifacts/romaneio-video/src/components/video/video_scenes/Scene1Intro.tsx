import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1Intro() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 5500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center z-10"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, filter: 'blur(10px)', transition: { duration: 0.5 } }}
    >
      <div className="text-center w-full max-w-5xl px-8">
        <motion.div
          className="text-[4vw] font-display font-bold tracking-tight mb-4"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          Centenas de pacotes.
        </motion.div>
        
        <motion.div
          className="text-[4vw] font-display font-bold tracking-tight text-text-secondary mb-4"
          initial={{ y: 40, opacity: 0 }}
          animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 40, opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          Múltiplos destinos.
        </motion.div>
        
        <motion.div
          className="text-[4vw] font-display font-bold tracking-tight text-accent"
          initial={{ y: 40, opacity: 0 }}
          animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: 40, opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          Controle zero.
        </motion.div>

        {/* Abstract package shapes floating around */}
        <div className="absolute inset-0 pointer-events-none -z-10">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-16 h-16 border border-white/10 bg-white/5 backdrop-blur-sm rounded-lg"
              initial={{ 
                x: `${Math.random() * 100}vw`, 
                y: '100vh',
                rotate: Math.random() * 90 
              }}
              animate={phase >= 1 ? { 
                y: '-20vh',
                rotate: Math.random() * 180 
              } : {}}
              transition={{ 
                duration: 4 + Math.random() * 2, 
                ease: 'linear',
                delay: i * 0.2
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
