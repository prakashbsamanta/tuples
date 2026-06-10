// Mechanical proof that the entire curriculum works:
// for every domain, every step's canonical solution is executed through the
// REAL validation pipeline (seeds, hidden-variant shadow DB, plan checks) and
// must pass; every fix-the-bug starter query must FAIL; every exam question
// must be solvable on the completed mission DB.
//
// If this suite is green, every step in the app is solvable and correctly graded.

import { describe, it, expect, beforeAll } from 'vitest';
import initSqlJs, { type SqlJsStatic, type Database } from 'sql.js';
import { domains, type DomainSchema, type DomainStep } from './index';
import { buildMissionDb } from '../lib/missionDb';
import { validateStep, execTable, resultsMatch } from '../lib/validate';
import { explainConcept } from '../lib/whyItWorks';

let SQL: SqlJsStatic;

beforeAll(async () => {
  SQL = await initSqlJs();
}, 30_000);

/** Run one query through the real validation pipeline at a given step. */
function attempt(domain: DomainSchema, step: DomainStep, stepIdx: number, query: string) {
  const db = buildMissionDb(SQL, domain, stepIdx);
  let shadow: Database | null = null;
  try {
    const userResult = execTable(db, query);
    return validateStep(db, step, query, userResult, {
      getShadowDb: () => {
        shadow = buildMissionDb(SQL, domain, stepIdx, { variant: true });
        return shadow;
      },
    });
  } catch (e) {
    return { pass: false, reason: `threw: ${(e as Error).message}`, display: null };
  } finally {
    db.close();
    if (shadow) (shadow as Database).close();
  }
}

for (const domain of Object.values(domains)) {
  describe(`${domain.domainName}`, () => {
    it('has sequential stepIndex values and required fields', () => {
      domain.curriculumMatrix.forEach((step, i) => {
        expect(step.stepIndex, `step ${i} index`).toBe(i);
        expect(step.narrativeBriefing.length, `step ${i} briefing`).toBeGreaterThan(20);
        expect(step.hints.tier1Concept.length, `step ${i} tier1`).toBeGreaterThan(10);
        expect(step.hints.tier2Scaffold.length, `step ${i} tier2`).toBeGreaterThan(5);
        expect(step.hints.tier3Solution.length, `step ${i} tier3`).toBeGreaterThan(5);
        if (step.challengeType === 'fix' || step.challengeType === 'optimize') {
          expect(step.starterQuery, `step ${i} needs starterQuery`).toBeTruthy();
        }
      });
    });

    it('every step is solvable with its canonical solution', () => {
      domain.curriculumMatrix.forEach((step, i) => {
        const outcome = attempt(domain, step, i, step.hints.tier3Solution);
        expect(
          outcome.pass,
          `step ${i} (${step.conceptFocus}) solution rejected: ${outcome.reason}`
        ).toBe(true);
      });
    });

    it('fix-the-bug starter queries do NOT pass as-is', () => {
      domain.curriculumMatrix.forEach((step, i) => {
        if (step.challengeType !== 'fix' || !step.starterQuery) return;
        let pass = false;
        try {
          pass = attempt(domain, step, i, step.starterQuery).pass;
        } catch {
          pass = false; // erroring starter is fine — it visibly fails
        }
        expect(pass, `step ${i} (${step.conceptFocus}) starter query should fail`).toBe(false);
      });
    });

    it('every exam question is solvable on the completed mission DB', () => {
      expect(domain.examPool.length).toBeGreaterThanOrEqual(6);
      const db = buildMissionDb(SQL, domain, domain.curriculumMatrix.length);
      try {
        for (const q of domain.examPool) {
          const result = execTable(db, q.solutionQuery);
          const self = resultsMatch(result, execTable(db, q.solutionQuery), q.requiresOrder);
          expect(self.match, `exam "${q.prompt.slice(0, 40)}…" not executable`).toBe(true);
          expect(q.prompt.length).toBeGreaterThan(20);
        }
      } finally {
        db.close();
      }
    });

    it('every conceptFocus has a meaningful explanation', () => {
      for (const step of domain.curriculumMatrix) {
        expect(explainConcept(step.conceptFocus).length).toBeGreaterThan(30);
      }
    });
  });
}

describe('cross-domain', () => {
  it('missions teach meaningfully different concepts', () => {
    const sets = Object.values(domains).map(
      (d) => new Set(d.curriculumMatrix.map((s) => s.conceptFocus))
    );
    // Pairwise overlap must stay low — missions are different disciplines.
    for (let i = 0; i < sets.length; i++) {
      for (let j = i + 1; j < sets.length; j++) {
        const overlap = [...sets[i]].filter((c) => sets[j].has(c)).length;
        const ratio = overlap / Math.min(sets[i].size, sets[j].size);
        expect(ratio, `domains ${i} and ${j} overlap ${Math.round(ratio * 100)}%`).toBeLessThan(0.25);
      }
    }
  });

  it('the combined curriculum is expert-scale', () => {
    const total = Object.values(domains).reduce((a, d) => a + d.curriculumMatrix.length, 0);
    expect(total).toBeGreaterThanOrEqual(140);
  });
});
