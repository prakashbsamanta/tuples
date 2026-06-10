import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { ACHIEVEMENTS } from '../lib/achievements';

interface AchievementToastProps {
  achievementIds: string[];
  // changes whenever a fresh batch arrives, so the toast re-triggers
  triggerKey: number;
}

export function AchievementToast({ achievementIds, triggerKey }: AchievementToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (achievementIds.length === 0) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 4500);
    return () => clearTimeout(t);
  }, [triggerKey, achievementIds.length]);

  const unlocked = ACHIEVEMENTS.filter((a) => achievementIds.includes(a.id));

  return (
    <AnimatePresence>
      {visible && unlocked.length > 0 && (
        <div className="fixed bottom-28 right-6 z-50 flex flex-col gap-2 items-end">
          {unlocked.map((a, i) => {
            const Icon = (Icons as unknown as Record<string, ComponentType<{ size?: number; className?: string }>>)[a.icon] ?? Icons.Trophy;
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: 40, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26, delay: i * 0.08 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl glass-card border border-amber-500/30 shadow-2xl shadow-amber-500/10 max-w-xs"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">Achievement</p>
                  <p className="font-semibold text-white text-sm leading-tight">{a.label}</p>
                  <p className="text-gray-400 text-xs">{a.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}
