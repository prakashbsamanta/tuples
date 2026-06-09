// Pure detector: given query result rows, decide whether they can be charted
// and how. No React / no Recharts here so it stays unit-testable.

export type ChartType = 'bar' | 'line';

export interface ChartSpec {
  type: ChartType;
  labelKey: string;      // categorical / time axis
  valueKeys: string[];   // one or more numeric series
  data: Record<string, number | string>[];
}

const MAX_POINTS = 50;
const MAX_SERIES = 4;

function isNumeric(v: unknown): boolean {
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string' && v.trim() !== '') return Number.isFinite(Number(v));
  return false;
}

// Heuristic: does this column look like a date / time / year?
function looksTemporal(key: string, sample: unknown): boolean {
  if (/(date|time|day|month|year|ts|timestamp)/i.test(key)) return true;
  if (typeof sample === 'string' && /^\d{4}(-\d{2}){0,2}/.test(sample)) return true;
  return false;
}

/**
 * Returns a ChartSpec when the rows have a clear "label + numeric value(s)"
 * shape worth visualising, otherwise null.
 */
export function detectChart(results: Record<string, unknown>[] | null | undefined): ChartSpec | null {
  if (!results || results.length < 2) return null;
  const columns = Object.keys(results[0] ?? {});
  if (columns.length < 2) return null;

  // Classify each column as numeric (every non-null value numeric) or not.
  const numericCols: string[] = [];
  const nonNumericCols: string[] = [];
  for (const col of columns) {
    const vals = results.map((r) => r[col]).filter((v) => v !== null && v !== undefined);
    if (vals.length === 0) { nonNumericCols.push(col); continue; }
    if (vals.every(isNumeric)) numericCols.push(col);
    else nonNumericCols.push(col);
  }

  if (numericCols.length === 0) return null;

  // Pick the label axis: prefer the first non-numeric column; if every column
  // is numeric, use the first numeric column as the axis and the rest as series.
  let labelKey: string;
  let valueKeys: string[];
  if (nonNumericCols.length > 0) {
    labelKey = nonNumericCols[0];
    valueKeys = numericCols;
  } else {
    labelKey = numericCols[0];
    valueKeys = numericCols.slice(1);
  }
  if (valueKeys.length === 0) return null;
  valueKeys = valueKeys.slice(0, MAX_SERIES);

  // Labels must be reasonably distinct to be worth a category axis.
  const labels = results.map((r) => String(r[labelKey] ?? ''));
  const distinct = new Set(labels).size;
  if (distinct < 2) return null;

  const sample = results[0][labelKey];
  const type: ChartType = looksTemporal(labelKey, sample) ? 'line' : 'bar';

  const data = results.slice(0, MAX_POINTS).map((r) => {
    const row: Record<string, number | string> = { [labelKey]: String(r[labelKey] ?? '') };
    for (const k of valueKeys) row[k] = Number(r[k]);
    return row;
  });

  return { type, labelKey, valueKeys, data };
}
