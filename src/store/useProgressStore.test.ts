// Store behavior tests: solve accounting, certifications, and the v2 persist
// migration that resets mission progress while keeping global game state.
// zustand's persist middleware no-ops without localStorage in node — actions
// and state still behave normally, which is exactly what these tests exercise.

import { describe, it, expect, beforeEach } from 'vitest';
import { useProgressStore, migrateProgress } from './useProgressStore';

const reset = () => {
  useProgressStore.getState().resetAll();
  useProgressStore.setState({ activeDomainId: null, certifications: {} });
};

describe('useProgressStore', () => {
  beforeEach(reset);

  it('starting a domain initializes progress at step 0', () => {
    useProgressStore.getState().setActiveDomain('algorithmic-trading');
    const s = useProgressStore.getState();
    expect(s.activeDomainId).toBe('algorithmic-trading');
    expect(s.progressByDomain['algorithmic-trading']).toEqual({
      currentStepIndex: 0,
      historicalQueries: {},
    });
  });

  it('solving advances the step, awards XP, and tracks combo', () => {
    const store = useProgressStore.getState();
    store.setActiveDomain('algorithmic-trading');
    store.saveQueryForStep(0, 'SELECT 1;');
    store.recordSolve({ conceptFocus: 'SELECT_LIMIT' });
    store.unlockNextStep();

    const s = useProgressStore.getState();
    expect(s.progressByDomain['algorithmic-trading'].currentStepIndex).toBe(1);
    expect(s.progressByDomain['algorithmic-trading'].historicalQueries[0]).toBe('SELECT 1;');
    expect(s.xp).toBeGreaterThan(0);
    expect(s.combo).toBe(1);
    expect(s.totalSolved).toBe(1);
    expect(s.solvedConcepts).toContain('SELECT_LIMIT');
    expect(s.lastSolve?.usedHint).toBe(false);
  });

  it('hint usage is charged against the next solve only', () => {
    const store = useProgressStore.getState();
    store.setActiveDomain('algorithmic-trading');
    store.revealHint();
    store.recordSolve({ conceptFocus: 'A' });
    expect(useProgressStore.getState().lastSolve?.usedHint).toBe(true);
    expect(useProgressStore.getState().noHintSolves).toBe(0);

    useProgressStore.getState().recordSolve({ conceptFocus: 'B' });
    expect(useProgressStore.getState().lastSolve?.usedHint).toBe(false);
    expect(useProgressStore.getState().noHintSolves).toBe(1);
  });

  it('records and keeps certifications per domain', () => {
    const store = useProgressStore.getState();
    store.recordCertification('space-logistics', { score: 7, total: 8, earnedOn: '2026-06-11' });
    store.recordCertification('algorithmic-trading', { score: 8, total: 8, earnedOn: '2026-06-11' });
    const s = useProgressStore.getState();
    expect(s.certifications['space-logistics'].score).toBe(7);
    expect(s.certifications['algorithmic-trading'].total).toBe(8);
  });

  it('resetDomain clears one domain without touching global XP', () => {
    const store = useProgressStore.getState();
    store.setActiveDomain('algorithmic-trading');
    store.recordSolve({ conceptFocus: 'X' });
    store.unlockNextStep();
    const xp = useProgressStore.getState().xp;

    useProgressStore.getState().resetDomain('algorithmic-trading');
    const s = useProgressStore.getState();
    expect(s.progressByDomain['algorithmic-trading'].currentStepIndex).toBe(0);
    expect(s.xp).toBe(xp);
  });

  it('v1 → v2 persist migration resets mission progress but keeps game state', () => {
    const v1 = {
      activeDomainId: 'algorithmic-trading',
      progressByDomain: { 'algorithmic-trading': { currentStepIndex: 22, historicalQueries: { 3: 'SELECT 1' } } },
      xp: 990,
      bestCombo: 7,
      unlockedAchievements: ['first_blood'],
    };
    const out = migrateProgress(v1, 1) as unknown as Record<string, unknown>;
    expect(out.activeDomainId).toBeNull();
    expect(out.progressByDomain).toEqual({});
    expect(out.certifications).toEqual({});
    expect(out.xp).toBe(990);
    expect(out.bestCombo).toBe(7);
    expect(out.unlockedAchievements).toEqual(['first_blood']);
  });

  it('v2 state passes through migration untouched', () => {
    const v2 = { activeDomainId: 'space-logistics', progressByDomain: { x: { currentStepIndex: 4, historicalQueries: {} } }, certifications: { y: { score: 6, total: 8, earnedOn: '2026-01-01' } } };
    expect(migrateProgress(structuredClone(v2), 2)).toEqual(v2);
  });
});
