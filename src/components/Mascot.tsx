import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgressStore } from '../store/useProgressStore';

type MascotState = 'idle' | 'thinking' | 'celebrate' | 'error';

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const BUBBLES: Record<MascotState, string | null> = {
  idle: null,
  thinking: 'crunching rows…',
  celebrate: 'verified! nice query',
  error: 'hmm — check that again',
};

const PALETTE: Record<MascotState, { fg: string; glow: string }> = {
  idle: { fg: '#6b7280', glow: 'rgba(107,114,128,0.25)' },
  thinking: { fg: '#7dd3fc', glow: 'rgba(125,211,252,0.4)' },
  celebrate: { fg: '#c8ff3d', glow: 'rgba(200,255,61,0.5)' },
  error: { fg: '#f87171', glow: 'rgba(248,113,113,0.45)' },
};

/**
 * The Tuples glyph "(,)" as a minimal status mark. Reacts to solve (celebrate),
 * failed query (error), and an optional thinking prop.
 */
export function Mascot({ thinking = false, hasError = false }: { thinking?: boolean; hasError?: boolean }) {
  const [state, setState] = useState<MascotState>('idle');
  const celebrateTimer = useRef<number | null>(null);
  const reduce = reduceMotion();

  // Celebrate transiently whenever a new solve lands.
  useEffect(() => {
    return useProgressStore.subscribe((s, p) => {
      if (s.lastSolve && s.lastSolve !== p.lastSolve) {
        setState('celebrate');
        if (celebrateTimer.current) window.clearTimeout(celebrateTimer.current);
        celebrateTimer.current = window.setTimeout(() => setState('idle'), 2600);
      }
    });
  }, []);

  // Error / thinking override idle (but never stomp an active celebrate).
  useEffect(() => {
    setState((prev) => {
      if (prev === 'celebrate') return prev;
      if (hasError) return 'error';
      if (thinking) return 'thinking';
      return 'idle';
    });
  }, [hasError, thinking]);

  const pal = PALETTE[state];
  const bubble = BUBBLES[state];

  return (
    <div className="fixed bottom-4 left-4 z-30 pointer-events-none select-none flex flex-col items-start gap-2">
      <AnimatePresence>
        {bubble && (
          <motion.div
            key={state}
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="ml-1 px-2.5 py-1 rounded-lg rounded-bl-sm bg-panel/90 border border-white/10 backdrop-blur
              font-mono text-[10px] tracking-wide text-gray-300 shadow-lg"
          >
            {bubble}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        aria-label="Tuples status glyph"
        role="img"
        animate={
          reduce
            ? {}
            : state === 'celebrate'
              ? { scale: [1, 1.18, 1], rotate: [0, -6, 6, 0] }
              : state === 'thinking'
                ? { opacity: [1, 0.45, 1] }
                : {}
        }
        transition={
          reduce
            ? {}
            : state === 'celebrate'
              ? { duration: 0.5 }
              : state === 'thinking'
                ? { duration: 1, repeat: Infinity, ease: 'easeInOut' }
                : {}
        }
        className="w-11 h-11 rounded-xl glass-card flex items-center justify-center font-mono font-bold text-base"
        style={{ color: pal.fg, boxShadow: `0 0 18px ${pal.glow}` }}
      >
        {state === 'error' ? '(!)' : '(,)'}
      </motion.div>
    </div>
  );
}
