import { describe, it, expect } from 'vitest';
import { detectChart } from './chartShape';

describe('detectChart', () => {
  it('returns null for empty / single-row data', () => {
    expect(detectChart(null)).toBeNull();
    expect(detectChart([])).toBeNull();
    expect(detectChart([{ a: 1, b: 2 }])).toBeNull();
  });

  it('returns null when there is no numeric column', () => {
    expect(detectChart([{ name: 'a', city: 'x' }, { name: 'b', city: 'y' }])).toBeNull();
  });

  it('builds a bar chart from category + numeric value', () => {
    const spec = detectChart([
      { drug: 'A', trials: 10 },
      { drug: 'B', trials: 25 },
      { drug: 'C', trials: 7 },
    ]);
    expect(spec).not.toBeNull();
    expect(spec!.type).toBe('bar');
    expect(spec!.labelKey).toBe('drug');
    expect(spec!.valueKeys).toEqual(['trials']);
    expect(spec!.data).toHaveLength(3);
    expect(spec!.data[1]).toEqual({ drug: 'B', trials: 25 });
  });

  it('uses a line chart when the label column is temporal', () => {
    const spec = detectChart([
      { month: '2024-01', revenue: 100 },
      { month: '2024-02', revenue: 140 },
      { month: '2024-03', revenue: 90 },
    ]);
    expect(spec!.type).toBe('line');
    expect(spec!.labelKey).toBe('month');
  });

  it('supports multiple numeric series', () => {
    const spec = detectChart([
      { sector: 'tech', gain: 5, loss: 2 },
      { sector: 'energy', gain: 3, loss: 4 },
    ]);
    expect(spec!.valueKeys).toEqual(['gain', 'loss']);
  });

  it('coerces numeric strings', () => {
    const spec = detectChart([
      { label: 'x', n: '10' },
      { label: 'y', n: '20' },
    ]);
    expect(spec!.data[0].n).toBe(10);
  });

  it('returns null when labels are all identical', () => {
    expect(detectChart([
      { k: 'same', v: 1 },
      { k: 'same', v: 2 },
    ])).toBeNull();
  });

  it('falls back to first numeric col as axis when all columns numeric', () => {
    const spec = detectChart([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]);
    expect(spec!.labelKey).toBe('x');
    expect(spec!.valueKeys).toEqual(['y']);
  });
});
