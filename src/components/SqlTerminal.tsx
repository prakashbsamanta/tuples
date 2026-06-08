import React, { useState, useEffect } from 'react';
import { Play, Lightbulb, Copy, Check } from 'lucide-react';

interface SqlTerminalProps {
  onExecute: (query: string) => void;
  onRawExecute?: (query: string) => void;
  error: string | null;
  hints: {
    tier1Concept: string;
    tier2Scaffold: string;
    tier3Solution: string;
  } | null;
}

export function SqlTerminal({ onExecute, onRawExecute, error, hints }: SqlTerminalProps) {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    }
  };

  const hintLabels = ['Reveal Concept', 'Show Scaffold', 'Show Solution'];
  const nextHintLabel = hintLevel < 3 ? hintLabels[hintLevel] : null;

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#06090F]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-white/5 bg-[#0A0E1A]/80 shrink-0">
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
              onClick={() => setHintLevel(l => (l + 1) as 0 | 1 | 2 | 3)}
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
              className="px-2.5 py-1.5 text-[11px] font-medium text-gray-400
                bg-white/5 hover:bg-white/10 border border-white/8 rounded-lg transition-all"
            >
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
      <div className="flex-1 relative min-h-0">
        {/* Line numbers */}
        <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col pt-4 pb-4 select-none pointer-events-none">
          {query.split('\n').map((_, i) => (
            <div key={i} className="font-mono-code text-[11px] text-gray-700 text-right pr-3 leading-6">{i + 1}</div>
          ))}
          {query.split('\n').length === 0 && (
            <div className="font-mono-code text-[11px] text-gray-700 text-right pr-3 leading-6">1</div>
          )}
        </div>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`-- Type your SQL here...\n-- Press ⌘+Enter to submit`}
          className="absolute inset-0 w-full h-full bg-transparent font-mono-code text-sm text-gray-200 
            pl-12 pr-4 pt-4 pb-4 resize-none focus:outline-none leading-6 placeholder:text-gray-700"
          spellCheck={false}
          autoComplete="off"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-950/30 border-t border-red-500/20 shrink-0 max-h-28 overflow-y-auto">
          <div className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1 shrink-0" />
            <p className="font-mono-code text-xs text-red-400 leading-relaxed">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
