import React, { useEffect, useState } from 'react';
import { LayoutGrid, Columns } from 'lucide-react';
import { Database } from 'sql.js';
import { motion, AnimatePresence } from 'framer-motion';

interface SchemaVisualizerProps {
  db: Database | null;
}

interface TableSchema {
  name: string;
  columns: { name: string; type: string; pk: boolean }[];
  isView?: boolean;
}

export function SchemaVisualizer({ db }: SchemaVisualizerProps) {
  const [tables, setTables] = useState<TableSchema[]>([]);

  useEffect(() => {
    if (!db) { setTables([]); return; }
    // Guard: skip if this db instance has already been closed (sql.js nulls its
    // internal pointer on close). Prevents querying a stale db during transitions.
    if (!(db as unknown as { db: unknown }).db) return;
    try {
      const res = db.exec(
        "SELECT name, type FROM sqlite_master WHERE (type='table' OR type='view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name"
      );
      if (res.length > 0) {
        const entities = res[0].values as [string, string][];
        const schemaData = entities.map(([entityName, entityType]) => {
          let columns: { name: string; type: string; pk: boolean }[] = [];
          // FIX #6: PRAGMA table_info works on views too, so resolve columns for
          // both tables AND views instead of skipping views.
          try {
            const colRes = db.exec(`PRAGMA table_info("${entityName}")`);
            if (colRes.length > 0) {
              columns = colRes[0].values.map((row: any) => ({
                name: row[1] as string,
                type: (row[2] as string) || 'TEXT',
                pk: row[5] === 1,
              }));
            }
          } catch { /* PRAGMA failed for this entity — render it without columns */ }
          return { name: entityName, columns, isView: entityType === 'view' };
        });
        setTables(schemaData);
      } else {
        setTables([]);
      }
    } catch (e) {
      // "Database closed" is a benign transient if a stale instance slips through
      // during a rapid step transition; only surface genuine errors.
      if (e !== 'Database closed' && (e as Error)?.message !== 'Database closed') {
        console.error(e);
      }
    }
  }, [db]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2 shrink-0">
        <LayoutGrid size={13} className="text-violet-400" />
        <span className="font-mono text-[11px] tracking-widest uppercase text-gray-400 font-semibold">Schema Map</span>
        {tables.length > 0 && (
          <span className="ml-auto text-[10px] font-mono text-gray-600">{tables.filter(t => !t.isView).length} table{tables.filter(t => !t.isView).length !== 1 ? 's' : ''}{tables.filter(t => t.isView).length > 0 ? ` · ${tables.filter(t => t.isView).length} view` : ''}</span>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 relative">
        {/* Grid background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.5) 1px, transparent 0)',
          backgroundSize: '20px 20px'
        }} />

        <AnimatePresence>
          {tables.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-700">
              <Columns size={24} strokeWidth={1.5} className="mb-2 opacity-40" />
              <p className="text-xs font-mono uppercase tracking-wider">No Schema Yet</p>
              <p className="text-[11px] text-gray-700 mt-1">Create your first table to see it here</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4 relative z-10">
              {tables.map((table, ti) => (
                <motion.div
                  key={table.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: ti * 0.05 }}
                  className={`rounded-xl overflow-hidden min-w-[170px] shadow-xl ${
                    table.isView
                      ? 'border border-amber-500/20 bg-amber-950/10'
                      : 'border border-violet-500/20 bg-[#0F1425]'
                  }`}
                >
                  {/* Table header */}
                  <div className={`px-3 py-2 border-b flex items-center gap-2 ${
                    table.isView ? 'border-amber-500/15 bg-amber-900/10' : 'border-violet-500/15 bg-violet-900/10'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${table.isView ? 'bg-amber-400' : 'bg-violet-400'}`} />
                    <span className={`font-mono text-xs font-bold ${table.isView ? 'text-amber-200' : 'text-violet-200'}`}>
                      {table.name}
                    </span>
                    {table.isView && (
                      <span className="text-[9px] font-mono text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded ml-auto">VIEW</span>
                    )}
                  </div>
                  {/* Columns */}
                  {table.columns.length > 0 && (
                    <div className="p-2.5 space-y-1.5">
                      {table.columns.map((col, ci) => (
                        <div key={ci} className="flex items-center justify-between gap-3 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            {col.pk && <span className="text-yellow-500 text-[9px]">🔑</span>}
                            <span className={col.pk ? 'text-yellow-200 font-semibold' : 'text-gray-300'}>{col.name}</span>
                          </div>
                          <span className="text-gray-600 uppercase text-[9px]">{col.type}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
