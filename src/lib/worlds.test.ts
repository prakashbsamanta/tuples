import { describe, it, expect } from 'vitest';
import { WORLDS, worldByDomain } from './worlds';
import { domains } from '../domains';

describe('world identity system', () => {
  it('maps every domain to exactly one world and vice versa', () => {
    const domainIds = Object.keys(domains).sort();
    const worldDomainIds = WORLDS.map((w) => w.domainId).sort();
    expect(worldDomainIds).toEqual(domainIds);
    for (const id of domainIds) {
      expect(worldByDomain[id], `world for ${id}`).toBeDefined();
    }
  });

  it('has unique ids, indices, and accents', () => {
    const uniq = <T,>(xs: T[]) => new Set(xs).size === xs.length;
    expect(uniq(WORLDS.map((w) => w.id))).toBe(true);
    expect(uniq(WORLDS.map((w) => w.index))).toBe(true);
    expect(uniq(WORLDS.map((w) => w.accent))).toBe(true);
    expect(uniq(WORLDS.map((w) => w.name))).toBe(true);
  });

  it('uses valid 6-digit hex colors (Atmosphere parses them)', () => {
    for (const w of WORLDS) {
      expect(w.accent, `${w.id} accent`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(w.bg, `${w.id} bg`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('keeps names and epithets presentation-ready', () => {
    for (const w of WORLDS) {
      expect(w.name.startsWith('The ')).toBe(true);
      expect(w.epithet.length).toBeGreaterThan(15);
      expect(w.role.length).toBeGreaterThan(3);
    }
  });
});
