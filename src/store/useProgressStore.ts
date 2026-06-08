import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DomainProgress {
  currentStepIndex: number;
  historicalQueries: Record<number, string>;
}

export interface ProgressState {
  activeDomainId: string | null;
  progressByDomain: Record<string, DomainProgress>;
  setActiveDomain: (domainId: string | null) => void;
  unlockNextStep: () => void;
  saveQueryForStep: (stepIndex: number, query: string) => void;
  resetDomain: (domainId: string) => void;
  resetAll: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      activeDomainId: null,
      progressByDomain: {},
      setActiveDomain: (domainId) => 
        set((state) => {
          if (!domainId) return { activeDomainId: null };
          // Initialize if it doesn't exist
          const existing = state.progressByDomain[domainId];
          if (!existing) {
            return {
              activeDomainId: domainId,
              progressByDomain: {
                ...state.progressByDomain,
                [domainId]: { currentStepIndex: 0, historicalQueries: {} }
              }
            };
          }
          return { activeDomainId: domainId };
        }),
      unlockNextStep: () => 
        set((state) => {
          if (!state.activeDomainId) return {};
          const current = state.progressByDomain[state.activeDomainId];
          return {
            progressByDomain: {
              ...state.progressByDomain,
              [state.activeDomainId]: {
                ...current,
                currentStepIndex: current.currentStepIndex + 1
              }
            }
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
                historicalQueries: { ...current.historicalQueries, [stepIndex]: query }
              }
            }
          };
        }),
      // FIX #7: Reset progress for a single mission (clears step + saved queries).
      resetDomain: (domainId) =>
        set((state) => ({
          progressByDomain: {
            ...state.progressByDomain,
            [domainId]: { currentStepIndex: 0, historicalQueries: {} }
          }
        })),
      // FIX #7: Wipe all progress across every mission.
      resetAll: () =>
        set(() => ({
          progressByDomain: {}
        })),
    }),
    {
      name: 'tuples_user_progress',
    }
  )
);
