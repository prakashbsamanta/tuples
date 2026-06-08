# Tuples — Game Redesign & Experimental UI Design Spec

**Date:** 2026-06-08
**Status:** Approved (design phase)

## 1. Goal

Transform Tuples from a structured SQL tutorial into an **engaging, game-like learning experience** with a distinctive, experimental modern UI. The app should simultaneously (a) teach SQL more effectively, (b) feel like a game with a rewarding loop, and (c) showcase unique UI craft so the interface itself is part of the appeal.

The existing engine stays intact: in-browser WebAssembly SQLite (`sql.js`), the 35-step curriculum matrix, the 3-domain data layer, and localStorage persistence. This is a UI + game-mechanics layer built **on top of** the working core — not a rewrite of the SQL engine.

## 2. Library Decisions

| Library | Role | Unique SQL-specific use |
|---|---|---|
| **CodeMirror 6** | Code editor | Replaces the `<textarea>`. SQL syntax highlighting + autocomplete sourced from the **live in-browser DB schema** (real table/column names). |
| **React Flow (`@xyflow/react`)** | Schema graph | Replaces `SchemaVisualizer`. Tables = draggable nodes; relationships/foreign keys = animated edges. Schema grows visually as the user builds. |
| **Aceternity UI / Magic UI** | Experimental effects | Copy-paste components on top of existing Framer Motion: aurora/spotlight backgrounds, text-generate briefing effect, animated beams on journey map, meteor shower on level-up. |
| **canvas-confetti + Tone.js** | Juice (particles + sound) | Celebration particles + generative audio. Combo plays an ascending arpeggio that climbs with the multiplier. |
| **visx or Recharts** (Phase 4) | Data viz | Auto-render a chart when a query returns numeric/time-series rows. |
| **Rive or Lottie** (Phase 4) | Mascot | State-driven DB-droid guide (idle / thinking / celebrate / error). |

Existing stack retained: React 18.3.1, Vite 5.4.11, TypeScript 5.4.5, Tailwind 3.4.15, Framer Motion 11.11.11, Lucide React, Zustand 5.x.

## 3. Game Mechanics (the "D blend")

Client-side only, persisted to localStorage via the existing Zustand store:

- **XP** awarded per step solved.
- **No-hint bonus** — higher XP when a step is solved without revealing any hint tier.
- **Levels** derived from cumulative XP.
- **Daily streak** — consecutive days with at least one solve.
- **Combo multiplier** — consecutive no-hint solves raise a multiplier; resets on hint use or failure.
- **Achievements/badges** — milestone-based (e.g. "First JOIN", "No-Hint Hero", "Window Wizard", "Speedrun", phase-completion badges).
- **"Why it works" reveal** — a short teaching card shown after each successful solve.

## 4. Phased Plan

Each phase must build clean (`npm run build`), lint clean (`npm run lint`), and verify live in the browser preview before the next phase begins. Each phase ends with a git commit and a completion summary.

### Phase 1 — Structural Backbone
- Integrate **CodeMirror 6** into `SqlTerminal`, preserving existing `onExecute` / `onRawExecute` / error / hints props. Add SQL language support and schema-aware autocomplete built from the live `db` schema (`sqlite_master` / `pragma_table_info`).
- Rebuild `SchemaVisualizer` with **React Flow**: derive nodes from current tables and columns, derive edges from foreign-key relationships (and/or inferred relationships), animate edges. Auto-layout on schema change; nodes draggable.
- No game mechanics in this phase.
- **Acceptance:** editor highlights + autocompletes real schema names; schema graph renders nodes/edges and updates as tables are created; all existing flows (run, test run, error display, hints, step advance) still work.

### Phase 2 — Game Loop
- Extend `useProgressStore` with XP, level, streak, combo, no-hint tracking, and unlocked achievements — persisted to localStorage. Migrate/initialize existing persisted state safely.
- Add UI: XP bar + level indicator + streak flame in the header; achievement unlock toasts (extend or complement `SuccessToast`).
- Track whether hints were used per step to drive the no-hint bonus.
- Add the **"Why it works"** reveal card on successful solve (content keyed off `conceptFocus`).
- **Acceptance:** solving grants XP and can level up; no-hint solves score higher and build combo; daily streak increments correctly across days; badges unlock and toast; all persisted across reload.

### Phase 3 — Experimental UI + Juice
- Add **Aceternity/Magic UI** effects: aurora/spotlight background on `MissionSelection`, text-generate effect for `narrativeBriefing`, animated beams on the path/journey map, meteor shower on level-up.
- Add **canvas-confetti** for milestone/solve celebrations and **Tone.js** for success/level-up/streak sounds, with a combo arpeggio that rises with the multiplier. Include a mute toggle.
- **Acceptance:** backgrounds and briefing animations render smoothly; particles and sound fire on solve/level-up/combo; mute works; no performance jank.

### Phase 4 — Stretch (domain richness)
- **visx/Recharts**: detect numeric/time-series result shapes and auto-render a chart beside the diff table.
- **Rive/Lottie mascot**: a guide reacting to idle / thinking / celebrate / error states.
- Optional **smart error coaching**: produce a targeted nudge from the user's failed query.
- **Acceptance:** charts render for appropriate result sets; mascot reacts to states; (if built) error coaching gives relevant nudges.

## 5. Architecture & Boundaries

- **SQL engine (`useSqlEngine`)** stays the source of truth for DB state and validation. New UI reads from it; it is not rewritten.
- **Editor** is an isolated component exposing the same interface as today's `SqlTerminal` so the rest of the app is unaffected.
- **Schema graph** is a pure function of the live `db` → derive nodes/edges; no engine changes.
- **Game state** lives entirely in the Zustand store, persisted to localStorage, decoupled from rendering. UI subscribes to it.
- **Juice (sound/particles)** is a side-effect layer triggered by store/engine events, fully removable and behind a mute toggle.
- Each phase keeps files focused; if a component grows too large (e.g. `App.tsx` header), extract sub-components.

## 6. Out of Scope

- No backend, accounts, or global leaderboards (stays local-first).
- No multiplayer.
- No change to the SQL validation pipeline or domain JSON schema.
- Smart error coaching is best-effort/optional within Phase 4.

## 7. Completion Ritual (every phase)

1. `npm run build` clean.
2. `npm run lint` clean.
3. Verify live in browser preview.
4. Commit to git.
5. Report: "✅ Phase N complete → what changed → next: Phase N+1".
