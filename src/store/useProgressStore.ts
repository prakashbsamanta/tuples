import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { computeReward, updateStreak, levelFromXp } from '../lib/gameLogic';
import { checkAchievements, type GameSnapshot } from '../lib/achievements';

export interface DomainProgress {
  currentStepIndex: number;
  historicalQueries: Record<number, string>;
}

export interface Certification {
  score: number;
  total: number;
  earnedOn: string; // YYYY-MM-DD
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
  /** Exam certifications earned per domain (score >= passing threshold). */
  certifications: Record<string, Certification>;

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
  recordCertification: (domainId: string, cert: Certification) => void;
}

const todayStr = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

/**
 * Persist migration. v1 → v2 resets mission progress (the expert-curriculum
 * overhaul renumbered every step) while keeping global XP/streaks/achievements.
 * Exported for direct testing — the persist API is unavailable in node.
 */
export function migrateProgress(persisted: unknown, version: number): ProgressState {
  const state = (persisted ?? {}) as ProgressState;
  if (version < 2) {
    return {
      ...state,
      activeDomainId: null,
      progressByDomain: {},
      certifications: {},
    };
  }
  return state;
}

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
      certifications: {},
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

      recordCertification: (domainId, cert) =>
        set((state) => ({
          certifications: { ...state.certifications, [domainId]: cert },
        })),
    }),
    {
      name: 'tuples_user_progress',
      // v2: the expert-curriculum overhaul renumbered every step, so persisted
      // step indices/queries from v1 are meaningless — reset mission progress
      // but keep global XP, streaks, and achievements.
      version: 2,
      migrate: migrateProgress,
      partialize: (state) => ({
        activeDomainId: state.activeDomainId,
        progressByDomain: state.progressByDomain,
        certifications: state.certifications,
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
