import { useMemo, useState, lazy, Suspense } from 'react';
import type { Database } from 'sql.js';
import { motion } from 'framer-motion';
import { Award, Play, CheckCircle2, XCircle, RotateCcw, GraduationCap } from 'lucide-react';
import type { DomainSchema, ExamQuestion } from '../domains';
import { execTable, resultsMatch } from '../lib/validate';
import { useProgressStore } from '../store/useProgressStore';

const SqlEditor = lazy(() => import('./SqlEditor'));

export const EXAM_PASS_SCORE = 6;

interface ExamPanelProps {
  domain: DomainSchema;
  db: Database | null;
  schema: Record<string, string[]>;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Grade one exam answer against the completed mission DB, leaving it untouched. */
function grade(db: Database, q: ExamQuestion, userQuery: string): { correct: boolean; detail?: string } {
  db.run('SAVEPOINT exam_q;');
  try {
    const user = execTable(db, userQuery);
    const expected = execTable(db, q.solutionQuery);
    const cmp = resultsMatch(user, expected, q.requiresOrder);
    return { correct: cmp.match, detail: cmp.reason };
  } catch (e) {
    return { correct: false, detail: (e as Error).message };
  } finally {
    try { db.run('ROLLBACK TO exam_q; RELEASE exam_q;'); } catch { /* savepoint already gone */ }
  }
}

type ExamState =
  | { mode: 'intro' }
  | { mode: 'question'; idx: number; results: boolean[] }
  | { mode: 'done'; results: boolean[] };

/**
 * Certification exam: a shuffled pass through the domain's examPool, run on the
 * COMPLETED mission database. No hints, one attempt per question.
 */
export function ExamPanel({ domain, db, schema }: ExamPanelProps) {
  const certification = useProgressStore((s) => s.certifications[domain.domainId]);
  const recordCertification = useProgressStore((s) => s.recordCertification);

  const [state, setState] = useState<ExamState>({ mode: 'intro' });
  const [query, setQuery] = useState('');
  // One shuffled order per exam run; reshuffled when the user restarts.
  const [runId, setRunId] = useState(0);
  const questions = useMemo(
    () => shuffle(domain.examPool),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [domain.domainId, runId]
  );
  const total = questions.length;

  const start = () => {
    setQuery('');
    setState({ mode: 'question', idx: 0, results: [] });
  };
  const restart = () => {
    setRunId((n) => n + 1);
    setQuery('');
    setState({ mode: 'intro' });
  };

  const submit = () => {
    if (state.mode !== 'question' || !db || !query.trim()) return;
    const { correct } = grade(db, questions[state.idx], query);
    const results = [...state.results, correct];
    setQuery('');
    if (state.idx + 1 >= total) {
      const score = results.filter(Boolean).length;
      if (score >= EXAM_PASS_SCORE) {
        const d = new Date();
        const earnedOn = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        recordCertification(domain.domainId, { score, total, earnedOn });
      }
      setState({ mode: 'done', results });
    } else {
      setState({ mode: 'question', idx: state.idx + 1, results });
    }
  };

  if (state.mode === 'intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6 py-4 gap-3">
        <div
          className="w-12 h-12 rounded-2xl border flex items-center justify-center"
          style={{ background: 'var(--world-soft)', borderColor: 'var(--world-border)', color: 'var(--world-accent)' }}
        >
          <GraduationCap size={24} />
        </div>
        <h3 className="text-white font-bold">Certification Exam</h3>
        <p className="text-gray-400 text-xs leading-relaxed max-w-sm">
          {total} questions on the database you just built. No hints, no test runs,
          one attempt per question. Score {EXAM_PASS_SCORE}/{total} or better to earn
          the <span className="text-gray-200">{domain.domainName}</span> certification.
        </p>
        {certification && (
          <p className="flex items-center gap-1.5 text-[11px] font-mono text-volt">
            <Award size={12} /> Certified {certification.score}/{certification.total} on {certification.earnedOn}
          </p>
        )}
        <button
          onClick={start}
          data-testid="exam-start"
          style={{ background: 'var(--world-accent)', color: 'var(--world-ink)', boxShadow: '0 4px 18px var(--world-glow)' }}
          className="mt-1 px-5 py-2 text-xs font-bold rounded-xl transition-all hover:brightness-110"
        >
          {certification ? 'Retake Exam' : 'Start Exam'}
        </button>
      </div>
    );
  }

  if (state.mode === 'done') {
    const score = state.results.filter(Boolean).length;
    const passed = score >= EXAM_PASS_SCORE;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="h-full flex flex-col items-center justify-center text-center px-6 py-4 gap-3"
        data-testid="exam-result"
      >
        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${
          passed ? 'bg-volt/10 border-volt/30' : 'bg-red-500/10 border-red-500/25'
        }`}>
          {passed ? <Award size={24} className="text-volt" /> : <XCircle size={24} className="text-red-400" />}
        </div>
        <h3 className="text-white font-bold">{passed ? 'Certified!' : 'Not this time'}</h3>
        <div className="flex items-center gap-1.5">
          {state.results.map((r, i) =>
            r ? <CheckCircle2 key={i} size={14} className="text-emerald-400" />
              : <XCircle key={i} size={14} className="text-red-400" />
          )}
        </div>
        <p className="text-gray-400 text-xs">
          {score}/{total} correct — {passed
            ? `you've earned the ${domain.domainName} certification.`
            : `you need ${EXAM_PASS_SCORE}/${total}. Review the mission path and try again.`}
        </p>
        <button
          onClick={restart}
          className="mt-1 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/8 text-gray-200 rounded-xl transition-all"
        >
          <RotateCcw size={12} /> {passed ? 'Retake' : 'Try Again'}
        </button>
      </motion.div>
    );
  }

  const q = questions[state.idx];
  return (
    <div className="flex flex-col h-full min-h-0 bg-canvas/80">
      <div className="glass-bar flex items-center justify-between gap-2 px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold tracking-wider"
            style={{ color: 'var(--world-accent)', background: 'var(--world-soft)', borderColor: 'var(--world-border)' }}
          >
            EXAM
          </span>
          <span className="font-mono text-[11px] text-gray-500">
            Question <span className="text-white font-bold">{state.idx + 1}</span> / {total}
          </span>
          <div className="flex items-center gap-1 ml-1">
            {state.results.map((r, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full ${r ? 'bg-emerald-400' : 'bg-red-400'}`} />
            ))}
          </div>
        </div>
        <button
          onClick={submit}
          data-testid="exam-submit"
          style={{ background: 'var(--world-accent)', color: 'var(--world-ink)', boxShadow: '0 4px 18px var(--world-glow)' }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all hover:brightness-110"
        >
          <Play size={11} /> Final Answer
        </button>
      </div>

      <div className="px-4 py-3 border-b border-white/5 shrink-0">
        <p className="text-gray-300 text-xs leading-relaxed">{q.prompt}</p>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <Suspense fallback={<div className="h-full w-full p-4 font-mono-code text-xs text-gray-600 select-none">-- Loading editor…</div>}>
          <SqlEditor
            value={query}
            onChange={setQuery}
            onSubmit={submit}
            schema={schema}
            placeholder={'-- Exam mode: one attempt, no hints.\n-- Press ⌘+Enter to lock in your answer.'}
          />
        </Suspense>
      </div>
    </div>
  );
}
