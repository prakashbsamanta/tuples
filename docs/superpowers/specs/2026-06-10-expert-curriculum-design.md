# Tuples Expert Curriculum — Design Spec

**Date:** 2026-06-10 · **Branch:** `feat/kinetic-redesign` · **Status:** Approved by owner

## Goal

Turn Tuples from "35 concepts taught three times" into an expert-maker:
three genuinely different missions, realistic seeded data, rigorous validation
that can't be passed by accident, new challenge types, deeper phases, and a
per-mission final exam. SQLite 3.49 (sql.js 1.14) verified to support all
required features (RETURNING, JSON1, FULL OUTER JOIN, recursive CTEs, window
frames, EXPLAIN QUERY PLAN, UPSERT, triggers, generated columns, partial indexes).

## Architecture constraints (existing)

- DB state is **replayed** on load: fresh sql.js DB + re-exec of saved
  historical queries for steps `0..currentStepIndex-1`. All seeding must be
  deterministic and replayable.
- Curriculum is JSON per domain (`src/domains/*.json`), typed in
  `src/domains/index.ts`, validated in `useSqlEngine.executeQuery`.

## Step schema v2

```ts
interface DomainStep {
  stepIndex: number;
  phase: 'Novice' | 'Operator' | 'Architect' | 'Principal' | 'Capstone';
  conceptFocus: string;            // keyed into whyItWorks explanations
  narrativeBriefing: string;
  challengeType?: 'write' | 'fix' | 'optimize' | 'open';  // default 'write'
  starterQuery?: string;           // pre-fills editor (fix/optimize steps)
  hints: { tier1Concept: string; tier2Scaffold: string; tier3Solution: string };
  validation: Validation;
  seedAfter?: string;              // seed-script key executed after step passes
}

type Validation =
  | { type: 'RESULT_MATCH'; solutionQuery: string; requiresOrder?: boolean }
  | { type: 'SCHEMA_VERIFY'; verificationQuery: string; expectedResult: string }
  | { type: 'STATE_VERIFY';  verificationQuery: string; expectedResult: string }
  | { type: 'PLAN_VERIFY';   solutionQuery: string; planMustInclude: string };

interface DomainSchema {
  domainId: string; domainName: string; domainDescription: string;
  setupSeedKey?: string;           // seed script run at DB creation (Analyst/Optimizer)
  curriculumMatrix: DomainStep[];
  examPool: ExamQuestion[];        // { prompt, solutionQuery, conceptFocus }
}
```

## Validation semantics

- **RESULT_MATCH**: run user query and `solutionQuery` on the live DB; compare
  result sets as value-tuples (column aliases ignored, column count must match,
  numeric tolerance 1e-3). Order-insensitive (canonical sort) unless
  `requiresOrder`. **Hidden-variant check**: also run both on a shadow DB built
  with `VARIANT_SEED` (different data) — kills hardcoded answers. Shadow DB
  snapshot cached per (domain, step) as Uint8Array; built by: setup seed
  (variant) → replay canonical `tier3Solution` of mutating steps 0..n-1 →
  seedAfter scripts (variant).
- **SCHEMA_VERIFY / STATE_VERIFY**: legacy mechanism (verificationQuery vs
  expectedResult JSON) for DDL/DML steps. STATE_VERIFY is the new name for
  row-content checks (no bare row counts allowed; verify actual values).
- **PLAN_VERIFY**: RESULT_MATCH semantics + `EXPLAIN QUERY PLAN <user query>`
  detail text must include `planMustInclude` (e.g. "USING INDEX idx_ticks_symbol").

Mutating-step detection for shadow replay: steps with validation type
SCHEMA_VERIFY/STATE_VERIFY are replayed (their canonical tier3Solution);
RESULT_MATCH/PLAN_VERIFY steps are read-only EXCEPT when `mutates: true` is set
(e.g. CREATE INDEX verified via PLAN). Add optional `mutates?: boolean`.

Hydration change: when replaying step i, use saved user query, falling back to
`tier3Solution` (guarantees state correctness if history is missing).

## Seeds (`src/domains/seeds.ts`)

Deterministic mulberry32 PRNG. Two seeds: `BASE_SEED=1337` (user-visible data),
`VARIANT_SEED=7331` (hidden validation data). Exported as
`seedScripts: Record<string, (variant: boolean) => string>` returning SQL.

- `trading_setup`: assets (24 symbols/4 sectors), price_ticks (~12k rows, 30
  trading days × symbols × hourly), orders (~1.5k), trades (~1k), portfolios.
- `logistics_setup`: stations (14), routes (~40 directed edges with fuel costs),
  vessels (20), crew (60, manager_id self-ref), crew_assignments (M2M),
  cargo (~400), shipments (~600).
- `clinical_bulk_patients` (seedAfter): ~300 patients with dirty data — NULLs,
  duplicate emails, mixed-case names, out-of-range ages.
- `clinical_bulk_visits` (seedAfter): ~1.2k visit rows across sites/dates.

## Mission tracks (~50 steps each)

### Clinical Trials — **The Builder** (integrity & correctness)
Novice (10): CREATE TABLE/types, INSERT, multi-INSERT, SELECT/WHERE, UPDATE,
DELETE, ALTER, PRIMARY KEY+AUTOINCREMENT, NOT NULL/DEFAULT, CHECK, UNIQUE.
Operator (14): FKs + PRAGMA foreign_keys, composite PK (enrollments M2M),
bulk seed → find duplicates (GROUP BY/HAVING), dedupe via ROW_NUMBER DELETE,
IS NULL vs = NULL, COALESCE, NULLIF, UPDATE-from-subquery, CASE in UPDATE,
date functions (age via julianday, strftime buckets), CAST, LIKE/cleaning
(TRIM/UPPER), aggregate after cleaning.
Architect (14): transactions (BEGIN/COMMIT), ROLLBACK, UPSERT ON CONFLICT,
INSERT OR IGNORE, RETURNING, audit trigger (AFTER UPDATE), guard trigger
(RAISE ABORT), views, CTE, generated column, JSON1 (json_extract),
json_each expansion, integrity-check report (FK orphans via LEFT JOIN),
window versioning.
Capstone (5): "regulatory audit" chained investigation (multi-CTE reports).
Exam pool: 8.

### Algorithmic Trading — **The Analyst** (time series & windows)
`setupSeedKey: trading_setup` (pre-seeded; no DDL busywork).
Novice (10): SELECT/LIMIT/OFFSET, WHERE combinators, IN/BETWEEN, ORDER BY
multi-key, DISTINCT, COUNT/AVG/MIN/MAX, GROUP BY, multi-key GROUP BY, HAVING,
round/printf formatting.
Operator (14): INNER JOIN, LEFT JOIN missing-data, self-join (same-sector
pairs), anti-join NOT EXISTS, the NOT IN + NULL trap (fix step), UNION ALL vs
UNION, EXCEPT, INTERSECT, scalar subquery, correlated subquery, CASE pivot
(sector columns), conditional aggregation, date bucketing (strftime), views.
Architect (16): ROW_NUMBER, RANK vs DENSE_RANK, LAG returns, LEAD, moving avg
(ROWS BETWEEN 6 PRECEDING), running volume, PARTITION BY, NTILE quartiles,
FIRST_VALUE/LAST_VALUE frame gotcha (fix step), VWAP via CTE, gaps & islands
(up-streaks), top-N per group, percent-of-total window, multi-CTE drawdown,
cohort first-trade retention, EXPLAIN intro.
Capstone (5): "post-mortem of a losing strategy" chained analysis.
Exam pool: 8.

### Space Logistics — **The Optimizer** (structure & performance)
`setupSeedKey: logistics_setup`.
Novice (10): exploration (COUNT, joins refresh), M2M join (crew_assignments),
aggregate joins, EXISTS, IN vs EXISTS, conditional agg, NULL-safe compare,
multi-hop 2-join, view, anti-join.
Operator (14): self-join (route pairs), direct vs 2-hop routes, UNION set work,
EXCEPT (unreachable), INTERSECT, recursive CTE numbers warm-up, recursive
reachability from HQ, recursive with depth/path, command chain (manager
hierarchy), cycle-safe traversal, BOM-style cargo totals, FULL OUTER JOIN,
correlated ranking, dedupe.
Architect (16): EXPLAIN QUERY PLAN reading (SCAN vs SEARCH), CREATE INDEX +
PLAN_VERIFY, covering index, composite index column order (optimize step),
partial index, rewrite NOT IN → NOT EXISTS (optimize), index-killing functions
on columns (fix step), UNION ALL vs OR (optimize), join-order intuition,
ANALYZE, expression index, windows for dedupe, JSON manifest, trigger-maintained
counter cache, view + index interplay.
Capstone (5): "fuel-crisis routing" chained investigation.
Exam pool: 8.

## UI

- SqlTerminal: `starterQuery` prefill on step change; challengeType badge
  (FIX THE BUG / OPTIMIZE / OPEN CHALLENGE); EXPLAIN button (runs
  `EXPLAIN QUERY PLAN` as a Test-Run).
- Phases: colors/labels for Principal*(unused initially)*/Capstone in App +
  PathVisualizer; phase pills in MissionSelection computed dynamically.
- Copy: "35 steps" → dynamic counts everywhere (nav, landing, completion).
- **Exam mode**: on mission complete, "Take the Final Exam" → ExamPanel:
  8 random examPool questions (no hints, no Test Run), DB = setup seed + full
  canonical replay; RESULT_MATCH validation; score ≥ 6/8 ⇒ certification badge
  persisted (`certifications: string[]` in store), shown on MissionSelection.
- Store: persist version 2 + migrate (old progress reset — step indices moved).

## Testing

- `src/lib/validate.test.ts`: pure unit tests for result comparison.
- `src/domains/curriculum.integrity.test.ts` (node + real sql.js): for each
  domain, replay every step's tier3Solution through the REAL validation
  pipeline (incl. hidden variant + seeds) and assert pass; assert every `fix`
  starterQuery FAILS validation; exam pool solvable on completed DB; every
  conceptFocus has a whyItWorks entry. This one suite mechanically proves all
  ~150 steps are solvable and correctly validated.
- e2e: update step-1 SQL if changed; add exam-mode entry assertion.

## Out of scope

Spaced-repetition drills, more domains, server features, i18n.
