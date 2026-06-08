# Phase 1 — Editor + Schema Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain `<textarea>` SQL input with a CodeMirror 6 editor that autocompletes the live DB schema, and replace the static schema cards with an interactive React Flow node graph whose edges animate relationships between tables.

**Architecture:** Pure data-transformation logic (DB schema → autocomplete config, DB schema → graph nodes/edges) lives in unit-tested `src/lib/` modules with no React or library coupling. Thin adapter components (`SqlEditor`, `SchemaGraph`) wrap the third-party libraries and consume those pure functions. The existing `SqlTerminal` and `SchemaVisualizer` keep their public props and surrounding UI (toolbar, hints, header) — only their inner input/render area is swapped.

**Tech Stack:** React 18, TypeScript, Vite, `@uiw/react-codemirror` + `@codemirror/lang-sql`, `@xyflow/react` (React Flow v12), Vitest (new, for unit testing pure logic).

---

### Task 1: Install dependencies and set up Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install runtime dependencies**

Run:
```bash
npm install @uiw/react-codemirror @codemirror/lang-sql @xyflow/react
```
Expected: packages added to `dependencies`, no peer-dependency errors.

- [ ] **Step 2: Install Vitest as a dev dependency**

Run:
```bash
npm install -D vitest
```
Expected: `vitest` added to `devDependencies`.

- [ ] **Step 3: Add the `test` script to package.json**

In `package.json`, add to the `"scripts"` block:
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 4: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Verify the test runner boots (no tests yet)**

Run: `npm test`
Expected: Vitest runs and reports "No test files found" (exit 0) or similar — it must not crash.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add CodeMirror, React Flow, and Vitest for Phase 1"
```

---

### Task 2: Schema extraction types and adapter

This is the thin sql.js adapter that reads the live database. It is verified in the browser (Task 9), not unit-tested, because it requires the WASM runtime. It produces plain data that the pure functions in later tasks transform.

**Files:**
- Create: `src/lib/schema.ts`

- [ ] **Step 1: Write `src/lib/schema.ts`**

```typescript
import { Database } from 'sql.js';

export interface ColumnSchema {
  name: string;
  type: string;
  pk: boolean;
}

export interface ForeignKey {
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  foreignKeys: ForeignKey[];
  isView: boolean;
}

/**
 * Read the live schema (tables + views, their columns, and foreign keys) from a
 * sql.js Database. Returns [] if the db is null or already closed.
 */
export function extractSchema(db: Database | null): TableSchema[] {
  if (!db) return [];
  // sql.js nulls its internal pointer on close; skip stale instances.
  if (!(db as unknown as { db: unknown }).db) return [];

  try {
    const res = db.exec(
      "SELECT name, type FROM sqlite_master WHERE (type='table' OR type='view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name"
    );
    if (res.length === 0) return [];

    const entities = res[0].values as [string, string][];
    return entities.map(([entityName, entityType]) => {
      let columns: ColumnSchema[] = [];
      let foreignKeys: ForeignKey[] = [];

      try {
        const colRes = db.exec(`PRAGMA table_info("${entityName}")`);
        if (colRes.length > 0) {
          columns = colRes[0].values.map((row: any) => ({
            name: row[1] as string,
            type: (row[2] as string) || 'TEXT',
            pk: row[5] === 1,
          }));
        }
      } catch { /* render without columns */ }

      try {
        const fkRes = db.exec(`PRAGMA foreign_key_list("${entityName}")`);
        if (fkRes.length > 0) {
          // foreign_key_list columns: id, seq, table, from, to, on_update, on_delete, match
          foreignKeys = fkRes[0].values.map((row: any) => ({
            toTable: row[2] as string,
            fromColumn: row[3] as string,
            toColumn: row[4] as string,
          }));
        }
      } catch { /* no foreign keys */ }

      return {
        name: entityName,
        columns,
        foreignKeys,
        isView: entityType === 'view',
      };
    });
  } catch (e) {
    if (e !== 'Database closed' && (e as Error)?.message !== 'Database closed') {
      console.error(e);
    }
    return [];
  }
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc -b --noEmit` (or `npm run build` later in Task 9)
Expected: no type errors in `schema.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/schema.ts
git commit -m "feat: add live schema extraction adapter (tables, columns, FKs)"
```

---

### Task 3: Autocomplete schema builder (pure, TDD)

Converts `TableSchema[]` into the `schema` config object that `@codemirror/lang-sql` uses for table/column autocompletion: `{ tableName: ['col1', 'col2'], ... }`.

**Files:**
- Create: `src/lib/buildSqlSchema.ts`
- Test: `src/lib/buildSqlSchema.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { buildSqlSchema } from './buildSqlSchema';
import type { TableSchema } from './schema';

const patients: TableSchema = {
  name: 'patients',
  columns: [
    { name: 'patient_id', type: 'INT', pk: true },
    { name: 'patient_name', type: 'TEXT', pk: false },
  ],
  foreignKeys: [],
  isView: false,
};

describe('buildSqlSchema', () => {
  it('maps each table to its list of column names', () => {
    expect(buildSqlSchema([patients])).toEqual({
      patients: ['patient_id', 'patient_name'],
    });
  });

  it('includes views as well as tables', () => {
    const view: TableSchema = {
      name: 'active_patients',
      columns: [{ name: 'patient_id', type: 'INT', pk: false }],
      foreignKeys: [],
      isView: true,
    };
    expect(buildSqlSchema([patients, view])).toEqual({
      patients: ['patient_id', 'patient_name'],
      active_patients: ['patient_id'],
    });
  });

  it('returns an empty object for no tables', () => {
    expect(buildSqlSchema([])).toEqual({});
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/buildSqlSchema.test.ts`
Expected: FAIL — cannot find module `./buildSqlSchema`.

- [ ] **Step 3: Write the implementation**

```typescript
import type { TableSchema } from './schema';

/**
 * Build the schema config consumed by @codemirror/lang-sql for autocomplete:
 * a map of table/view name to its column names.
 */
export function buildSqlSchema(tables: TableSchema[]): Record<string, string[]> {
  const schema: Record<string, string[]> = {};
  for (const table of tables) {
    schema[table.name] = table.columns.map((c) => c.name);
  }
  return schema;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/buildSqlSchema.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/buildSqlSchema.ts src/lib/buildSqlSchema.test.ts
git commit -m "feat: add SQL autocomplete schema builder with tests"
```

---

### Task 4: Graph builder (pure, TDD)

Converts `TableSchema[]` into graph nodes (one per table, laid out in a grid) and edges. An edge is created for (a) every explicit foreign key, and (b) an inferred relationship when a column name exactly matches a *different* table's primary-key column name. Duplicate edges (same source→target→column) are removed.

**Files:**
- Create: `src/lib/schemaGraph.ts`
- Test: `src/lib/schemaGraph.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { buildGraph } from './schemaGraph';
import type { TableSchema } from './schema';

const patients: TableSchema = {
  name: 'patients',
  columns: [{ name: 'patient_id', type: 'INT', pk: true }],
  foreignKeys: [],
  isView: false,
};

const dosageLogs: TableSchema = {
  name: 'dosage_logs',
  columns: [
    { name: 'log_id', type: 'INT', pk: true },
    { name: 'patient_id', type: 'INT', pk: false },
  ],
  foreignKeys: [],
  isView: false,
};

describe('buildGraph', () => {
  it('creates one node per table with the table in node data', () => {
    const { nodes } = buildGraph([patients, dosageLogs]);
    expect(nodes.map((n) => n.id)).toEqual(['patients', 'dosage_logs']);
    expect(nodes[0].data.table).toEqual(patients);
    expect(nodes[0].type).toBe('table');
    expect(typeof nodes[0].position.x).toBe('number');
    expect(typeof nodes[0].position.y).toBe('number');
  });

  it('infers an edge from a column matching another table primary key', () => {
    const { edges } = buildGraph([patients, dosageLogs]);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('dosage_logs');
    expect(edges[0].target).toBe('patients');
    expect(edges[0].animated).toBe(true);
  });

  it('creates an edge for an explicit foreign key', () => {
    const orders: TableSchema = {
      name: 'orders',
      columns: [{ name: 'order_id', type: 'INT', pk: true }, { name: 'sym', type: 'TEXT', pk: false }],
      foreignKeys: [{ fromColumn: 'sym', toTable: 'assets', toColumn: 'symbol' }],
      isView: false,
    };
    const assets: TableSchema = {
      name: 'assets',
      columns: [{ name: 'symbol', type: 'TEXT', pk: true }],
      foreignKeys: [],
      isView: false,
    };
    const { edges } = buildGraph([orders, assets]);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('orders');
    expect(edges[0].target).toBe('assets');
  });

  it('does not duplicate an edge that is both explicit and inferable', () => {
    const a: TableSchema = {
      name: 'a',
      columns: [{ name: 'b_id', type: 'INT', pk: false }],
      foreignKeys: [{ fromColumn: 'b_id', toTable: 'b', toColumn: 'b_id' }],
      isView: false,
    };
    const b: TableSchema = {
      name: 'b',
      columns: [{ name: 'b_id', type: 'INT', pk: true }],
      foreignKeys: [],
      isView: false,
    };
    const { edges } = buildGraph([a, b]);
    expect(edges).toHaveLength(1);
  });

  it('does not infer a self-edge from a table own primary key', () => {
    const { edges } = buildGraph([patients]);
    expect(edges).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/schemaGraph.test.ts`
Expected: FAIL — cannot find module `./schemaGraph`.

- [ ] **Step 3: Write the implementation**

```typescript
import type { TableSchema } from './schema';

export interface GraphNode {
  id: string;
  type: 'table';
  position: { x: number; y: number };
  data: { table: TableSchema };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated: boolean;
}

const COLUMNS = 3;
const COL_WIDTH = 280;
const ROW_HEIGHT = 220;

/** Build draggable nodes (grid layout) and relationship edges from a schema. */
export function buildGraph(tables: TableSchema[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = tables.map((table, i) => ({
    id: table.name,
    type: 'table',
    position: { x: (i % COLUMNS) * COL_WIDTH, y: Math.floor(i / COLUMNS) * ROW_HEIGHT },
    data: { table },
  }));

  // Map primary-key column name -> table name, to infer relationships.
  const pkOwner = new Map<string, string>();
  for (const table of tables) {
    for (const col of table.columns) {
      if (col.pk) pkOwner.set(col.name, table.name);
    }
  }

  const seen = new Set<string>();
  const edges: GraphEdge[] = [];

  const addEdge = (source: string, target: string, column: string) => {
    if (source === target) return;
    const key = `${source}->${target}:${column}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ id: key, source, target, label: column, animated: true });
  };

  for (const table of tables) {
    // Explicit foreign keys
    for (const fk of table.foreignKeys) {
      addEdge(table.name, fk.toTable, fk.fromColumn);
    }
    // Inferred: a column matching another table's primary-key column name
    for (const col of table.columns) {
      const owner = pkOwner.get(col.name);
      if (owner && owner !== table.name) {
        addEdge(table.name, owner, col.name);
      }
    }
  }

  return { nodes, edges };
}
```

Note: the dedupe key includes the column, so an explicit FK on column `b_id` and an inferred relationship on the same column `b_id` collapse to one edge (covered by the "does not duplicate" test).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/schemaGraph.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/schemaGraph.ts src/lib/schemaGraph.test.ts
git commit -m "feat: add schema-to-graph builder with FK + inferred edges"
```

---

### Task 5: SqlEditor component (CodeMirror)

A focused wrapper around `@uiw/react-codemirror` with SQLite syntax highlighting, schema-aware autocomplete, and a ⌘/Ctrl+Enter submit keybinding. It exposes a small interface so `SqlTerminal` can drop it in place of the textarea.

**Files:**
- Create: `src/components/SqlEditor.tsx`

- [ ] **Step 1: Write `src/components/SqlEditor.tsx`**

```tsx
import CodeMirror from '@uiw/react-codemirror';
import { sql, SQLite } from '@codemirror/lang-sql';
import { keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { useMemo } from 'react';

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  schema: Record<string, string[]>;
  placeholder?: string;
}

export function SqlEditor({ value, onChange, onSubmit, schema, placeholder }: SqlEditorProps) {
  const extensions = useMemo(() => [
    sql({ dialect: SQLite, schema, upperCaseKeywords: true }),
    // High precedence so Mod-Enter submits instead of inserting a newline.
    Prec.highest(
      keymap.of([
        { key: 'Mod-Enter', run: () => { onSubmit(); return true; } },
      ])
    ),
  ], [schema, onSubmit]);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      theme="dark"
      placeholder={placeholder}
      height="100%"
      style={{ height: '100%', fontSize: '13px' }}
      basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
    />
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc -b --noEmit`
Expected: no type errors. (If `@codemirror/view` / `@codemirror/state` are not resolvable, they are transitive deps of `@uiw/react-codemirror`; install explicitly with `npm install @codemirror/view @codemirror/state` and re-run.)

- [ ] **Step 3: Commit**

```bash
git add src/components/SqlEditor.tsx package.json package-lock.json
git commit -m "feat: add CodeMirror SqlEditor with schema autocomplete and Mod-Enter submit"
```

---

### Task 6: Integrate SqlEditor into SqlTerminal

Swap the textarea + manual line-number gutter for `SqlEditor`, and feed it the live schema. The toolbar, hints panel, error panel, and all existing props/behavior stay unchanged.

**Files:**
- Modify: `src/components/SqlTerminal.tsx`

- [ ] **Step 1: Add the schema prop to the interface**

Replace the `SqlTerminalProps` interface (lines 4-13) with:
```tsx
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
}
```

- [ ] **Step 2: Update imports and the component signature**

At the top of the file, replace `import React, { useState, useEffect } from 'react';` with:
```tsx
import { useState, useEffect } from 'react';
import { SqlEditor } from './SqlEditor';
```
(Remove `React` if no longer referenced; the `handleKeyDown` typed for `HTMLTextAreaElement` is being removed, see Step 4.)

Change the signature line to:
```tsx
export function SqlTerminal({ onExecute, onRawExecute, error, hints, schema }: SqlTerminalProps) {
```

- [ ] **Step 3: Delete the now-unused `handleKeyDown`**

Remove the `handleKeyDown` function (original lines 38-43) — CodeMirror handles the keybinding internally now.

- [ ] **Step 4: Replace the editor block**

Replace the entire `{/* Editor */}` block (original lines 138-159, the `<div className="flex-1 relative min-h-0">` containing the line-number gutter and `<textarea>`) with:
```tsx
      {/* Editor */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <SqlEditor
          value={query}
          onChange={setQuery}
          onSubmit={handleExecute}
          schema={schema}
          placeholder={'-- Type your SQL here...\n-- Press ⌘+Enter to submit'}
        />
      </div>
```

- [ ] **Step 5: Verify it type-checks**

Run: `npx tsc -b --noEmit`
Expected: no type errors. `App.tsx` will now error because it does not yet pass `schema` — that is fixed in Task 8/Step 4. To check this file in isolation, confirm the only error is the missing `schema` prop at the `<SqlTerminal>` call site in `App.tsx`.

- [ ] **Step 6: Commit**

```bash
git add src/components/SqlTerminal.tsx
git commit -m "feat: use CodeMirror SqlEditor inside SqlTerminal"
```

---

### Task 7: TableNode and SchemaGraph (React Flow)

A custom React Flow node that renders a table card (reusing the existing violet/amber table styling), plus the `SchemaGraph` component that wires nodes/edges from `buildGraph` into `<ReactFlow>`.

**Files:**
- Create: `src/components/SchemaGraph.tsx`

- [ ] **Step 1: Write `src/components/SchemaGraph.tsx`**

```tsx
import { useMemo } from 'react';
import { ReactFlow, Background, Controls, Handle, Position, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { TableSchema } from '../lib/schema';
import { buildGraph } from '../lib/schemaGraph';

function TableNode({ data }: NodeProps<{ table: TableSchema }>) {
  const table = data.table;
  return (
    <div
      className={`rounded-xl overflow-hidden min-w-[170px] shadow-xl ${
        table.isView
          ? 'border border-amber-500/30 bg-amber-950/30'
          : 'border border-violet-500/30 bg-[#0F1425]'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-violet-400" />
      <Handle type="source" position={Position.Right} className="!bg-violet-400" />
      <div className={`px-3 py-2 border-b flex items-center gap-2 ${
        table.isView ? 'border-amber-500/15 bg-amber-900/20' : 'border-violet-500/15 bg-violet-900/20'
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${table.isView ? 'bg-amber-400' : 'bg-violet-400'}`} />
        <span className={`font-mono text-xs font-bold ${table.isView ? 'text-amber-200' : 'text-violet-200'}`}>
          {table.name}
        </span>
        {table.isView && (
          <span className="text-[9px] font-mono text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded ml-auto">VIEW</span>
        )}
      </div>
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
    </div>
  );
}

const nodeTypes = { table: TableNode };

interface SchemaGraphProps {
  tables: TableSchema[];
}

export function SchemaGraph({ tables }: SchemaGraphProps) {
  const { nodes, edges } = useMemo(() => buildGraph(tables), [tables]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      proOptions={{ hideAttribution: true }}
      className="bg-transparent"
    >
      <Background color="#ffffff" gap={20} size={1} style={{ opacity: 0.04 }} />
      <Controls showInteractive={false} className="!bg-[#0F1425] !border-white/10" />
    </ReactFlow>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc -b --noEmit`
Expected: no type errors in `SchemaGraph.tsx`. (If `NodeProps` generic typing differs in the installed React Flow version, fall back to `NodeProps` without the generic and read `(data as { table: TableSchema }).table`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/SchemaGraph.tsx
git commit -m "feat: add React Flow SchemaGraph with custom TableNode"
```

---

### Task 8: Integrate SchemaGraph into SchemaVisualizer + pass schema to SqlTerminal

Swap the flex-wrap card layout in `SchemaVisualizer` for `SchemaGraph`, reusing the existing `extractSchema` logic via the new `src/lib/schema.ts`. Then thread the live schema from `App.tsx` into `SqlTerminal` for autocomplete.

**Files:**
- Modify: `src/components/SchemaVisualizer.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Rewrite `SchemaVisualizer.tsx` to use shared extraction + SchemaGraph**

Replace the entire file with:
```tsx
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
```

- [ ] **Step 2: Add schema derivation in `App.tsx`**

In `src/App.tsx`, add the import near the other local imports (after the `useProgressStore` import line):
```tsx
import { extractSchema } from './lib/schema';
```

- [ ] **Step 3: Compute the schema for autocomplete**

In `App.tsx`, inside the `App` component after `const { isReady, db, ... } = useSqlEngine();`, add:
```tsx
  const editorSchema = React.useMemo(() => {
    const tables = extractSchema(db);
    const out: Record<string, string[]> = {};
    for (const t of tables) out[t.name] = t.columns.map((c) => c.name);
    return out;
  }, [db]);
```

- [ ] **Step 4: Pass `schema` to `<SqlTerminal>`**

In `App.tsx`, find the `<SqlTerminal ... />` usage and add the `schema` prop:
```tsx
            <SqlTerminal
              onExecute={executeQuery}
              onRawExecute={runRawQuery}
              error={error}
              hints={currentStep?.hints ?? null}
              schema={editorSchema}
            />
```

- [ ] **Step 5: Verify type-check**

Run: `npx tsc -b --noEmit`
Expected: no type errors anywhere.

- [ ] **Step 6: Commit**

```bash
git add src/components/SchemaVisualizer.tsx src/App.tsx
git commit -m "feat: render schema as React Flow graph and wire autocomplete schema"
```

---

### Task 9: Full verification (build, lint, tests, browser)

**Files:** none (verification only)

- [ ] **Step 1: Run the unit tests**

Run: `npm test`
Expected: all tests pass (buildSqlSchema: 3, schemaGraph: 5).

- [ ] **Step 2: Run the linter**

Run: `npm run lint`
Expected: no errors. Fix any unused-import or hooks warnings introduced (e.g. a leftover `React`/`motion`/`AnimatePresence` import).

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: `tsc -b` passes and `vite build` completes with no errors.

- [ ] **Step 4: Verify live in the browser preview**

Start the dev server and confirm, on a mission:
- Typing in the editor shows SQL syntax highlighting.
- Typing a table name then `.` (or invoking autocomplete) suggests real column names after at least one table exists.
- `⌘/Ctrl+Enter` submits the query.
- After `CREATE TABLE`, the Schema Map shows a draggable node; nodes can be dragged; relationships render as animated edges when a related column exists.
- Existing flows still work: Test Run, hints (Concept/Scaffold/Solution), "Copy to editor", error display, step advance.

- [ ] **Step 5: Final commit (if any lint fixes were needed)**

```bash
git add -A
git commit -m "chore: Phase 1 lint/build cleanup"
```

---

## Notes for the implementer

- **Do not modify** `src/hooks/useSqlEngine.ts`, the domain JSON files, or the validation pipeline. Phase 1 is UI-only.
- The `extractSchema` function in `src/lib/schema.ts` is the single source of schema truth — `SchemaVisualizer` and `App.tsx` both use it. Do not re-implement schema reading inline.
- If `@uiw/react-codemirror`'s `theme="dark"` looks too generic, leave it — visual theming is refined in Phase 3.
- Keep `SqlEditor` and `SchemaGraph` as thin adapters; all branching logic belongs in the unit-tested `src/lib/` modules.
