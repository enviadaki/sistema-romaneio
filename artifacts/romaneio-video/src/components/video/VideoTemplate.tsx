import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1Intro } from './video_scenes/Scene1Intro';
import { Scene2Solution } from './video_scenes/Scene2Solution';
import { Scene3PreSorter } from './video_scenes/Scene3PreSorter';
import { Scene4Manifest } from './video_scenes/Scene4Manifest';
import { Scene5Dashboard } from './video_scenes/Scene5Dashboard';
import { Scene6Operations } from './video_scenes/Scene6Operations';
import { Scene7Outro } from './video_scenes/Scene7Outro';

const SCENE_DURATIONS = {
  intro: 6000,
  solution: 7000,
  presorter: 8000,
  manifest: 7000,
  dashboard: 7000,
  operations: 7000,
  outro: 6000,
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({
    durations: SCENE_DURATIONS,
  });

  return (
    <div
      className="w-full h-screen overflow-hidden relative"
      style={{ backgroundColor: 'var(--color-bg-dark)' }}
    >
      {/* Persistent Background */}
      <div className="absolute inset-0 z-0">
        <motion.div
          className="absolute inset-0 opacity-20 bg-cover bg-center mix-blend-luminosity"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/warehouse.jpg)` }}
          animate={{ scale: [1, 1.1], opacity: [0.1, 0.25, 0.15] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
      </div>

      {/* mode="sync" to overlap enter/exit */}
      <AnimatePresence mode="sync">
        {currentScene === 0 && <Scene1Intro key="intro" />}
        {currentScene === 1 && <Scene2Solution key="solution" />}
        {currentScene === 2 && <Scene3PreSorter key="presorter" />}
        {currentScene === 3 && <Scene4Manifest key="manifest" />}
        {currentScene === 4 && <Scene5Dashboard key="dashboard" />}
        {currentScene === 5 && <Scene6Operations key="operations" />}
        {currentScene === 6 && <Scene7Outro key="outro" />}
      </AnimatePresence>
    </div>
  );
}
