import { useEffect, useState } from 'react';
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'framer-motion';
import { Check, Trophy, Zap } from 'lucide-react';

interface SuccessToastProps {
  stepIndex: number;
  totalSteps: number;
  conceptFocus: string;
  isLastStep: boolean;
  xpGained?: number;
  explanation?: string;
}

/** Animated +XP counter that ticks up from 0. */
function XpCounter({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => `+${Math.round(v)} XP`);
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.7, ease: 'easeOut' });
    return controls.stop;
  }, [mv, value]);
  return <motion.span>{rounded}</motion.span>;
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
            glass-card border-volt/25 shadow-2xl shadow-volt/5 max-w-sm"
          data-testid="success-toast"
        >
          <div className="w-10 h-10 rounded-xl bg-volt/10 border border-volt/25 flex items-center justify-center shrink-0">
            {isLastStep ? (
              <Trophy size={20} className="text-amber-400" />
            ) : (
              <Check size={20} className="text-volt" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-semibold text-white text-sm">
                {isLastStep ? 'Mission Complete!' : 'Verified.'}
              </p>
              <span className="text-[10px] font-mono text-volt bg-volt/10 px-1.5 py-0.5 rounded border border-volt/20 tabular-nums">
                {xpGained != null ? <XpCounter value={xpGained} /> : '+1 ✓'}
              </span>
            </div>
            <p className="text-gray-400 text-xs font-mono lowercase">{conceptFocus.replace(/_/g, ' ')}</p>
            {explanation && (
              <p className="text-gray-300 text-[11px] leading-relaxed mt-1.5 pt-1.5 border-t border-white/5">
                <span className="text-volt font-semibold">Why it works: </span>{explanation}
              </p>
            )}
            {!isLastStep && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Zap size={11} className="text-gray-500" />
                <p className="text-[11px] text-gray-400 font-mono">
                  step {stepIndex + 2} / {totalSteps} unlocked
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
