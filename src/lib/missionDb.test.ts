// Integration tests for the replay-based persistence model: mission DB state
// is rebuilt by re-executing queries, so determinism and graceful fallback are
// load-bearing guarantees for every saved game.

import { describe, it, expect, beforeAll } from 'vitest';
import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { buildMissionDb } from './missionDb';
import { execTable } from './validate';
import { domains } from '../domains';

let SQL: SqlJsStatic;
const trading = () => domains['algorithmic-trading'];
const clinical = () => domains['clinical-trials-research'];

beforeAll(async () => {
  SQL = await initSqlJs();
}, 30_000);

describe('buildMissionDb (integration)', () => {
  it('is deterministic: two builds of the same state are byte-identical', () => {
    const a = buildMissionDb(SQL, trading(), 10);
    const b = buildMissionDb(SQL, trading(), 10);
    try {
      expect(Buffer.from(a.export()).equals(Buffer.from(b.export()))).toBe(true);
    } finally {
      a.close();
      b.close();
    }
  });

  it('variant seed produces different data but the same schema', () => {
    const base = buildMissionDb(SQL, trading(), 0);
    const variant = buildMissionDb(SQL, trading(), 0, { variant: true });
    try {
      const schema = (db: typeof base) =>
        execTable(db, "SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name");
      expect(schema(base)).toEqual(schema(variant));
      const ticks = (db: typeof base) => execTable(db, 'SELECT COUNT(*) FROM orders')?.rows[0][0];
      // Seed plans intentionally differ in volume between base and variant.
      expect(ticks(base)).not.toEqual(ticks(variant));
    } finally {
      base.close();
      variant.close();
    }
  });

  it('replays saved user queries verbatim when they work', () => {
    const domain = clinical();
    const saved = {
      0: 'CREATE TABLE patients (patient_id INTEGER PRIMARY KEY, full_name TEXT, age INTEGER);',
      1: "INSERT INTO patients (patient_id, full_name, age) VALUES (1, 'Saved Variant', 34);",
    };
    const db = buildMissionDb(SQL, domain, 2, { savedQueries: saved });
    try {
      const row = execTable(db, 'SELECT full_name FROM patients WHERE patient_id = 1');
      expect(row?.rows[0][0]).toBe('Saved Variant');
    } finally {
      db.close();
    }
  });

  it('falls back to the canonical solution when a saved query breaks on replay', () => {
    const domain = clinical();
    // Step 0 saved query is garbage (e.g. authored against an older curriculum).
    const db = buildMissionDb(SQL, domain, 2, {
      savedQueries: { 0: 'CREATE TABLE wrong_shape (nope TEXT;);' },
    });
    try {
      // Canonical fallback must have produced the real schema so step 1 works.
      const cols = execTable(db, "SELECT name FROM pragma_table_info('patients') ORDER BY cid");
      expect(cols?.rows.map((r) => r[0])).toEqual(['patient_id', 'full_name', 'age']);
      expect(execTable(db, 'SELECT COUNT(*) AS n FROM patients')?.rows[0][0]).toBeGreaterThanOrEqual(1);
    } finally {
      db.close();
    }
  });

  it('enforces foreign keys in replayed state', () => {
    const db = buildMissionDb(SQL, trading(), 0);
    try {
      expect(execTable(db, 'PRAGMA foreign_keys')?.rows[0][0]).toBe(1);
    } finally {
      db.close();
    }
  });
});
