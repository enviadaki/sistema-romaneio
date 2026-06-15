import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4Manifest() {
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
      className="absolute inset-0 flex items-center justify-center z-10"
      initial={{ scale: 1.2, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.6 } }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-full max-w-6xl flex items-center justify-between px-12">
        
        {/* PDF Document Graphic */}
        <motion.div 
          className="w-5/12 aspect-[1/1.414] bg-white rounded-lg shadow-2xl relative overflow-hidden flex flex-col p-8"
          initial={{ y: 100, rotateY: -30, opacity: 0, perspective: 1000 }}
          animate={phase >= 1 ? { y: 0, rotateY: 0, opacity: 1 } : { y: 100, rotateY: -30, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="w-full h-8 bg-black/10 rounded mb-8" />
          <div className="w-3/4 h-4 bg-black/10 rounded mb-4" />
          <div className="w-1/2 h-4 bg-black/10 rounded mb-12" />
          
          <div className="flex-1 space-y-4">
            {[...Array(6)].map((_, i) => (
              <motion.div 
                key={i}
                className="w-full h-8 border-b border-black/10 flex items-center"
                initial={{ opacity: 0, x: -20 }}
                animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="w-8 h-4 bg-black/20 rounded mr-4" />
                <div className="flex-1 h-4 bg-black/10 rounded" />
              </motion.div>
            ))}
          </div>

          <motion.div 
            className="absolute -right-4 -bottom-4 w-32 h-32 bg-error/20 rounded-full blur-2xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        </motion.div>

        <div className="w-1/2 pl-16">
          <motion.h2 
            className="text-[4.5vw] font-display font-bold leading-tight mb-6"
            initial={{ opacity: 0, x: 50 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            Romaneios em PDF
          </motion.h2>
          <motion.p
            className="text-[1.8vw] text-text-secondary"
            initial={{ opacity: 0, x: 50 }}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            Geração automática de manifesto de entrega por rota e cidade.
          </motion.p>
        </div>

      </div>
    </motion.div>
  );
}
