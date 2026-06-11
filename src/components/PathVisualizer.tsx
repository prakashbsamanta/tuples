import React, { useEffect, useRef } from 'react';
import { Check, Lock, ChevronRight, Eye } from 'lucide-react';
import { DomainStep } from '../domains';
import { motion } from 'framer-motion';

interface PathVisualizerProps {
  steps: DomainStep[];
  currentStepIndex: number;
  /** FIX #4: which completed step is currently being reviewed (null = none). */
  reviewStepIndex?: number | null;
  /** FIX #4: invoked when a reviewable (completed or active) step is clicked. */
  onSelectStep?: (idx: number | null) => void;
}

const phaseColor: Record<string, string> = {
  'Novice': 'text-emerald-400',
  'Operator': 'text-blue-400',
  'Architect': 'text-violet-400',
  'Principal': 'text-amber-400',
  'Capstone': 'text-rose-400',
};

const phaseDot: Record<string, string> = {
  'Novice': 'bg-emerald-400',
  'Operator': 'bg-blue-400',
  'Architect': 'bg-violet-400',
  'Principal': 'bg-amber-400',
  'Capstone': 'bg-rose-400',
};

export function PathVisualizer({ steps, currentStepIndex, reviewStepIndex = null, onSelectStep }: PathVisualizerProps) {
  // Group steps by phase for phase headers
  let lastPhase = '';

  // FIX #5: keep the active step scrolled into view as the user progresses.
  const activeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentStepIndex]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-white/5">
        <ChevronRight size={15} className="text-violet-400" />
        <span className="font-mono text-xs tracking-widest uppercase text-gray-400 font-semibold">Mission Path</span>
        <span className="ml-auto font-mono text-xs text-gray-600">{Math.min(currentStepIndex, steps.length)}/{steps.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isActive = idx === currentStepIndex;
          const isReviewing = reviewStepIndex === idx;
          // FIX #4: completed steps (and the active step, to return) are interactive.
          const isInteractive = (isCompleted || isActive) && !!onSelectStep;
          const showPhaseHeader = step.phase !== lastPhase;
          lastPhase = step.phase;

          const handleClick = () => {
            if (!onSelectStep) return;
            if (isActive) onSelectStep(null);       // clicking current step exits review
            else if (isCompleted) onSelectStep(idx); // review a past step
          };

          return (
            <div key={idx}>
              {/* Phase divider */}
              {showPhaseHeader && (
                <div className={`flex items-center gap-2 px-2 py-2 mt-2 mb-1 first:mt-0`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${phaseDot[step.phase]}`} />
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${phaseColor[step.phase]}`}>
                    {step.phase}
                  </span>
                </div>
              )}

              <motion.button
                ref={isActive ? activeRef : undefined}
                type="button"
                onClick={handleClick}
                disabled={!isInteractive}
                aria-current={isActive ? 'step' : undefined}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.01 }}
                style={isActive && !isReviewing ? { background: 'var(--world-soft)', borderColor: 'var(--world-border)' } : undefined}
                className={`group w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  isReviewing
                    ? 'bg-amber-500/15 border border-amber-500/40 ring-1 ring-amber-500/20'
                    : isActive
                    ? 'border'
                    : isCompleted
                    ? 'border border-transparent hover:bg-white/5 hover:border-white/10 opacity-70 hover:opacity-100'
                    : 'border border-transparent opacity-25'
                } ${isInteractive ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {/* Step indicator */}
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                      <Check size={10} className="text-emerald-400" />
                    </div>
                  ) : isActive ? (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--world-accent)', boxShadow: '0 0 14px var(--world-glow)' }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ background: 'var(--world-ink)' }} />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <Lock size={9} className="text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div
                    style={isActive && !isReviewing ? { color: 'var(--world-accent)' } : undefined}
                    className={`text-[11px] font-mono font-semibold truncate leading-tight ${
                      isReviewing ? 'text-amber-300' : isActive ? '' : isCompleted ? 'text-gray-300' : 'text-gray-600'
                    }`}
                  >
                    {step.conceptFocus.replace(/_/g, ' ')}
                  </div>
                </div>

                {/* Review indicator / Step number */}
                {isReviewing ? (
                  <Eye size={12} className="text-amber-400 flex-shrink-0" />
                ) : isCompleted && isInteractive ? (
                  <Eye size={12} className="text-gray-700 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                ) : (
                  <span
                    style={isActive ? { color: 'var(--world-accent)' } : undefined}
                    className={`text-[10px] font-mono flex-shrink-0 ${isActive ? '' : 'text-gray-700'}`}
                  >
                    {idx + 1}
                  </span>
                )}
              </motion.button>
            </div>
          );
        })}
      </div>

      {/* Hint footer when reviewing */}
      {reviewStepIndex !== null && (
        <div className="px-4 py-2.5 border-t border-amber-500/15 bg-amber-500/5 shrink-0">
          <p className="text-[10px] font-mono text-amber-400/80 leading-relaxed">
            Reviewing step {reviewStepIndex! + 1}. Press Esc or use “Back” to return.
          </p>
        </div>
      )}
    </div>
  );
}
