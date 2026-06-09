import { describe, it, expect } from 'vitest';
import { coachError } from './errorCoach';

describe('coachError', () => {
  it('returns null when there is no error', () => {
    expect(coachError(null)).toBeNull();
    expect(coachError('')).toBeNull();
  });

  it('nudges on missing table and quotes the name', () => {
    const msg = coachError('no such table: patientz');
    expect(msg).toMatch(/patientz/);
    expect(msg).toMatch(/schema map/i);
  });

  it('nudges on missing column', () => {
    expect(coachError('no such column: ages')).toMatch(/ages/);
  });

  it('nudges on ambiguous column', () => {
    expect(coachError('ambiguous column name: id')).toMatch(/qualify/i);
  });

  it('suggests FROM when SELECT lacks one', () => {
    expect(coachError('near "x": syntax error', 'select x')).toMatch(/FROM/);
  });

  it('gives a generic syntax hint otherwise', () => {
    expect(coachError('syntax error', 'select * from t wher a=1')).toMatch(/comma|quote|keyword/i);
  });

  it('coaches ranking-style verification mismatch toward ORDER BY', () => {
    const msg = coachError('Verification failed.\nExpected: ...\nGot: ...', 'select name from drugs -- highest first');
    expect(msg).toMatch(/ORDER BY/);
  });

  it('coaches generic verification mismatch', () => {
    const msg = coachError('Verification failed.\nExpected: [1]\nGot: [2]', 'select count(*) from t');
    expect(msg).toMatch(/doesn.t match|re-read/i);
  });

  it('handles aggregate misuse', () => {
    expect(coachError('misuse of aggregate: COUNT()')).toMatch(/HAVING/);
  });

  it('returns null for unknown errors', () => {
    expect(coachError('some totally novel error')).toBeNull();
  });
});
