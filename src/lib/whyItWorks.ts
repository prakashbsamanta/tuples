interface Rule {
  needles: string[];
  text: string;
}

// Ordered most-specific first; the first matching rule wins.
const RULES: Rule[] = [
  { needles: ['RECURSIVE'], text: 'A recursive CTE starts from an anchor row and repeatedly applies a rule that builds new rows from the rows so far. With UNION deduplicating, even cyclic graphs terminate — it is SQL’s tool for hierarchies, reachability, and paths.' },
  { needles: ['TRANSACTION', 'ROLLBACK', 'ATOMIC'], text: 'A transaction makes several statements succeed or fail as one unit. Until COMMIT, nothing is permanent; ROLLBACK undoes everything since BEGIN — that atomicity is what keeps related rows consistent.' },
  { needles: ['UPSERT', 'CONFLICT'], text: 'INSERT ... ON CONFLICT turns "insert or update" into one atomic statement. The database checks the uniqueness constraint and routes to the DO UPDATE branch only when a duplicate exists — no race-prone SELECT-then-INSERT.' },
  { needles: ['RETURNING'], text: 'RETURNING makes a write statement also report the rows it touched, in the same statement. No follow-up SELECT, no window for another writer to change the data in between.' },
  { needles: ['TRIGGER'], text: 'A trigger is logic the database runs automatically when rows change. It cannot be forgotten or bypassed by an application bug — ideal for audit trails, guards, and keeping cached values in sync.' },
  { needles: ['SARGABLE'], text: 'An index stores raw column values, so a predicate on function(column) can’t use it. Rewriting the filter as a plain range on the bare column ("sargable") lets the planner SEARCH the index instead of scanning every row.' },
  { needles: ['COVERING'], text: 'When an index contains every column a query reads, the database answers the query entirely from the index and never opens the table — a covering index turns lookups plus reads into one sequential structure.' },
  { needles: ['EXPLAIN', 'PLAN'], text: 'EXPLAIN QUERY PLAN shows how the database will execute a query. SCAN means reading every row; SEARCH means jumping straight to matches via an index — reading plans is how you find and fix slow queries.' },
  { needles: ['INDEX'], text: 'An index is a sorted auxiliary structure that lets the database binary-search to matching rows instead of scanning the whole table. Reads get dramatically faster; writes pay a small maintenance cost.' },
  { needles: ['NULL', 'COALESCE'], text: 'NULL is "unknown", not a value — comparisons with it return unknown, never true. That is why x = NULL matches nothing, one NULL poisons NOT IN, and COALESCE exists to substitute a fallback.' },
  { needles: ['NTILE', 'QUARTILE'], text: 'NTILE(n) splits the ordered partition into n near-equal buckets and labels each row with its bucket number — the standard way to compute quartiles, deciles, and percentile bands.' },
  { needles: ['LAG', 'LEAD'], text: 'LAG and LEAD reach backwards or forwards within the window’s order to read another row’s value without a self-join — the foundation of change-over-time and next-event queries.' },
  { needles: ['FRAME', 'MOVING', 'RUNNING'], text: 'A window frame (e.g. ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) defines exactly which neighboring rows feed the function. Frames are how running totals and moving averages slide across ordered data.' },
  { needles: ['RANK', 'TOP_N'], text: 'Ranking window functions number rows within each partition by the ORDER BY. RANK leaves gaps after ties, DENSE_RANK does not, ROW_NUMBER never ties — pick by how you want ties treated, then filter on the rank for top-N-per-group.' },
  { needles: ['WINDOW', 'PARTITION', 'PCT_OF', 'DRAWDOWN', 'VWAP', 'ISLANDS'], text: 'Window functions compute a value across a set of rows related to the current row, without collapsing them. PARTITION BY splits rows into groups and ORDER BY defines the running order — aggregation and detail in one result.' },
  { needles: ['EXCEPT'], text: 'EXCEPT is set subtraction: rows in the first result that do not appear in the second. It answers "what is in A but missing from B" without joins or NULL traps.' },
  { needles: ['INTERSECT'], text: 'INTERSECT keeps only rows present in both results, deduplicated — the set-algebra way to express "in both lists".' },
  { needles: ['UNION'], text: 'UNION stacks two results and removes duplicates; UNION ALL keeps every row. When you are counting occurrences, that difference is the whole answer.' },
  { needles: ['EXISTS', 'ANTI_JOIN'], text: 'EXISTS asks "is there at least one matching row?" and stops at the first hit. NOT EXISTS is its NULL-safe negation — the reliable way to express "has none", where NOT IN can silently fail.' },
  { needles: ['JSON'], text: 'SQLite’s JSON1 functions build and unpack JSON inside SQL. json_each turns an array into rows you can join and filter — relational tools applied to semi-structured data.' },
  { needles: ['CTE', 'VIEW'], text: 'CTEs and views give a query a name. A CTE (WITH ...) structures one statement into readable steps; a view stores the query in the schema so every consumer reads through the same definition.' },
  { needles: ['GENERATED'], text: 'A generated column is computed from other columns by the database itself — the derived value can never drift out of sync with its inputs.' },
  { needles: ['CHECK', 'UNIQUE', 'FOREIGN', 'NOT_NULL', 'GUARD'], text: 'Constraints make the database enforce the rules: CHECK validates values, UNIQUE forbids duplicates, FOREIGN KEY guarantees references point at real rows. Bad data is rejected at the door instead of cleaned up later.' },
  { needles: ['DEDUPE', 'DISTINCT'], text: 'Deduplication keys on what makes a row "the same": group or window over the identity columns, keep one representative per group, and remove or ignore the rest.' },
  { needles: ['CASE', 'PIVOT', 'MATRIX', 'CONDITIONAL'], text: 'SUM(CASE WHEN condition THEN 1 ELSE 0 END) counts matching rows per group. Several of them side by side pivot categories into columns — a report-shaped result from row-shaped data.' },
  { needles: ['STRFTIME', 'DATE', 'MONTHLY'], text: 'Storing timestamps as ISO-8601 text means lexicographic order is chronological order. strftime and substr extract the year, month, or day to group time-series data into buckets.' },
  { needles: ['CAST', 'ROUND'], text: 'Integer division truncates — CAST one operand to REAL to keep the fraction, then ROUND for presentation. Knowing where precision is lost is half of numeric SQL.' },
  { needles: ['CAPSTONE'], text: 'No scaffolding here — you composed joins, aggregation, subqueries, and filtering into one production-grade query, and it also passed on a hidden dataset, so it solves the problem in general.' },
  { needles: ['TRIM', 'OUTLIER', 'SCRUB', 'CLEAN'], text: 'Real data arrives dirty. Cleaning in SQL means describing the bad pattern precisely in a WHERE clause, then fixing it with one set-based UPDATE or DELETE — auditable and repeatable.' },
  { needles: ['SUBQUERY', 'SCALAR'], text: 'A subquery nests one question inside another. A scalar subquery returns a single value usable anywhere an expression goes; a correlated one re-runs per outer row, referencing its columns.' },
  { needles: ['JOIN'], text: 'JOINs combine rows from two tables by matching a related column. INNER keeps only matches, LEFT keeps everything on one side, FULL OUTER keeps both — this is how normalized data is reassembled on demand.' },
  { needles: ['GROUP', 'AGGREGATE', 'COUNT', 'SUM', 'AVG', 'HAVING'], text: 'Aggregate functions collapse many rows into a single summary value. GROUP BY produces one summary row per group, and HAVING filters those groups after aggregation — the backbone of reporting queries.' },
  { needles: ['DELETE'], text: 'DELETE removes rows that match a WHERE condition. Always scope it with WHERE — without one, every row in the table is removed.' },
  { needles: ['UPDATE'], text: 'UPDATE changes values in existing rows. The WHERE clause decides which rows are affected; omit it and every row is updated.' },
  { needles: ['ALTER'], text: 'ALTER TABLE evolves a schema in place — adding columns or constraints to a table that already holds data, without recreating it.' },
  { needles: ['INSERT'], text: 'INSERT adds new rows. You can supply multiple value tuples in one statement to load several rows efficiently.' },
  { needles: ['SELECT', 'FILTER', 'WHERE', 'LIMIT', 'BETWEEN', 'LIKE', 'ORDER', 'TOP'], text: 'SELECT reads data: choose columns, filter with WHERE, sort with ORDER BY, truncate with LIMIT. Returning just the slice you need is the core skill everything else builds on.' },
  { needles: ['CREATE'], text: 'CREATE TABLE defines a new entity with typed columns. Good types and a primary key are the foundation every later query depends on.' },
];

const FALLBACK =
  'Your result matches the canonical answer — and it also held up on a hidden dataset with different values, so your query solves the problem in general, not just for these rows.';

/** Return a short plain-language explanation for a step's conceptFocus. */
export function explainConcept(conceptFocus: string): string {
  const c = conceptFocus.toUpperCase();
  for (const rule of RULES) {
    if (rule.needles.some((n) => c.includes(n))) return rule.text;
  }
  return FALLBACK;
}
