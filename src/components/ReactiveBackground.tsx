import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ParticleField } from './background/ParticleField';

/**
 * Full-screen WebGL backdrop: a reactive 3D particle constellation.
 * - pointer-events:none so it never blocks the UI (cursor is tracked on window)
 * - paused when the tab is hidden
 * - disabled entirely under prefers-reduced-motion
 * Lazy-loaded so three.js stays out of the initial bundle.
 */
export default function ReactiveBackground() {
  const [enabled, setEnabled] = useState(true);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false); // fade in once the WebGL context is live

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setEnabled(!mq.matches);
    const onMq = () => setEnabled(!mq.matches);
    const onVis = () => setVisible(document.visibilityState === 'visible');
    mq.addEventListener('change', onMq);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      mq.removeEventListener('change', onMq);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none transition-opacity duration-700 ease-out"
      style={{ opacity: ready ? 1 : 0 }}
    >
      <Canvas
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 9], fov: 60 }}
        frameloop={visible ? 'always' : 'never'}
        onCreated={() => setReady(true)}
      >
        <ParticleField />
      </Canvas>
    </div>
  );
}
