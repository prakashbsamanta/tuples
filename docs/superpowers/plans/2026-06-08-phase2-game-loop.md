# Phase 2 — Game Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the structured tutorial into a game by adding XP/levels, a daily streak, a no-hint combo multiplier, unlockable achievements, and a "Why it works" teaching card — all client-side and persisted to localStorage.

**Architecture:** All reward/streak/achievement/explanation math lives in pure, unit-tested modules in `src/lib/`. The Zustand store gains a global game-state slice plus actions (`revealHint`, `recordSolve`, `clearLastSolve`) that call those pure functions. The SQL engine calls `recordSolve` on a successful step; the editor calls `revealHint` when a hint is shown. UI is additive: a `GameStatus` strip in the header, an `AchievementToast`, and an enhanced `SuccessToast` carrying XP + the teaching card.

**Tech Stack:** React 18, TypeScript, Zustand (+persist), Framer Motion, Lucide React, Vitest.

**Testing policy for this phase:** Full TDD on the pure logic (Tasks 1–2). Store + UI tasks (3–6) get type-check + build + lint, and the phase ends with a **sanity** browser check (Task 7) — not full regression.

---

### Task 1: Core game math (pure, TDD)

XP→level curve, per-solve reward (XP + combo), and daily-streak progression.

**Files:**
- Create: `src/lib/gameLogic.ts`
- Test: `src/lib/gameLogic.test.ts`

- [ ] **Step 1: Write the failing test (`src/lib/gameLogic.test.ts`)**

```typescript
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
    // prevCombo 0 -> newCombo 1 -> 100 + 50 + 1*10 = 160
    expect(computeReward(false, 0)).toEqual({ xpGained: 160, newCombo: 1 });
    // prevCombo 2 -> newCombo 3 -> 100 + 50 + 3*10 = 180
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/gameLogic.test.ts`
Expected: FAIL — cannot find module `./gameLogic`.

- [ ] **Step 3: Write the implementation (`src/lib/gameLogic.ts`)**

```typescript
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/gameLogic.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/gameLogic.ts src/lib/gameLogic.test.ts
git commit -m "feat: add pure game logic (levels, combo reward, streak)"
```

---

### Task 2: Achievements registry + concept explanations (pure, TDD)

**Files:**
- Create: `src/lib/achievements.ts`
- Test: `src/lib/achievements.test.ts`
- Create: `src/lib/whyItWorks.ts`
- Test: `src/lib/whyItWorks.test.ts`

- [ ] **Step 1: Write the failing test (`src/lib/achievements.test.ts`)**

```typescript
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/achievements.test.ts`
Expected: FAIL — cannot find module `./achievements`.

- [ ] **Step 3: Write `src/lib/achievements.ts`**

```typescript
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
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/lib/achievements.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing test (`src/lib/whyItWorks.test.ts`)**

```typescript
import { describe, it, expect } from 'vitest';
import { explainConcept } from './whyItWorks';

describe('explainConcept', () => {
  it('explains CREATE_TABLE', () => {
    expect(explainConcept('CREATE_TABLE').toLowerCase()).toContain('table');
  });

  it('explains window/partition concepts', () => {
    expect(explainConcept('WINDOW_PARTITION_BY').toLowerCase()).toContain('window');
  });

  it('explains a delete concept', () => {
    expect(explainConcept('DESTRUCTIVE_DELETE_WHERE').toLowerCase()).toContain('delete');
  });

  it('returns a non-empty fallback for unknown concepts', () => {
    expect(explainConcept('SOMETHING_NEW_2099').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run src/lib/whyItWorks.test.ts`
Expected: FAIL — cannot find module `./whyItWorks`.

- [ ] **Step 7: Write `src/lib/whyItWorks.ts`**

```typescript
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
```

- [ ] **Step 8: Run it to verify it passes**

Run: `npx vitest run src/lib/whyItWorks.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/achievements.ts src/lib/achievements.test.ts src/lib/whyItWorks.ts src/lib/whyItWorks.test.ts
git commit -m "feat: add achievements registry and concept explanations with tests"
```

---

### Task 3: Extend the Zustand store with game state

Add a global game slice + actions to `src/store/useProgressStore.ts`. New fields are top-level so existing persisted progress keeps working (shallow merge fills defaults). Transient fields (`lastSolve`, `hintUsedThisStep`) are excluded from persistence via `partialize`.

**Files:**
- Modify (full replace): `src/store/useProgressStore.ts`

- [ ] **Step 1: Replace the entire file with:**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { computeReward, updateStreak, levelFromXp } from '../lib/gameLogic';
import { checkAchievements, type GameSnapshot } from '../lib/achievements';

export interface DomainProgress {
  currentStepIndex: number;
  historicalQueries: Record<number, string>;
}

export interface LastSolve {
  xpGained: number;
  combo: number;
  usedHint: boolean;
  conceptFocus: string;
  newAchievements: string[];
}

export interface ProgressState {
  // ── Existing per-domain progress ──
  activeDomainId: string | null;
  progressByDomain: Record<string, DomainProgress>;

  // ── Global game state ──
  xp: number;
  combo: number;
  bestCombo: number;
  totalSolved: number;
  noHintSolves: number;
  solvedConcepts: string[];
  streakCount: number;
  streakLastDate: string | null;
  unlockedAchievements: string[];
  hintUsedThisStep: boolean;
  lastSolve: LastSolve | null;

  // ── Actions ──
  setActiveDomain: (domainId: string | null) => void;
  unlockNextStep: () => void;
  saveQueryForStep: (stepIndex: number, query: string) => void;
  resetDomain: (domainId: string) => void;
  resetAll: () => void;
  revealHint: () => void;
  recordSolve: (meta: { conceptFocus: string }) => void;
  clearLastSolve: () => void;
}

const todayStr = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const GAME_DEFAULTS = {
  xp: 0,
  combo: 0,
  bestCombo: 0,
  totalSolved: 0,
  noHintSolves: 0,
  solvedConcepts: [] as string[],
  streakCount: 0,
  streakLastDate: null as string | null,
  unlockedAchievements: [] as string[],
  hintUsedThisStep: false,
  lastSolve: null as LastSolve | null,
};

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      activeDomainId: null,
      progressByDomain: {},
      ...GAME_DEFAULTS,

      setActiveDomain: (domainId) =>
        set((state) => {
          if (!domainId) return { activeDomainId: null, hintUsedThisStep: false };
          const existing = state.progressByDomain[domainId];
          if (!existing) {
            return {
              activeDomainId: domainId,
              hintUsedThisStep: false,
              progressByDomain: {
                ...state.progressByDomain,
                [domainId]: { currentStepIndex: 0, historicalQueries: {} },
              },
            };
          }
          return { activeDomainId: domainId, hintUsedThisStep: false };
        }),

      unlockNextStep: () =>
        set((state) => {
          if (!state.activeDomainId) return {};
          const current = state.progressByDomain[state.activeDomainId];
          return {
            hintUsedThisStep: false,
            progressByDomain: {
              ...state.progressByDomain,
              [state.activeDomainId]: {
                ...current,
                currentStepIndex: current.currentStepIndex + 1,
              },
            },
          };
        }),

      saveQueryForStep: (stepIndex, query) =>
        set((state) => {
          if (!state.activeDomainId) return {};
          const current = state.progressByDomain[state.activeDomainId];
          return {
            progressByDomain: {
              ...state.progressByDomain,
              [state.activeDomainId]: {
                ...current,
                historicalQueries: { ...current.historicalQueries, [stepIndex]: query },
              },
            },
          };
        }),

      resetDomain: (domainId) =>
        set((state) => ({
          progressByDomain: {
            ...state.progressByDomain,
            [domainId]: { currentStepIndex: 0, historicalQueries: {} },
          },
        })),

      resetAll: () =>
        set(() => ({ progressByDomain: {}, ...GAME_DEFAULTS })),

      revealHint: () => set({ hintUsedThisStep: true }),

      recordSolve: ({ conceptFocus }) =>
        set((state) => {
          const usedHint = state.hintUsedThisStep;
          const { xpGained, newCombo } = computeReward(usedHint, state.combo);
          const xp = state.xp + xpGained;
          const bestCombo = Math.max(state.bestCombo, newCombo);
          const totalSolved = state.totalSolved + 1;
          const noHintSolves = state.noHintSolves + (usedHint ? 0 : 1);
          const solvedConcepts = state.solvedConcepts.includes(conceptFocus)
            ? state.solvedConcepts
            : [...state.solvedConcepts, conceptFocus];
          const streak = updateStreak({ count: state.streakCount, lastDate: state.streakLastDate }, todayStr());

          const snapshot: GameSnapshot = {
            level: levelFromXp(xp).level,
            totalSolved,
            noHintSolves,
            bestCombo,
            streakCount: streak.count,
            solvedConcepts,
          };
          const newAchievements = checkAchievements(snapshot, state.unlockedAchievements);

          return {
            xp,
            combo: newCombo,
            bestCombo,
            totalSolved,
            noHintSolves,
            solvedConcepts,
            streakCount: streak.count,
            streakLastDate: streak.lastDate,
            unlockedAchievements: [...state.unlockedAchievements, ...newAchievements],
            hintUsedThisStep: false,
            lastSolve: { xpGained, combo: newCombo, usedHint, conceptFocus, newAchievements },
          };
        }),

      clearLastSolve: () => set({ lastSolve: null }),
    }),
    {
      name: 'tuples_user_progress',
      partialize: (state) => ({
        activeDomainId: state.activeDomainId,
        progressByDomain: state.progressByDomain,
        xp: state.xp,
        combo: state.combo,
        bestCombo: state.bestCombo,
        totalSolved: state.totalSolved,
        noHintSolves: state.noHintSolves,
        solvedConcepts: state.solvedConcepts,
        streakCount: state.streakCount,
        streakLastDate: state.streakLastDate,
        unlockedAchievements: state.unlockedAchievements,
      }),
    }
  )
);
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no type errors. (Consuming components are updated in later tasks; nothing else references the new actions yet, so this should be clean on its own.)

- [ ] **Step 3: Run the existing unit tests (nothing should break)**

Run: `npm test`
Expected: all prior tests still pass.

- [ ] **Step 4: Commit**

```bash
git add src/store/useProgressStore.ts
git commit -m "feat: add global game state (xp, combo, streak, achievements) to store"
```

---

### Task 4: Wire hint usage and solve recording

Hook the store actions into the existing flow: reveal a hint → `revealHint()`; a successful step → `recordSolve()`.

**Files:**
- Modify: `src/components/SqlTerminal.tsx`
- Modify: `src/hooks/useSqlEngine.ts`

- [ ] **Step 1: Add an `onRevealHint` prop to SqlTerminal**

In `src/components/SqlTerminal.tsx`, add to the `SqlTerminalProps` interface (after `schema`):
```tsx
  onRevealHint?: () => void;
```
Add it to the destructured params:
```tsx
export function SqlTerminal({ onExecute, onRawExecute, error, hints, schema, onRevealHint }: SqlTerminalProps) {
```

- [ ] **Step 2: Call it when a hint is revealed**

In `src/components/SqlTerminal.tsx`, find the hint button whose `onClick` increments the hint level:
```tsx
              onClick={() => setHintLevel(l => (l + 1) as 0 | 1 | 2 | 3)}
```
Replace it with:
```tsx
              onClick={() => { onRevealHint?.(); setHintLevel(l => (l + 1) as 0 | 1 | 2 | 3); }}
```

- [ ] **Step 3: Pass the action from App**

In `src/App.tsx`, on the `<SqlTerminal ... />` usage, add the prop:
```tsx
              onRevealHint={useProgressStore.getState().revealHint}
```
(Insert it alongside the other props, e.g. right after `schema={editorSchema}`.) `useProgressStore` is already imported in App.tsx, and `revealHint` is a stable action reference.

- [ ] **Step 4: Record the solve in the engine**

In `src/hooks/useSqlEngine.ts`, locate the success branch inside `executeQuery` (where `looseEqual(actual, expected)` is true). It currently runs:
```tsx
        store.saveQueryForStep(stepIdx, rawQuery);
        store.unlockNextStep();
        setState(s => ({ ...s, error: null, results: actual, isSuccess: true }));
```
Insert a `recordSolve` call between `saveQueryForStep` and `unlockNextStep`:
```tsx
        store.saveQueryForStep(stepIdx, rawQuery);
        store.recordSolve({ conceptFocus: stepConfig.conceptFocus });
        store.unlockNextStep();
        setState(s => ({ ...s, error: null, results: actual, isSuccess: true }));
```
(`stepConfig` is already in scope in that function, and `store` is `storeRef.current`, which exposes the new `recordSolve` action.)

- [ ] **Step 5: Type-check + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/SqlTerminal.tsx src/App.tsx src/hooks/useSqlEngine.ts
git commit -m "feat: record solves and hint usage into game state"
```

---

### Task 5: GameStatus header strip

A compact, self-contained component (subscribes to the store directly) showing level, an XP bar, the streak flame, and the live combo.

**Files:**
- Create: `src/components/GameStatus.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/components/GameStatus.tsx`**

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Zap } from 'lucide-react';
import { useProgressStore } from '../store/useProgressStore';
import { levelFromXp } from '../lib/gameLogic';

export function GameStatus() {
  const xp = useProgressStore((s) => s.xp);
  const combo = useProgressStore((s) => s.combo);
  const streakCount = useProgressStore((s) => s.streakCount);

  const { level, xpIntoLevel, xpForLevel, progress } = levelFromXp(xp);

  return (
    <div className="flex items-center gap-3">
      {/* Level + XP */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
          LV {level}
        </span>
        <div className="hidden sm:flex flex-col gap-1">
          <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
            />
          </div>
          <span className="text-[9px] font-mono text-gray-600 leading-none">{xpIntoLevel}/{xpForLevel} XP</span>
        </div>
      </div>

      {/* Streak */}
      {streakCount > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Flame size={12} className="text-amber-400" />
          <span className="text-[11px] font-mono font-bold text-amber-300">{streakCount}</span>
        </div>
      )}

      {/* Combo */}
      <AnimatePresence>
        {combo > 1 && (
          <motion.div
            key={combo}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 24 }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/15 border border-violet-500/25"
          >
            <Zap size={12} className="text-violet-300" />
            <span className="text-[11px] font-mono font-bold text-violet-200">{combo}x</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Render it in the App header**

In `src/App.tsx`, add the import near the other component imports:
```tsx
import { GameStatus } from './components/GameStatus';
```
Then in the header JSX, inside the **"Right: Progress + Switch"** container (the `<div className="flex items-center gap-4">` that holds the mission progress bar and the Reset/Switch buttons), add `<GameStatus />` as the FIRST child of that div:
```tsx
            <div className="flex items-center gap-4">
              <GameStatus />
              <div className="flex items-center gap-3">
                {/* existing mission progress bar ... */}
```

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/GameStatus.tsx src/App.tsx
git commit -m "feat: add GameStatus header strip (level, XP, streak, combo)"
```

---

### Task 6: Achievement toast + enhanced success toast (XP & "Why it works")

**Files:**
- Create: `src/components/AchievementToast.tsx`
- Modify: `src/components/SuccessToast.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/components/AchievementToast.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { ACHIEVEMENTS } from '../lib/achievements';

interface AchievementToastProps {
  achievementIds: string[];
  // changes whenever a fresh batch arrives, so the toast re-triggers
  triggerKey: number;
}

export function AchievementToast({ achievementIds, triggerKey }: AchievementToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (achievementIds.length === 0) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 4500);
    return () => clearTimeout(t);
  }, [triggerKey, achievementIds.length]);

  const unlocked = ACHIEVEMENTS.filter((a) => achievementIds.includes(a.id));

  return (
    <AnimatePresence>
      {visible && unlocked.length > 0 && (
        <div className="fixed bottom-28 right-6 z-50 flex flex-col gap-2 items-end">
          {unlocked.map((a, i) => {
            const Icon = (Icons as Record<string, any>)[a.icon] ?? Icons.Trophy;
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: 40, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26, delay: i * 0.08 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#1A1430] border border-amber-500/30 shadow-2xl shadow-amber-500/10 max-w-xs"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">Achievement</p>
                  <p className="font-semibold text-white text-sm leading-tight">{a.label}</p>
                  <p className="text-gray-400 text-xs">{a.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Enhance `SuccessToast` to show XP and the teaching card**

In `src/components/SuccessToast.tsx`, extend the props interface and signature to accept optional `xpGained` and `explanation`:
```tsx
interface SuccessToastProps {
  stepIndex: number;
  totalSteps: number;
  conceptFocus: string;
  isLastStep: boolean;
  xpGained?: number;
  explanation?: string;
}

export function SuccessToast({ stepIndex, totalSteps, conceptFocus, isLastStep, xpGained, explanation }: SuccessToastProps) {
```
Change the toast auto-dismiss timeout from `3000` to `5000` (the teaching card needs reading time):
```tsx
    const t = setTimeout(() => setVisible(false), 5000);
```
Replace the `+1 ✓` badge span with an XP badge:
```tsx
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {xpGained != null ? `+${xpGained} XP` : '+1 ✓'}
              </span>
```
And immediately AFTER the existing concept line `<p className="text-gray-400 text-xs">{conceptFocus.replace(/_/g, ' ')}</p>`, add the explanation block:
```tsx
            {explanation && (
              <p className="text-gray-300 text-[11px] leading-relaxed mt-1.5 pt-1.5 border-t border-white/5">
                <span className="text-emerald-400 font-semibold">Why it works: </span>{explanation}
              </p>
            )}
```

- [ ] **Step 3: Wire both into App**

In `src/App.tsx`:

(a) Add imports:
```tsx
import { AchievementToast } from './components/AchievementToast';
import { explainConcept } from './lib/whyItWorks';
```

(b) Read `lastSolve` from the store. Near the top of the component where other store values are read (e.g. just after the `useProgressStore()` destructure), add a selector subscription:
```tsx
  const lastSolve = useProgressStore((s) => s.lastSolve);
```

(c) Update the existing `<SuccessToast ... />` usage to pass the new props. Find it (rendered when `toastStep && lastSuccessStep !== null`) and add:
```tsx
        <SuccessToast
          key={lastSuccessStep}
          stepIndex={lastSuccessStep}
          totalSteps={domain.curriculumMatrix.length}
          conceptFocus={toastStep.conceptFocus}
          isLastStep={lastSuccessStep >= domain.curriculumMatrix.length - 1}
          xpGained={lastSolve?.xpGained}
          explanation={explainConcept(toastStep.conceptFocus)}
        />
```

(d) Directly AFTER that `SuccessToast` block, render the achievement toast:
```tsx
      {lastSolve && lastSolve.newAchievements.length > 0 && (
        <AchievementToast
          achievementIds={lastSolve.newAchievements}
          triggerKey={lastSuccessStep ?? 0}
        />
      )}
```

- [ ] **Step 4: Type-check + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: no errors. (If lint flags the `as any` index in AchievementToast, it is acceptable for the dynamic Lucide lookup; if the project's eslint forbids `any`, replace `Record<string, any>` with `Record<string, React.ComponentType<{ size?: number; className?: string }>>` and import `React`.)

- [ ] **Step 5: Commit**

```bash
git add src/components/AchievementToast.tsx src/components/SuccessToast.tsx src/App.tsx
git commit -m "feat: surface XP, why-it-works, and achievement unlocks on solve"
```

---

### Task 7: Sanity verification (build, lint, tests, quick browser)

**Files:** none (verification only)

- [ ] **Step 1: Unit tests**

Run: `npm test`
Expected: all pass — Phase 1 suites plus gameLogic, achievements, whyItWorks.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors. Fix any unused-import warnings introduced.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `tsc -b` and `vite build` complete with no errors.

- [ ] **Step 4: Browser sanity check (not full regression)**

Start the dev server and on a mission, confirm the happy path only:
- The header shows **LV 1** with an XP bar (and no streak/combo chip initially).
- Solve one step **without** revealing a hint → the success toast shows **`+160 XP`** and a **"Why it works"** line; the header XP bar advances; the streak flame appears showing **1**; after a second consecutive no-hint solve a **combo chip (2x)** appears.
- Reveal a hint on a step, then solve it → the success toast shows **`+100 XP`** and the combo chip disappears (reset).
- The **"First Steps"** achievement toast appears on the first solve.
- Reload the page → level/XP/streak/achievements persist; combo and the toasts do not reappear on their own.

- [ ] **Step 5: Final commit (only if lint/build fixes were needed)**

```bash
git add -A
git commit -m "chore: Phase 2 sanity-check cleanup"
```

---

## Notes for the implementer

- **Do not** change the SQL validation pipeline, the domain JSON, or Phase 1 modules (`src/lib/schema.ts`, `schemaGraph.ts`, `buildSqlSchema.ts`, `SqlEditor.tsx`, `SchemaGraph.tsx`).
- Game state is **global** (one profile across all missions); per-domain step progress is unchanged.
- Keep all reward/streak/achievement/explanation math in the `src/lib/` pure modules — the store and components should only orchestrate, never re-implement the math.
- `lastSolve` and `hintUsedThisStep` are intentionally excluded from persistence so toasts don't replay on reload.
