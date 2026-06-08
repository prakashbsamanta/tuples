import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, checkAchievements, type GameSnapshot } from './achievements';

const base: GameSnapshot = {
  level: 1,
  totalSolved: 0,
  noHintSolves: 0,
  bestCombo: 0,
  streakCount: 0,
  solvedConcepts: [],
};

describe('checkAchievements', () => {
  it('unlocks "first_solve" after the first solve', () => {
    const newly = checkAchievements({ ...base, totalSolved: 1 }, []);
    expect(newly).toContain('first_solve');
  });

  it('does not re-report an already unlocked achievement', () => {
    const newly = checkAchievements({ ...base, totalSolved: 1 }, ['first_solve']);
    expect(newly).not.toContain('first_solve');
  });

  it('unlocks "first_join" when a JOIN concept has been solved', () => {
    const newly = checkAchievements({ ...base, solvedConcepts: ['SELECT_INNER_JOIN'] }, []);
    expect(newly).toContain('first_join');
  });

  it('unlocks "window_wizard" for a PARTITION concept', () => {
    const newly = checkAchievements({ ...base, solvedConcepts: ['WINDOW_PARTITION_BY'] }, []);
    expect(newly).toContain('window_wizard');
  });

  it('unlocks combo and streak milestones', () => {
    const newly = checkAchievements({ ...base, bestCombo: 5, streakCount: 3 }, []);
    expect(newly).toContain('combo_5');
    expect(newly).toContain('streak_3');
  });

  it('every achievement has id, label, description', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.id).toBeTruthy();
      expect(a.label).toBeTruthy();
      expect(a.description).toBeTruthy();
    }
  });
});
