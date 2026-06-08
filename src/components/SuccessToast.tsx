import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Trophy, Zap } from 'lucide-react';

interface SuccessToastProps {
  stepIndex: number;
  totalSteps: number;
  conceptFocus: string;
  isLastStep: boolean;
  xpGained?: number;
  explanation?: string;
}

export function SuccessToast({ stepIndex, totalSteps, conceptFocus, isLastStep, xpGained, explanation }: SuccessToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(t);
  }, [stepIndex]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-6 right-6 z-50 flex items-start gap-4 px-5 py-4 rounded-2xl
            bg-[#0F1A2A] border border-emerald-500/30 shadow-2xl shadow-emerald-500/10 max-w-sm"
        >
          {/* Glow */}
          <div className="absolute inset-0 rounded-2xl bg-emerald-500/5 pointer-events-none" />

          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
            {isLastStep ? (
              <Trophy size={20} className="text-amber-400" />
            ) : (
              <CheckCircle2 size={20} className="text-emerald-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-semibold text-white text-sm">
                {isLastStep ? 'Mission Complete! 🎉' : 'Step Passed!'}
              </p>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {xpGained != null ? `+${xpGained} XP` : '+1 ✓'}
              </span>
            </div>
            <p className="text-gray-400 text-xs">{conceptFocus.replace(/_/g, ' ')}</p>
            {explanation && (
              <p className="text-gray-300 text-[11px] leading-relaxed mt-1.5 pt-1.5 border-t border-white/5">
                <span className="text-emerald-400 font-semibold">Why it works: </span>{explanation}
              </p>
            )}
            {!isLastStep && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Zap size={11} className="text-indigo-400" />
                <p className="text-[11px] text-indigo-300">
                  Step {stepIndex + 2} / {totalSteps} unlocked
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
