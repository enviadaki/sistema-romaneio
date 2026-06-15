import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5Dashboard() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 6500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-10 px-12"
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, filter: 'blur(20px)', transition: { duration: 0.6 } }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="text-center mb-16"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-[4vw] font-display font-black">Visão em Tempo Real</h2>
      </motion.div>

      <div className="grid grid-cols-3 gap-8 w-full max-w-7xl">
        {/* Stat 1 */}
        <motion.div 
          className="bg-bg-muted/80 backdrop-blur-md border border-white/10 rounded-3xl p-8 relative overflow-hidden"
          initial={{ opacity: 0, y: 50 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ type: 'spring', stiffness: 150, damping: 20 }}
        >
          <div className="text-text-secondary text-lg mb-2">Pacotes Hoje</div>
          <motion.div 
            className="text-6xl font-mono font-bold text-white"
            initial={{ opacity: 0 }}
            animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          >
            4,892
          </motion.div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl" />
        </motion.div>

        {/* Stat 2 */}
        <motion.div 
          className="bg-bg-muted/80 backdrop-blur-md border border-white/10 rounded-3xl p-8 relative overflow-hidden"
          initial={{ opacity: 0, y: 50 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.1 }}
        >
          <div className="text-text-secondary text-lg mb-2">Rotas Ativas</div>
          <motion.div 
            className="text-6xl font-mono font-bold text-white"
            initial={{ opacity: 0 }}
            animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          >
            34
          </motion.div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-success/20 rounded-full blur-3xl" />
        </motion.div>

        {/* Stat 3 */}
        <motion.div 
          className="bg-bg-muted/80 backdrop-blur-md border border-white/10 rounded-3xl p-8 relative overflow-hidden"
          initial={{ opacity: 0, y: 50 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ type: 'spring', stiffness: 150, damping: 20, delay: 0.2 }}
        >
          <div className="text-text-secondary text-lg mb-2">Operadores</div>
          <motion.div 
            className="text-6xl font-mono font-bold text-white"
            initial={{ opacity: 0 }}
            animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          >
            12
          </motion.div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-warning/20 rounded-full blur-3xl" />
        </motion.div>
      </div>

    </motion.div>
  );
}
