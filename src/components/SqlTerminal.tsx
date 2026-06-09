import { useState, useEffect, lazy, Suspense } from 'react';
import { Play, Lightbulb, Copy, Check, Sparkles, FlaskConical } from 'lucide-react';
import { coachError } from '../lib/errorCoach';

// Lazy-load CodeMirror so its ~140 kB (gz) bundle stays out of the initial
// payload; it loads when the terminal first mounts (i.e. inside a mission).
const SqlEditor = lazy(() => import('./SqlEditor'));

interface SqlTerminalProps {
  onExecute: (query: string) => void;
  onRawExecute?: (query: string) => void;
  error: string | null;
  hints: {
    tier1Concept: string;
    tier2Scaffold: string;
    tier3Solution: string;
  } | null;
  schema: Record<string, string[]>;
  onRevealHint?: () => void;
}

export function SqlTerminal({ onExecute, onRawExecute, error, hints, schema, onRevealHint }: SqlTerminalProps) {
  const [query, setQuery] = useState('');
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2 | 3>(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setQuery('');
    setHintLevel(0);
    setCopied(false);
  }, [hints]);

  const handleExecute = () => {
    if (query.trim()) onExecute(query);
  };

  const handleCopySolution = () => {
    if (hints) {
      setQuery(hints.tier3Solution);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hintLabels = ['Reveal Concept', 'Show Scaffold', 'Show Solution'];
  const nextHintLabel = hintLevel < 3 ? hintLabels[hintLevel] : null;

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#06090F]/80">
      {/* Toolbar */}
      <div className="glass-bar flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
          </div>
          <span className="font-mono text-[11px] text-gray-600 sm:ml-1 tracking-widest uppercase">query.sql</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {hints && nextHintLabel && (
            <button
              onClick={() => { onRevealHint?.(); setHintLevel(l => (l + 1) as 0 | 1 | 2 | 3); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-amber-400
                bg-amber-400/8 hover:bg-amber-400/15 border border-amber-400/15 rounded-lg transition-all"
            >
              <Lightbulb size={12} />
              {nextHintLabel}
            </button>
          )}
          {onRawExecute && (
            <button
              onClick={() => query.trim() && onRawExecute(query)}
              title="Preview your query's output without submitting. Runs against a temporary copy of the database — it never checks the answer or changes your progress."
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-gray-300
                bg-white/5 hover:bg-white/10 border border-white/8 rounded-lg transition-all"
            >
              <FlaskConical size={12} className="text-sky-400" />
              Test Run
            </button>
          )}
          <button
            onClick={handleExecute}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white
              bg-indigo-500 hover:bg-indigo-400 rounded-lg transition-all shadow-lg shadow-indigo-500/25"
          >
            <Play size={11} />
            Submit
            <span className="text-indigo-200/60 ml-0.5">⌘↵</span>
          </button>
        </div>
      </div>

      {/* Hints Area */}
      {hintLevel > 0 && hints && (
        <div className="border-b border-white/5 bg-[#0A0F1A] shrink-0">
          {hintLevel >= 1 && (
            <div className="px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">Concept</span>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">{hints.tier1Concept}</p>
            </div>
          )}
          {hintLevel >= 2 && (
            <div className="px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-400">Scaffold</span>
              </div>
              <pre className="font-mono-code text-xs text-blue-300 bg-blue-950/30 border border-blue-500/15 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                {hints.tier2Scaffold}
              </pre>
            </div>
          )}
          {hintLevel >= 3 && (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">Solution</span>
                </div>
                <button
                  onClick={handleCopySolution}
                  className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? 'Copied!' : 'Copy to editor'}
                </button>
              </div>
              <pre className="font-mono-code text-xs text-emerald-300 bg-emerald-950/20 border border-emerald-500/15 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                {hints.tier3Solution}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <Suspense
          fallback={
            <div className="h-full w-full p-4 font-mono-code text-xs text-gray-600 select-none">
              -- Loading editor…
            </div>
          }
        >
          <SqlEditor
            value={query}
            onChange={setQuery}
            onSubmit={handleExecute}
            schema={schema}
            placeholder={'-- Type your SQL here...\n-- Press ⌘+Enter to submit'}
          />
        </Suspense>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-950/30 border-t border-red-500/20 shrink-0 max-h-40 overflow-y-auto">
          <div className="px-4 py-3 flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1 shrink-0" />
            <p className="font-mono-code text-xs text-red-400 leading-relaxed">{error}</p>
          </div>
          {coachError(error, query) && (
            <div className="mx-4 mb-3 px-3 py-2 flex items-start gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <Sparkles size={13} className="text-indigo-400 mt-0.5 shrink-0" />
              <p className="text-xs text-indigo-200/90 leading-relaxed">{coachError(error, query)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
