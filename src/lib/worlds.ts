// The Deep Field identity system: each curriculum track is a "world" with its
// own name, role, and light. CSS custom properties for these live in
// index.css under [data-world="..."] — components consume the vars, code
// consumes this metadata.

export type WorldId = 'lab' | 'floor' | 'belt';

export interface World {
  id: WorldId;
  domainId: string;
  index: string;
  name: string;
  role: string;
  epithet: string;
  /** Primary accent — must match the --world-accent var in index.css. */
  accent: string;
  /** Deep backdrop tone for panels and atmospheres. */
  bg: string;
}

export const WORLDS: World[] = [
  {
    id: 'lab',
    domainId: 'clinical-trials-research',
    index: '01',
    name: 'The Lab',
    role: 'Builder',
    epithet: 'Build a clinical database that cannot lie.',
    accent: '#5dcaa5',
    bg: '#081009',
  },
  {
    id: 'floor',
    domainId: 'algorithmic-trading',
    index: '02',
    name: 'The Floor',
    role: 'Analyst',
    epithet: 'Ask a live market dangerous questions.',
    accent: '#8fb6ff',
    bg: '#0a0d18',
  },
  {
    id: 'belt',
    domainId: 'space-logistics',
    index: '03',
    name: 'The Belt',
    role: 'Optimizer',
    epithet: 'Make an orbital freight network fast.',
    accent: '#ffb454',
    bg: '#120d06',
  },
];

export const worldByDomain: Record<string, World> = Object.fromEntries(
  WORLDS.map((w) => [w.domainId, w])
);
