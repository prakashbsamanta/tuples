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
