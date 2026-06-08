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

  // Map identifier-column name -> owning table, to infer relationships.
  // Two passes so a declared PRIMARY KEY always wins over the first-column fallback:
  //   1. PRIMARY KEY columns (authoritative).
  //   2. For tables with NO primary key, treat the first column as the implied
  //      identifier (the curriculum declares no PKs, e.g. `assets(symbol, ...)`),
  //      but never override a name already owned by a real PK.
  const keyOwner = new Map<string, string>();
  for (const table of tables) {
    for (const col of table.columns) {
      if (col.pk && !keyOwner.has(col.name)) keyOwner.set(col.name, table.name);
    }
  }
  for (const table of tables) {
    if (table.columns.some((c) => c.pk)) continue; // already has an authoritative key
    const first = table.columns[0];
    if (first && !keyOwner.has(first.name)) keyOwner.set(first.name, table.name);
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
    // Inferred: a column matching another table's identifier column name
    for (const col of table.columns) {
      const owner = keyOwner.get(col.name);
      if (owner && owner !== table.name) {
        addEdge(table.name, owner, col.name);
      }
    }
  }

  return { nodes, edges };
}
