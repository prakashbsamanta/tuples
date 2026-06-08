export const LEVEL_XP = 500;
export const BASE_SOLVE_XP = 100;
export const NO_HINT_BONUS = 50;
export const COMBO_STEP_XP = 10;

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  xpForLevel: number;
  progress: number; // 0..1 within the current level
}

/** Derive level and in-level progress from total XP (500 XP per level). */
export function levelFromXp(xp: number): LevelInfo {
  const level = Math.floor(xp / LEVEL_XP) + 1;
  const xpIntoLevel = xp - (level - 1) * LEVEL_XP;
  return {
    level,
    xpIntoLevel,
    xpForLevel: LEVEL_XP,
    progress: xpIntoLevel / LEVEL_XP,
  };
}

/**
 * Compute XP and the new combo for a solved step.
 * No-hint solves earn a bonus and grow the combo; hinted solves earn base XP and reset combo.
 */
export function computeReward(usedHint: boolean, prevCombo: number): { xpGained: number; newCombo: number } {
  if (usedHint) {
    return { xpGained: BASE_SOLVE_XP, newCombo: 0 };
  }
  const newCombo = prevCombo + 1;
  return { xpGained: BASE_SOLVE_XP + NO_HINT_BONUS + newCombo * COMBO_STEP_XP, newCombo };
}

export interface StreakState {
  count: number;
  lastDate: string | null; // 'YYYY-MM-DD'
}

/** Days difference between two 'YYYY-MM-DD' strings (b - a) in whole UTC days. */
function dayDiff(a: string, b: string): number {
  const da = Date.parse(a + 'T00:00:00Z');
  const db = Date.parse(b + 'T00:00:00Z');
  return Math.round((db - da) / 86400000);
}

/** Advance a daily streak given today's date. Same day = no change; +1 day = increment; gap = reset to 1. */
export function updateStreak(prev: StreakState, today: string): StreakState {
  if (!prev.lastDate) return { count: 1, lastDate: today };
  const diff = dayDiff(prev.lastDate, today);
  if (diff === 0) return { count: prev.count, lastDate: prev.lastDate };
  if (diff === 1) return { count: prev.count + 1, lastDate: today };
  return { count: 1, lastDate: today };
}
