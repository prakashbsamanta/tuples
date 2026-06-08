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
