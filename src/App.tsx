import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { BentoLayout } from './components/BentoLayout';
import { SqlTerminal } from './components/SqlTerminal';
import { LiveDiffTable } from './components/LiveDiffTable';
import { SchemaVisualizer } from './components/SchemaVisualizer';
import { MissionSelection } from './components/MissionSelection';
import { PathVisualizer } from './components/PathVisualizer';
import { SuccessToast } from './components/SuccessToast';
import { AchievementToast } from './components/AchievementToast';
import { GameStatus } from './components/GameStatus';
import { JuiceController } from './components/JuiceController';
import { TypewriterText } from './components/TypewriterText';
import { Mascot } from './components/Mascot';
import { ReviewPanel } from './components/ReviewPanel';
import { useSqlEngine } from './hooks/useSqlEngine';
import { useProgressStore } from './store/useProgressStore';
import { extractSchema } from './lib/schema';
import { explainConcept } from './lib/whyItWorks';
import { domains } from './domains';
import {
  DatabaseZap, CheckCircle2, LogOut, ChevronRight,
  FlaskConical, LineChart, Rocket, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Landing = lazy(() => import('./components/landing/Landing'));

const ENTERED_KEY = 'tuples_entered';

function hasEnteredBefore(): boolean {
  try {
    return localStorage.getItem(ENTERED_KEY) === '1';
  } catch {
    return true; // storage unavailable — don't trap the user on the landing
  }
}

const domainIcons: Record<string, React.ReactNode> = {
  'clinical-trials-research': <FlaskConical size={16} className="text-emerald-400" />,
  'algorithmic-trading': <LineChart size={16} className="text-indigo-400" />,
  'space-logistics': <Rocket size={16} className="text-amber-400" />,
};

const phaseColors: Record<string, string> = {
  'Novice': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'Operator': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'Architect': 'text-violet-400 bg-violet-500/10 border-violet-500/20',
};

function App() {
  const { activeDomainId, progressByDomain, setActiveDomain, resetDomain } = useProgressStore();
  // Landing shows once for brand-new visitors; anyone with mission progress skips it.
  const [entered, setEntered] = useState(hasEnteredBefore);
  const handleEnter = () => {
    try { localStorage.setItem(ENTERED_KEY, '1'); } catch { /* best effort */ }
    setEntered(true);
  };
  const lastSolve = useProgressStore((s) => s.lastSolve);
  const { isReady, db, error, results, isSuccess, executeQuery, runRawQuery } = useSqlEngine();

  const editorSchema = React.useMemo(() => {
    const tables = extractSchema(db);
    const out: Record<string, string[]> = {};
    for (const t of tables) out[t.name] = t.columns.map((c) => c.name);
    return out;
  }, [db]);

  // Track the step index that last succeeded so toast can key off it
  const [lastSuccessStep, setLastSuccessStep] = useState<number | null>(null);
  const prevSuccessRef = useRef(false);

  // FIX #4: which completed step the user is reviewing (null = working on current step)
  const [reviewStepIndex, setReviewStepIndex] = useState<number | null>(null);

  const activeProgress = activeDomainId ? progressByDomain[activeDomainId] : undefined;
  const liveStepIndex = activeProgress?.currentStepIndex ?? 0;

  useEffect(() => {
    if (isSuccess && !prevSuccessRef.current) {
      // isSuccess just turned true — record which step just passed
      const domainId = activeDomainId;
      if (domainId) {
        const p = progressByDomain[domainId];
        // At this point unlockNextStep has already fired, so currentStepIndex is already +1
        // The step that passed is currentStepIndex - 1
        setLastSuccessStep((p?.currentStepIndex ?? 1) - 1);
      }
    }
    prevSuccessRef.current = isSuccess;
  }, [isSuccess, activeDomainId, progressByDomain]);

  // Exit review and clear stale toast whenever the mission or the live step changes.
  useEffect(() => {
    setReviewStepIndex(null);
  }, [activeDomainId, liveStepIndex]);

  useEffect(() => {
    setLastSuccessStep(null);
  }, [activeDomainId]);

  // FIX #4: Esc exits review mode.
  useEffect(() => {
    if (reviewStepIndex === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setReviewStepIndex(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reviewStepIndex]);

  const handleResetProgress = () => {
    if (!activeDomainId) return;
    const name = domains[activeDomainId]?.domainName ?? 'this mission';
    if (window.confirm(`Reset all progress for "${name}"? This cannot be undone.`)) {
      setReviewStepIndex(null);
      resetDomain(activeDomainId);
    }
  };

  if (!activeDomainId) {
    const hasAnyProgress = Object.values(progressByDomain).some((p) => p.currentStepIndex > 0);
    if (!entered && !hasAnyProgress) {
      return (
        <Suspense fallback={<div className="min-h-screen" />}>
          <Landing onEnter={handleEnter} />
        </Suspense>
      );
    }
    return <MissionSelection />;
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#080C14] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/40 animate-pulse">
          <DatabaseZap size={22} className="text-white" />
        </div>
        <div className="text-center">
          <p className="text-gray-200 font-semibold">Initializing Engine</p>
          <p className="text-gray-600 text-sm font-mono mt-1">Loading WebAssembly SQLite runtime...</p>
        </div>
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const domain = domains[activeDomainId];
  if (!domain) return <MissionSelection />;

  const progress = progressByDomain[activeDomainId] || { currentStepIndex: 0 };
  const currentStepIndex = progress.currentStepIndex;
  const currentStep = domain.curriculumMatrix[currentStepIndex];
  const isComplete = currentStepIndex >= domain.curriculumMatrix.length;
  const percent = Math.round((currentStepIndex / domain.curriculumMatrix.length) * 100);

  // Step that just succeeded (for toast)
  const toastStep = lastSuccessStep !== null ? domain.curriculumMatrix[lastSuccessStep] : null;

  return (
    <>
      <JuiceController />
      <Mascot hasError={!!error} />
      <BentoLayout
        header={
          <>
            {/* Left: Brand + Mission */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <DatabaseZap size={15} className="text-white" />
                </div>
                <span className="font-bold text-white text-sm tracking-tight">Tuples</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-2 text-sm">
                {domainIcons[activeDomainId]}
                <span className="text-gray-200 font-medium">{domain.domainName}</span>
              </div>
            </div>

            {/* Center: Step info */}
            {!isComplete && currentStep && (
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold font-mono ${phaseColors[currentStep.phase]}`}>
                  {currentStep.phase.toUpperCase()}
                </span>
                <ChevronRight size={14} className="text-gray-600" />
                <span className="text-gray-400 text-sm font-mono">
                  Step <span className="text-white font-bold">{currentStepIndex + 1}</span>
                  <span className="text-gray-600"> / {domain.curriculumMatrix.length}</span>
                </span>
              </div>
            )}

            {/* Right: Progress + Switch */}
            <div className="flex items-center gap-4">
              <GameStatus />
              <div className="hidden md:flex items-center gap-2" title="Mission completion">
                <span className="text-[9px] font-mono uppercase tracking-wider text-gray-600">Mission</span>
                <div className="w-28 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                  />
                </div>
                <span className="text-xs font-mono text-gray-500 w-8 tabular-nums">{percent}%</span>
              </div>
              <button
                onClick={handleResetProgress}
                title="Reset progress for this mission"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400
                  hover:text-red-400 bg-white/5 hover:bg-red-500/10 border border-white/8 hover:border-red-500/20
                  rounded-lg transition-all"
              >
                <RotateCcw size={13} /> <span className="hidden sm:inline">Reset</span>
              </button>
              <button
                onClick={() => setActiveDomain(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400
                  hover:text-gray-200 bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15
                  rounded-lg transition-all"
              >
                <LogOut size={13} /> <span className="hidden sm:inline">Switch Mission</span>
              </button>
            </div>
          </>
        }
        pathVisualizer={
          <PathVisualizer
            steps={domain.curriculumMatrix}
            currentStepIndex={currentStepIndex}
            reviewStepIndex={reviewStepIndex}
            onSelectStep={setReviewStepIndex}
          />
        }
        narrative={
          <AnimatePresence mode="wait">
            {isComplete ? (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-4">
                  <CheckCircle2 size={28} className="text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">Mission Complete!</h2>
                <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                  You've built the complete <span className="text-gray-200">{domain.domainName}</span> database architecture from scratch — 35 steps mastered.
                </p>
                <button
                  onClick={() => setActiveDomain(null)}
                  className="mt-5 px-5 py-2.5 text-sm font-semibold bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/25"
                >
                  Choose Another Mission
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={currentStepIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                    Mission Briefing
                  </span>
                  <span className="text-[10px] font-mono text-gray-500 bg-white/3 border border-white/5 px-2 py-1 rounded-md">
                    {currentStep.conceptFocus.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  <TypewriterText text={currentStep.narrativeBriefing} />
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        }
        terminal={
          reviewStepIndex !== null && domain.curriculumMatrix[reviewStepIndex] ? (
            <ReviewPanel
              step={domain.curriculumMatrix[reviewStepIndex]}
              stepIndex={reviewStepIndex}
              totalSteps={domain.curriculumMatrix.length}
              savedQuery={activeProgress?.historicalQueries?.[reviewStepIndex] ?? null}
              onExit={() => setReviewStepIndex(null)}
            />
          ) : !isComplete ? (
            <SqlTerminal
              onExecute={executeQuery}
              onRawExecute={runRawQuery}
              error={error}
              hints={currentStep?.hints ?? null}
              schema={editorSchema}
              onRevealHint={useProgressStore.getState().revealHint}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-700 font-mono text-sm">
              -- Mission Complete --
            </div>
          )
        }
        visualizer={<SchemaVisualizer db={db} />}
        results={<LiveDiffTable results={results} isSuccess={isSuccess} />}
      />

      {/* Success Toast */}
      {toastStep && lastSuccessStep !== null && (
        <SuccessToast
          key={lastSuccessStep}
          stepIndex={lastSuccessStep}
          totalSteps={domain.curriculumMatrix.length}
          conceptFocus={toastStep.conceptFocus}
          isLastStep={lastSuccessStep >= domain.curriculumMatrix.length - 1}
          xpGained={lastSolve?.xpGained}
          explanation={explainConcept(toastStep.conceptFocus)}
        />
      )}
      {lastSolve && lastSolve.newAchievements.length > 0 && (
        <AchievementToast
          achievementIds={lastSolve.newAchievements}
          triggerKey={lastSuccessStep ?? 0}
        />
      )}
    </>
  );
}

export default App;
