import { describe, it, expect } from 'vitest';
import { resultsMatch, scalarEqual, type ResultTable } from './validate';

const t = (columns: string[], rows: unknown[][]): ResultTable => ({ columns, rows });

describe('scalarEqual', () => {
  it('matches numerically with tolerance', () => {
    expect(scalarEqual(2, '2.0')).toBe(true);
    expect(scalarEqual(2.0004, 2.0006)).toBe(true);
    expect(scalarEqual(2, 2.1)).toBe(false);
  });
  it('is null-safe', () => {
    expect(scalarEqual(null, undefined)).toBe(true);
    expect(scalarEqual(null, 0)).toBe(false);
    expect(scalarEqual(null, '')).toBe(false);
  });
});

describe('resultsMatch', () => {
  it('ignores column aliases but not column count', () => {
    expect(resultsMatch(t(['a'], [[1]]), t(['total'], [[1]])).match).toBe(true);
    expect(resultsMatch(t(['a', 'b'], [[1, 2]]), t(['a'], [[1]])).match).toBe(false);
  });

  it('is order-insensitive by default (multiset)', () => {
    const a = t(['x'], [[1], [2], [2]]);
    const b = t(['x'], [[2], [1], [2]]);
    expect(resultsMatch(a, b).match).toBe(true);
    // multiset: counts matter
    expect(resultsMatch(t(['x'], [[1], [2], [2]]), t(['x'], [[1], [1], [2]])).match).toBe(false);
  });

  it('enforces order when requested', () => {
    const a = t(['x'], [[1], [2]]);
    const b = t(['x'], [[2], [1]]);
    expect(resultsMatch(a, b, true).match).toBe(false);
    expect(resultsMatch(a, a, true).match).toBe(true);
  });

  it('normalizes numeric strings in unordered comparison', () => {
    expect(resultsMatch(t(['x'], [['2.0'], [3]]), t(['x'], [[2], ['3']])).match).toBe(true);
  });

  it('handles empty and null results', () => {
    expect(resultsMatch(null, t([], [])).match).toBe(true);
    expect(resultsMatch(null, t(['x'], [[1]])).match).toBe(false);
  });

  it('distinguishes null from 0 and empty string in rows', () => {
    expect(resultsMatch(t(['x'], [[null]]), t(['x'], [[0]])).match).toBe(false);
    expect(resultsMatch(t(['x'], [[null]]), t(['x'], [['']])).match).toBe(false);
    expect(resultsMatch(t(['x'], [[null]]), t(['x'], [[null]])).match).toBe(true);
  });
});
