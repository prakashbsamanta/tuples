import { useEffect, useRef, useState } from 'react';
import initSqlJs, { type Database } from 'sql.js';
import { Play, Sparkles } from 'lucide-react';

// A tiny real database about the app itself — the homepage's proof that
// queries here actually execute. Loaded lazily; never touches mission state.
const SEED = `
CREATE TABLE worlds (id INTEGER PRIMARY KEY, name TEXT, role TEXT, steps INTEGER, danger INTEGER);
INSERT INTO worlds VALUES
 (1,'The Lab','Builder',44,2),
 (2,'The Floor','Analyst',45,3),
 (3,'The Belt','Optimizer',51,4);
CREATE TABLE skills (world_id INTEGER, skill TEXT, phase TEXT);
INSERT INTO skills VALUES
 (1,'CREATE TABLE','Novice'),(1,'Constraints','Novice'),(1,'Transactions','Architect'),
 (1,'Triggers','Architect'),(1,'JSON','Architect'),
 (2,'Joins','Operator'),(2,'Set operations','Operator'),(2,'Subqueries','Operator'),
 (2,'Window functions','Architect'),
 (3,'Recursive CTEs','Operator'),(3,'Query plans','Architect'),(3,'Indexes','Architect'),
 (3,'Trigger caches','Principal');
`;

const PRESETS: Array<{ label: string; sql: string }> = [
  { label: 'Rank the worlds', sql: "SELECT name, role, steps FROM worlds ORDER BY danger DESC;" },
  { label: 'Join the skills', sql: "SELECT w.name, COUNT(*) AS skills FROM worlds w JOIN skills s ON s.world_id = w.id GROUP BY w.name;" },
  { label: 'Window function', sql: "SELECT name, steps, SUM(steps) OVER (ORDER BY id) AS total_so_far FROM worlds;" },
];

interface Table {
  columns: string[];
  rows: unknown[][];
}

export default function ProofTerminal() {
  const dbRef = useRef<Database | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [query, setQuery] = useState(PRESETS[0].sql);
  const [result, setResult] = useState<Table | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const SQL = await initSqlJs({
          locateFile: (f: string) => `${import.meta.env.BASE_URL}passenger-wasm/${f}`,
        });
        if (cancelled) return;
        const db = new SQL.Database();
        db.run(SEED);
        dbRef.current = db;
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('failed');
      }
    })();
    return () => {
      cancelled = true;
      dbRef.current?.close();
      dbRef.current = null;
    };
  }, []);

  const run = (sql: string) => {
    const db = dbRef.current;
    if (!db || !sql.trim()) return;
    try {
      const res = db.exec(sql);
      const last = res[res.length - 1];
      setResult(last ? { columns: last.columns, rows: last.values } : { columns: [], rows: [] });
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    }
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden" data-testid="proof-terminal">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <span className="w-2.5 h-2.5 rounded-full bg-volt/50" />
          <span className="ml-2 font-mono text-[10px] tracking-widest text-gray-600 uppercase">
            live · sqlite in your browser
          </span>
        </div>
        <span className={`font-mono text-[10px] ${status === 'ready' ? 'text-volt' : 'text-gray-600'}`}>
          {status === 'loading' ? 'WAKING ENGINE…' : status === 'ready' ? '● READY' : 'ENGINE UNAVAILABLE'}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 px-4 pt-3">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => { setQuery(p.sql); run(p.sql); }}
            disabled={status !== 'ready'}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-gray-300
              bg-white/5 hover:bg-white/10 border border-white/8 rounded-lg transition-all
              disabled:opacity-40 disabled:cursor-default"
          >
            <Sparkles size={10} className="text-volt/70" />
            {p.label}
          </button>
        ))}
      </div>

      <div className="px-4 py-3">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run(query);
          }}
          rows={3}
          spellCheck={false}
          aria-label="SQL playground"
          className="w-full resize-none bg-black/30 border border-white/8 focus:border-volt/40
            rounded-xl px-3.5 py-2.5 font-mono-code text-[13px] text-volt placeholder-gray-700
            outline-none transition-colors"
          placeholder="-- type any SQL"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-[10px] text-gray-700">⌘↵ to run</span>
          <button
            onClick={() => run(query)}
            disabled={status !== 'ready'}
            data-testid="proof-run"
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold text-black
              bg-volt hover:bg-volt-dim rounded-lg transition-all disabled:opacity-40"
          >
            <Play size={11} /> Run query
          </button>
        </div>
      </div>

      {(result || error) && (
        <div className="border-t border-white/5 px-4 py-3 max-h-52 overflow-auto" data-testid="proof-output">
          {error ? (
            <p className="font-mono-code text-xs text-red-400">{error}</p>
          ) : result && result.columns.length > 0 ? (
            <table className="w-full text-left font-mono-code text-xs">
              <thead>
                <tr>
                  {result.columns.map((c) => (
                    <th key={c} className="pb-1.5 pr-4 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-t border-white/4">
                    {row.map((v, j) => (
                      <td key={j} className="py-1.5 pr-4 text-gray-300">{v === null ? <span className="text-gray-600">NULL</span> : String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="font-mono-code text-xs text-gray-500">OK — no rows returned.</p>
          )}
          {result && result.rows.length > 10 && (
            <p className="mt-1.5 font-mono text-[10px] text-gray-600">…{result.rows.length - 10} more rows</p>
          )}
        </div>
      )}
    </div>
  );
}
