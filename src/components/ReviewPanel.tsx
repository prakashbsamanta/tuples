import React from 'react';
import { motion } from 'framer-motion';
import { Eye, ArrowLeft, Code2, History, Lightbulb } from 'lucide-react';
import { DomainStep } from '../domains';

interface ReviewPanelProps {
  step: DomainStep;
  stepIndex: number;
  totalSteps: number;
  savedQuery: string | null;
  onExit: () => void;
}

/**
 * FIX #4: Read-only review of a previously completed step — shows its briefing,
 * the exact query the user submitted, and all hint tiers. Does NOT touch the
 * live database or progress.
 */
export function ReviewPanel({ step, stepIndex, totalSteps, savedQuery, onExit }: ReviewPanelProps) {
  return (
    <motion.div
      key={`review-${stepIndex}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full min-h-0 bg-canvas"
    >
      {/* Review banner */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-500/20 bg-amber-500/8 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Eye size={13} className="text-amber-400 shrink-0" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-amber-400 font-semibold shrink-0">
            Reviewing
          </span>
          <span className="text-gray-500 text-xs font-mono truncate">
            Step {stepIndex + 1}/{totalSteps} · {step.conceptFocus.replace(/_/g, ' ')}
          </span>
        </div>
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white
            bg-indigo-500 hover:bg-indigo-400 rounded-lg transition-all shadow-lg shadow-indigo-500/25 shrink-0"
        >
          <ArrowLeft size={12} /> Back to Current Step
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {/* Briefing */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
              Mission Briefing
            </span>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{step.narrativeBriefing}</p>
        </div>

        {/* Your submitted query */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <History size={12} className="text-emerald-400" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
              Your Submitted Query
            </span>
          </div>
          {savedQuery ? (
            <pre className="font-mono-code text-xs text-emerald-300 bg-emerald-950/20 border border-emerald-500/15 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
              {savedQuery}
            </pre>
          ) : (
            <p className="text-xs text-gray-600 font-mono italic bg-white/3 border border-white/5 rounded-lg p-3">
              No saved query recorded for this step.
            </p>
          )}
        </div>

        {/* Reference solution */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Code2 size={12} className="text-blue-400" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-400">
              Reference Solution
            </span>
          </div>
          <pre className="font-mono-code text-xs text-blue-300 bg-blue-950/20 border border-blue-500/15 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
            {step.hints.tier3Solution}
          </pre>
        </div>

        {/* Concept recap */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={12} className="text-amber-400" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
              Concept
            </span>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">{step.hints.tier1Concept}</p>
        </div>
      </div>
    </motion.div>
  );
}
