interface Rule {
  needles: string[];
  text: string;
}

// Ordered most-specific first; the first matching rule wins.
const RULES: Rule[] = [
  { needles: ['WINDOW', 'PARTITION'], text: 'Window functions compute a value across a set of rows related to the current row, without collapsing them. PARTITION BY splits rows into groups and ORDER BY defines the running order — perfect for running totals and rankings.' },
  { needles: ['JOIN'], text: 'JOINs combine rows from two tables by matching a related column. This is how relational databases keep data normalized yet let you reassemble it on demand.' },
  { needles: ['GROUP', 'AGGREGATE', 'COUNT', 'SUM', 'AVG'], text: 'Aggregate functions collapse many rows into a single summary value. GROUP BY produces one summary row per group, which is the backbone of reporting queries.' },
  { needles: ['DELETE'], text: 'DELETE removes rows that match a WHERE condition. Always scope it with WHERE — without one, every row in the table is removed.' },
  { needles: ['UPDATE'], text: 'UPDATE changes values in existing rows. The WHERE clause decides which rows are affected; omit it and every row is updated.' },
  { needles: ['ALTER'], text: 'ALTER TABLE evolves a schema in place — adding columns or constraints to a table that already holds data, without recreating it.' },
  { needles: ['INSERT'], text: 'INSERT adds new rows. You can supply multiple value tuples in one statement to load several rows efficiently.' },
  { needles: ['SELECT', 'FILTER', 'WHERE'], text: 'SELECT reads data. Choosing specific columns and filtering with WHERE returns just the slice you need instead of the whole table.' },
  { needles: ['CREATE'], text: 'CREATE TABLE defines a new entity with typed columns. Good types and a primary key are the foundation every later query depends on.' },
];

const FALLBACK =
  'You changed the database state and it now matches the target. Each step builds on the last to assemble a complete, working schema.';

/** Return a short plain-language explanation for a step's conceptFocus. */
export function explainConcept(conceptFocus: string): string {
  const c = conceptFocus.toUpperCase();
  for (const rule of RULES) {
    if (rule.needles.some((n) => c.includes(n))) return rule.text;
  }
  return FALLBACK;
}
