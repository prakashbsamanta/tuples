import React, { Suspense, useMemo, useState, lazy } from 'react';
import { TableIcon, Inbox, BarChart3 } from 'lucide-react';
import { detectChart } from '../lib/chartShape';

const ResultChart = lazy(() => import('./ResultChart'));

interface LiveDiffTableProps {
  results: any[] | null;
  isSuccess?: boolean;
}

export function LiveDiffTable({ results, isSuccess }: LiveDiffTableProps) {
  const chartSpec = useMemo(() => detectChart(results), [results]);
  const [view, setView] = useState<'table' | 'chart'>('table');

  if (!results) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-600 select-none">
        <Inbox size={28} strokeWidth={1.5} className="mb-3 opacity-40" />
        <p className="text-xs font-mono uppercase tracking-widest font-semibold mb-1 text-gray-600">No Active Results</p>
        <p className="text-xs text-gray-700">Submit a query to see output</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-600 select-none">
        <TableIcon size={28} strokeWidth={1.5} className="mb-3 opacity-40" />
        <p className="text-xs font-mono uppercase tracking-widest font-semibold mb-1">Query Executed</p>
        <p className="text-xs text-gray-700">0 rows returned</p>
      </div>
    );
  }

  const columns = Object.keys(results[0]);
  const showChart = chartSpec && view === 'chart';

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Table Header Bar */}
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <TableIcon size={13} className="text-emerald-400" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-gray-400 font-semibold">Output</span>
        </div>
        <div className="flex items-center gap-3">
          {chartSpec && (
            <div className="flex items-center gap-0.5 bg-white/5 border border-white/8 rounded-md p-0.5">
              <button
                onClick={() => setView('table')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  view === 'table' ? 'bg-white/10 text-gray-200' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <TableIcon size={11} /> Table
              </button>
              <button
                onClick={() => setView('chart')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  view === 'chart' ? 'bg-white/10 text-indigo-300' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <BarChart3 size={11} /> Chart
              </button>
            </div>
          )}
          {isSuccess && (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              ✓ VERIFIED
            </span>
          )}
          <span className="text-[11px] font-mono text-gray-600">{results.length} row{results.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {showChart ? (
        <div className="flex-1 min-h-0">
          <Suspense fallback={<div className="h-full flex items-center justify-center text-gray-600 font-mono text-xs">Loading chart…</div>}>
            <ResultChart spec={chartSpec} />
          </Suspense>
        </div>
      ) : (
      /* Table */
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-left font-mono-code text-xs whitespace-nowrap min-w-full">
          <thead className="sticky top-0 z-10">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className="px-4 py-2.5 bg-panel border-b border-white/5 text-gray-400 font-semibold uppercase tracking-wider text-[10px]"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`border-b border-white/3 hover:bg-white/[0.025] transition-colors ${
                  rowIndex % 2 === 0 ? '' : 'bg-white/[0.01]'
                }`}
              >
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className="px-4 py-2.5 text-gray-300">
                    {row[col] !== null && row[col] !== undefined ? (
                      <span>{String(row[col])}</span>
                    ) : (
                      <span className="text-gray-700 italic text-[10px]">NULL</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
