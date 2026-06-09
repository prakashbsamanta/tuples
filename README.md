# Tuples — Interactive SQL Learning Platform

> Master SQL by building real production databases from scratch — 35 progressive steps per mission.

[![CI](https://github.com/prakashbsamanta/tuples/actions/workflows/ci.yml/badge.svg)](https://github.com/prakashbsamanta/tuples/actions/workflows/ci.yml)
[![Deploy](https://github.com/prakashbsamanta/tuples/actions/workflows/deploy.yml/badge.svg)](https://github.com/prakashbsamanta/tuples/actions/workflows/deploy.yml)
[![CodeQL](https://github.com/prakashbsamanta/tuples/actions/workflows/codeql.yml/badge.svg)](https://github.com/prakashbsamanta/tuples/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/prakashbsamanta/tuples/badge)](https://scorecard.dev/viewer/?uri=github.com/prakashbsamanta/tuples)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**🚀 Live:** https://prakashbsamanta.github.io/tuples/

> **Contributing & DevOps:** see [`CONTRIBUTING.md`](CONTRIBUTING.md) for the branch/PR workflow and [`docs/devops/PIPELINE.md`](docs/devops/PIPELINE.md) for a full walkthrough of the CI/CD and security pipeline.

## What is Tuples?

Tuples is a local-first, browser-based SQL learning platform where you pick a real-world domain and progressively build a fully functional relational database, step by step. Every mission takes you from `CREATE TABLE` through advanced window functions — no sign-up, no server, no data leaving your browser.

The entire SQL runtime runs inside a **WebAssembly-powered SQLite engine** in your browser tab. Your progress is saved locally via `localStorage`.

---

## Features

- **3 Mission Domains** — Clinical Trials, Algorithmic Trading, Space Logistics
- **35 Steps per Mission** — structured across three skill phases: Novice → Operator → Architect
- **In-browser SQLite** — powered by `sql.js` (WebAssembly), zero backend required
- **3-Tier Hint System** — concept explanation → structural scaffold → full solution unlock
- **Live Schema Visualizer** — real-time ER diagram as you build the database
- **Result Diff Table** — shows query output side-by-side with expected results
- **Progress Persistence** — saved to `localStorage`, survives page refreshes
- **Mission Review Mode** — revisit any completed step and your saved query

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18.3.1 |
| Language | TypeScript 5.4.5 |
| Build Tool | Vite 5.4.11 |
| Styles | Tailwind CSS 3.4.15 |
| SQL Engine | sql.js 1.10.3 (SQLite WASM) |
| Animation | Framer Motion 11.11.11 |
| Icons | Lucide React 0.460.0 |
| State | Zustand 5.x (persisted to localStorage) |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Project Structure

```
tuples/
├── public/
│   └── passenger-wasm/
│       └── sql-wasm.wasm        # SQLite WebAssembly binary
├── src/
│   ├── components/
│   │   ├── BentoLayout.tsx      # Main responsive grid layout
│   │   ├── LiveDiffTable.tsx    # Query result display
│   │   ├── MissionSelection.tsx # Domain picker / home screen
│   │   ├── PathVisualizer.tsx   # Step progress map
│   │   ├── ReviewPanel.tsx      # Completed step review
│   │   ├── SchemaVisualizer.tsx # Live ER diagram
│   │   ├── SqlTerminal.tsx      # SQL input terminal
│   │   └── SuccessToast.tsx     # Step completion toast
│   ├── domains/
│   │   ├── index.ts             # Domain registry
│   │   ├── clinical_trials.json
│   │   ├── algorithmic_trading.json
│   │   └── space_logistics.json
│   ├── hooks/
│   │   └── useSqlEngine.ts      # WebAssembly SQL engine lifecycle
│   ├── store/
│   │   └── useProgressStore.ts  # Zustand progress store (persisted)
│   ├── App.tsx
│   └── main.tsx
├── docs/
│   ├── PRD_QUERYCORE_ARCHITECTURE.md   # Product requirements document
│   └── CORE_ENGINE_SQL_SCHEMA.md       # Domain JSON schema specification
├── index.html
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

---

## Adding a New Mission Domain

1. Create a new JSON file in `src/domains/` following the schema in [`docs/CORE_ENGINE_SQL_SCHEMA.md`](docs/CORE_ENGINE_SQL_SCHEMA.md).
2. Import and register it in `src/domains/index.ts`.
3. Add an icon config entry in `src/components/MissionSelection.tsx`.

Each domain file must define exactly **35 steps**, each with:
- `stepIndex`, `phase` (Novice/Operator/Architect), `conceptFocus`
- `narrativeBriefing` — the mission story context
- `hints` — three tiers (concept → scaffold → solution)
- `validationType` — `OUTPUT_MATCH`, `SCHEMA_VERIFY`, or `ROW_COUNT_VERIFY`
- `verificationQuery` + `expectedResult` — how the engine checks correctness

---

## Validation Pipeline

When a user submits a query, it passes through three stages:

```
[User Input]
     │
     ▼
Stage 1: Token / Regex Screening    (optional keyword enforcement)
     │
     ▼
Stage 2: Execution in WASM SQLite   (syntax + runtime check, rolled back on error)
     │
     ▼
Stage 3: State Verification         (runs verificationQuery, compares to expectedResult)
     │
     ▼
[Unlock Next Step]
```

Failures at any stage restore the database to its pre-query snapshot — the user's progress is never corrupted.

---

## Mission Domains

### Clinical Trials Tracking & Analytics Platform
Build an enterprise medical research database: patient registries, dosage logs, adverse event tracking, and trial analytics.

### Algorithmic Trading Intelligence System
Build a market data backend: asset universe, price ticks, portfolio positions, order book, and trading signal analytics.

### Space Logistics Operations Platform
Build an interplanetary logistics database: mission manifests, cargo tracking, launch windows, crew assignments, and telemetry.

---

## License

MIT
