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
