// Turns a raw SQLite / verification error into a short, targeted nudge.
// Pure + dependency-free so it can be unit-tested and reused anywhere.

export function coachError(error: string | null | undefined, query?: string): string | null {
  if (!error) return null;
  const e = error.toLowerCase();
  const q = (query ?? '').toLowerCase();

  // Verification mismatch (query ran, result didn't match expected).
  if (e.includes('verification failed') || (e.includes('expected') && e.includes('got'))) {
    if (!/\border\s+by\b/.test(q) && /\btop\b|\bfirst\b|\bhighest\b|\blowest\b|\blatest\b/.test(q))
      return 'Your query runs, but the rows differ. Ranking-style asks usually need an ORDER BY (and maybe LIMIT).';
    return 'Your query runs, but the output doesn’t match. Re-read the briefing — check the exact columns, filters, and sort order being asked for.';
  }

  // Missing table.
  if (e.includes('no such table')) {
    const m = error.match(/no such table:\s*(\S+)/i);
    const name = m ? `"${m[1]}"` : 'that table';
    return `${name} doesn’t exist. Check the spelling against the Schema Map on the right — table names are case-sensitive.`;
  }

  // Missing column.
  if (e.includes('no such column')) {
    const m = error.match(/no such column:\s*(\S+)/i);
    const name = m ? `"${m[1]}"` : 'that column';
    return `${name} isn’t a known column. Open the Schema Map to confirm the column name and which table it lives on.`;
  }

  // Ambiguous column across joined tables.
  if (e.includes('ambiguous column')) {
    return 'That column exists in more than one joined table — qualify it with the table name or alias (e.g. orders.id).';
  }

  // Generic syntax error — try to point at a likely cause.
  if (e.includes('syntax error')) {
    if (/\bselect\b/.test(q) && !/\bfrom\b/.test(q))
      return 'Syntax error: a SELECT needs a FROM clause naming the table to read from.';
    if (/\bgroup\s+by\b/.test(q) && !/\bselect\b/.test(q))
      return 'Syntax error near GROUP BY — make sure the SELECT list and grouping line up.';
    return 'Syntax error. Check for a missing comma between columns, an unclosed quote/paren, or a misspelled keyword.';
  }

  // Aggregate misuse.
  if (e.includes('misuse of aggregate') || e.includes('aggregate'))
    return 'Aggregates (COUNT, SUM, AVG…) can’t sit in a WHERE clause — use HAVING to filter on an aggregate, or GROUP BY first.';

  // Datatype / constraint.
  if (e.includes('datatype mismatch') || e.includes('constraint'))
    return 'A value conflicts with the column’s type or a constraint. Check you’re inserting the right types in the right columns.';

  return null;
}
