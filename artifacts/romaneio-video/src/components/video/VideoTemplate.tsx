import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1Intro } from './video_scenes/Scene1Intro';
import { Scene2Solution } from './video_scenes/Scene2Solution';
import { Scene3PreSorter } from './video_scenes/Scene3PreSorter';
import { Scene4Manifest } from './video_scenes/Scene4Manifest';
import { Scene5Dashboard } from './video_scenes/Scene5Dashboard';
import { Scene6Operations } from './video_scenes/Scene6Operations';
import { Scene7Outro } from './video_scenes/Scene7Outro';

export const SCENE_DURATIONS: Record<string, number> = {
  intro: 6000,
  solution: 7000,
  presorter: 8000,
  manifest: 7000,
  dashboard: 7000,
  operations: 7000,
  outro: 6000,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  intro: Scene1Intro,
  solution: Scene2Solution,
  presorter: Scene3PreSorter,
  manifest: Scene4Manifest,
  dashboard: Scene5Dashboard,
  operations: Scene6Operations,
  outro: Scene7Outro,
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations, loop });

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      audio.currentTime = targetTime;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted]);

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

      {/* Persistent midground accent that shifts with scene */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.15), transparent)' }}
        animate={{
          x: ['-10vw', '60vw', '20vw', '40vw', '10vw', '70vw', '-5vw'][sceneIndex] ?? '-10vw',
          y: ['10vh', '30vh', '50vh', '20vh', '60vh', '30vh', '40vh'][sceneIndex] ?? '10vh',
        }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* mode="sync" to overlap enter/exit */}
      <AnimatePresence mode="sync">
        {SceneComponent && <SceneComponent key={currentSceneKey} />}
      </AnimatePresence>

      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </div>
  );
}
