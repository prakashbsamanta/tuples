export interface GameSnapshot {
  level: number;
  totalSolved: number;
  noHintSolves: number;
  bestCombo: number;
  streakCount: number;
  solvedConcepts: string[];
}

export interface Achievement {
  id: string;
  label: string;
  description: string;
  icon: string; // lucide icon name, resolved in the UI
  test: (s: GameSnapshot) => boolean;
}

const hasConcept = (s: GameSnapshot, ...needles: string[]) =>
  s.solvedConcepts.some((c) => needles.some((n) => c.toUpperCase().includes(n)));

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_solve', label: 'First Steps', description: 'Solve your first step.', icon: 'Sparkles', test: (s) => s.totalSolved >= 1 },
  { id: 'solver_10', label: 'Getting Serious', description: 'Solve 10 steps.', icon: 'CheckCircle2', test: (s) => s.totalSolved >= 10 },
  { id: 'solver_25', label: 'Quarter Master', description: 'Solve 25 steps.', icon: 'Medal', test: (s) => s.totalSolved >= 25 },
  { id: 'no_hint_5', label: 'Self-Reliant', description: 'Solve 5 steps with no hints.', icon: 'Brain', test: (s) => s.noHintSolves >= 5 },
  { id: 'no_hint_15', label: 'No-Hint Hero', description: 'Solve 15 steps with no hints.', icon: 'ShieldCheck', test: (s) => s.noHintSolves >= 15 },
  { id: 'combo_5', label: 'On Fire', description: 'Reach a 5x no-hint combo.', icon: 'Flame', test: (s) => s.bestCombo >= 5 },
  { id: 'combo_10', label: 'Unstoppable', description: 'Reach a 10x no-hint combo.', icon: 'Zap', test: (s) => s.bestCombo >= 10 },
  { id: 'streak_3', label: 'Consistent', description: 'Keep a 3-day streak.', icon: 'CalendarCheck', test: (s) => s.streakCount >= 3 },
  { id: 'level_5', label: 'Rising Star', description: 'Reach level 5.', icon: 'Star', test: (s) => s.level >= 5 },
  { id: 'first_join', label: 'Joinery', description: 'Solve a JOIN step.', icon: 'GitMerge', test: (s) => hasConcept(s, 'JOIN') },
  { id: 'window_wizard', label: 'Window Wizard', description: 'Solve a window-function step.', icon: 'LayoutDashboard', test: (s) => hasConcept(s, 'WINDOW', 'PARTITION') },
];

/** Return the ids of achievements newly satisfied by the snapshot (excluding already-unlocked ones). */
export function checkAchievements(snapshot: GameSnapshot, alreadyUnlocked: string[]): string[] {
  const have = new Set(alreadyUnlocked);
  return ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.test(snapshot)).map((a) => a.id);
}
