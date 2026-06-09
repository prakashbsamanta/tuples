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

const PALETTE: Record<MascotState, { ring: string; eye: string; glow: string }> = {
  idle: { ring: '#6366f1', eye: '#a5b4fc', glow: 'rgba(99,102,241,0.45)' },
  thinking: { ring: '#38bdf8', eye: '#7dd3fc', glow: 'rgba(56,189,248,0.45)' },
  celebrate: { ring: '#34d399', eye: '#6ee7b7', glow: 'rgba(52,211,153,0.55)' },
  error: { ring: '#f87171', eye: '#fca5a5', glow: 'rgba(248,113,113,0.5)' },
};

/**
 * DB-droid — a self-contained animated SVG guide (no external Lottie/Rive assets).
 * Reacts to solve (celebrate), failed query (error), and an optional thinking prop.
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

  // eyes: open height changes per state; error eyes become a frown via path
  const eyeOpen = state === 'celebrate' ? 7 : state === 'error' ? 3 : 5;

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
            className="ml-1 px-2.5 py-1 rounded-lg rounded-bl-sm bg-[#0D1220]/90 border border-white/10 backdrop-blur
              font-mono text-[10px] tracking-wide text-gray-300 shadow-lg"
          >
            {bubble}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={reduce ? {} : { y: state === 'celebrate' ? [-2, -7, -2] : [0, -4, 0] }}
        transition={reduce ? {} : { duration: state === 'celebrate' ? 0.5 : 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{ filter: `drop-shadow(0 0 10px ${pal.glow})` }}
      >
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-label="Tuples database droid">
          {/* antenna */}
          <line x1="28" y1="10" x2="28" y2="4" stroke={pal.ring} strokeWidth="1.5" />
          <motion.circle
            cx="28" cy="4" r="2.5" fill={pal.eye}
            animate={reduce ? {} : { opacity: [0.5, 1, 0.5] }}
            transition={reduce ? {} : { duration: state === 'thinking' ? 0.6 : 2, repeat: Infinity }}
          />
          {/* DB-cylinder body / head */}
          <ellipse cx="28" cy="14" rx="15" ry="5" fill="#111a2e" stroke={pal.ring} strokeWidth="1.5" />
          <path d="M13 14 V40 a15 5 0 0 0 30 0 V14" fill="#0d1424" stroke={pal.ring} strokeWidth="1.5" />
          <path d="M13 26 a15 5 0 0 0 30 0" fill="none" stroke={pal.ring} strokeWidth="1" opacity="0.5" />

          {/* eyes */}
          {state === 'error' ? (
            <>
              <path d="M19 24 l5 3 M24 24 l-5 3" stroke={pal.eye} strokeWidth="1.6" strokeLinecap="round" />
              <path d="M32 24 l5 3 M37 24 l-5 3" stroke={pal.eye} strokeWidth="1.6" strokeLinecap="round" />
            </>
          ) : (
            <>
              <motion.rect
                x="19" rx="2" width="6" fill={pal.eye}
                animate={reduce ? { y: 22, height: eyeOpen } : { height: [eyeOpen, eyeOpen, 1, eyeOpen], y: [22, 22, 25, 22] }}
                transition={reduce ? {} : { duration: 3.4, repeat: Infinity, times: [0, 0.85, 0.9, 1] }}
              />
              <motion.rect
                x="31" rx="2" width="6" fill={pal.eye}
                animate={reduce ? { y: 22, height: eyeOpen } : { height: [eyeOpen, eyeOpen, 1, eyeOpen], y: [22, 22, 25, 22] }}
                transition={reduce ? {} : { duration: 3.4, repeat: Infinity, times: [0, 0.85, 0.9, 1] }}
              />
            </>
          )}

          {/* mouth / status line */}
          {state === 'celebrate' ? (
            <path d="M22 33 q6 5 12 0" stroke={pal.eye} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          ) : (
            <line x1="23" y1="34" x2="33" y2="34" stroke={pal.eye} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
          )}

          {/* thinking dots */}
          {state === 'thinking' && (
            <>
              {[0, 1, 2].map((i) => (
                <motion.circle
                  key={i} cx={20 + i * 8} cy="46" r="1.6" fill={pal.eye}
                  animate={reduce ? {} : { opacity: [0.2, 1, 0.2] }}
                  transition={reduce ? {} : { duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </>
          )}
        </svg>
      </motion.div>
    </div>
  );
}
