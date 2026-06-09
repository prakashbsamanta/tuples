import { useEffect } from 'react';
import { useProgressStore } from '../store/useProgressStore';

/** Fires confetti + sound on solve / level-up. Renders nothing. */
export function JuiceController() {
  useEffect(() => {
    return useProgressStore.subscribe((s, p) => {
      if (s.lastSolve && s.lastSolve !== p.lastSolve) {
        const leveledUp = Math.floor(s.xp / 500) > Math.floor(p.xp / 500);
        const combo = s.lastSolve.combo;
        import('../lib/juice').then((j) => (leveledUp ? j.celebrateLevelUp() : j.celebrateSolve(combo)));
      }
    });
  }, []);
  return null;
}
