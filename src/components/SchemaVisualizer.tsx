import { useEffect, useState } from 'react';
import { LayoutGrid, Columns } from 'lucide-react';
import { Database } from 'sql.js';
import { extractSchema, type TableSchema } from '../lib/schema';
import { SchemaGraph } from './SchemaGraph';

interface SchemaVisualizerProps {
  db: Database | null;
}

export function SchemaVisualizer({ db }: SchemaVisualizerProps) {
  const [tables, setTables] = useState<TableSchema[]>([]);

  useEffect(() => {
    setTables(extractSchema(db));
  }, [db]);

  const tableCount = tables.filter((t) => !t.isView).length;
  const viewCount = tables.filter((t) => t.isView).length;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2 shrink-0">
        <LayoutGrid size={13} className="text-violet-400" />
        <span className="font-mono text-[11px] tracking-widest uppercase text-gray-400 font-semibold">Schema Map</span>
        {tables.length > 0 && (
          <span className="ml-auto text-[10px] font-mono text-gray-600">
            {tableCount} table{tableCount !== 1 ? 's' : ''}{viewCount > 0 ? ` · ${viewCount} view` : ''}
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 relative">
        {tables.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-700">
            <Columns size={24} strokeWidth={1.5} className="mb-2 opacity-40" />
            <p className="text-xs font-mono uppercase tracking-wider">No Schema Yet</p>
            <p className="text-[11px] text-gray-700 mt-1">Create your first table to see it here</p>
          </div>
        ) : (
          <SchemaGraph tables={tables} />
        )}
      </div>
    </div>
  );
}
