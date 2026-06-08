import { describe, it, expect } from 'vitest';
import { levelFromXp, computeReward, updateStreak } from './gameLogic';

describe('levelFromXp', () => {
  it('level 1 at 0 XP', () => {
    const r = levelFromXp(0);
    expect(r.level).toBe(1);
    expect(r.xpIntoLevel).toBe(0);
    expect(r.xpForLevel).toBe(500);
    expect(r.progress).toBe(0);
  });

  it('still level 1 just under the threshold', () => {
    expect(levelFromXp(499).level).toBe(1);
  });

  it('level 2 at exactly 500 XP', () => {
    const r = levelFromXp(500);
    expect(r.level).toBe(2);
    expect(r.xpIntoLevel).toBe(0);
  });

  it('reports progress within a level', () => {
    const r = levelFromXp(750);
    expect(r.level).toBe(2);
    expect(r.xpIntoLevel).toBe(250);
    expect(r.progress).toBeCloseTo(0.5, 5);
  });
});

describe('computeReward', () => {
  it('no-hint solve gives base + no-hint bonus + combo bonus and increments combo', () => {
    expect(computeReward(false, 0)).toEqual({ xpGained: 160, newCombo: 1 });
    expect(computeReward(false, 2)).toEqual({ xpGained: 180, newCombo: 3 });
  });

  it('hinted solve gives only base XP and resets combo', () => {
    expect(computeReward(true, 5)).toEqual({ xpGained: 100, newCombo: 0 });
  });
});

describe('updateStreak', () => {
  it('starts a streak at 1 when there is no prior date', () => {
    expect(updateStreak({ count: 0, lastDate: null }, '2026-06-08')).toEqual({ count: 1, lastDate: '2026-06-08' });
  });

  it('does not change the count when solving again the same day', () => {
    expect(updateStreak({ count: 3, lastDate: '2026-06-08' }, '2026-06-08')).toEqual({ count: 3, lastDate: '2026-06-08' });
  });

  it('increments when the last active day was yesterday', () => {
    expect(updateStreak({ count: 3, lastDate: '2026-06-07' }, '2026-06-08')).toEqual({ count: 4, lastDate: '2026-06-08' });
  });

  it('resets to 1 when a day was missed', () => {
    expect(updateStreak({ count: 9, lastDate: '2026-06-05' }, '2026-06-08')).toEqual({ count: 1, lastDate: '2026-06-08' });
  });
});
