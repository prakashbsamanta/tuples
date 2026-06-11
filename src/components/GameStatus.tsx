import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Zap } from 'lucide-react';
import { useProgressStore } from '../store/useProgressStore';
import { levelFromXp } from '../lib/gameLogic';

export function GameStatus() {
  const xp = useProgressStore((s) => s.xp);
  const combo = useProgressStore((s) => s.combo);
  const streakCount = useProgressStore((s) => s.streakCount);

  const { level, xpIntoLevel, xpForLevel, progress } = levelFromXp(xp);

  return (
    <div className="flex items-center gap-3">
      {/* Level + XP */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-volt/10 text-volt border border-volt/25">
          LV {level}
        </span>
        <div className="hidden sm:flex items-center gap-2" title={`${xpIntoLevel} / ${xpForLevel} XP this level`}>
          <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-volt-dim to-volt rounded-full"
            />
          </div>
          <span className="text-[9px] font-mono text-gray-500 leading-none whitespace-nowrap tabular-nums">{xpIntoLevel}/{xpForLevel} XP</span>
        </div>
      </div>

      {/* Streak */}
      {streakCount > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Flame size={12} className="text-amber-400" />
          <span className="text-[11px] font-mono font-bold text-amber-300">{streakCount}</span>
        </div>
      )}

      {/* Combo */}
      <AnimatePresence>
        {combo > 1 && (
          <motion.div
            key={combo}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 24 }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/15 border border-violet-500/25"
          >
            <Zap size={12} className="text-violet-300" />
            <span className="text-[11px] font-mono font-bold text-violet-200">{combo}x</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
