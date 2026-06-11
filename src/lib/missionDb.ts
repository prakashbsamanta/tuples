// Builds mission database state deterministically. Used by the live engine
// (hydration), the hidden-variant shadow validation, and the curriculum
// integrity tests — one code path for all three.

import type { Database, SqlJsStatic } from 'sql.js';
import type { DomainSchema } from '../domains';
import { seedScripts } from '../domains/seeds';
import { stepMutates } from './validate';

export interface BuildOptions {
  /** Use the hidden VARIANT seed data instead of the user-visible BASE data. */
  variant?: boolean;
  /**
   * The user's saved queries by step index. When present for a step it is
   * replayed verbatim; otherwise mutating steps fall back to the canonical
   * tier3Solution so later steps always see correct state.
   */
  savedQueries?: Record<number, string>;
}

/**
 * Create a DB with the domain's setup seed applied and steps `0..upToStep-1`
 * replayed (including their seedAfter bulk loads).
 */
export function buildMissionDb(
  SQL: SqlJsStatic,
  domain: DomainSchema,
  upToStep: number,
  opts: BuildOptions = {}
): Database {
  const { variant = false, savedQueries } = opts;
  const db = new SQL.Database();
  db.run('PRAGMA foreign_keys = ON;');

  if (domain.setupSeedKey) {
    const seed = seedScripts[domain.setupSeedKey];
    if (!seed) throw new Error(`Unknown setup seed: ${domain.setupSeedKey}`);
    db.run(seed(variant));
  }

  const last = Math.min(upToStep, domain.curriculumMatrix.length);
  for (let i = 0; i < last; i++) {
    const step = domain.curriculumMatrix[i];
    const saved = savedQueries?.[i];
    const replay = saved ?? (stepMutates(step) ? step.hints.tier3Solution : null);
    if (replay) {
      try {
        db.run(replay);
      } catch (e) {
        // A saved user query can fail on replay (e.g. authored before a content
        // update). Fall back to the canonical solution so state stays correct.
        if (saved && stepMutates(step)) {
          try { db.run(step.hints.tier3Solution); } catch { /* state best-effort */ }
        } else if (!saved) {
          console.warn(`Canonical replay failed at step ${i}:`, e);
        }
      }
    }
    if (step.seedAfter) {
      const seed = seedScripts[step.seedAfter];
      if (!seed) throw new Error(`Unknown seedAfter: ${step.seedAfter}`);
      db.run(seed(variant));
    }
  }
  return db;
}
