# Tuples "Kinetic" Redesign — Design Spec

**Date:** 2026-06-10 · **Branch:** `feat/kinetic-redesign` · **Status:** Approved by owner

## Goal

Modernize Tuples into an award-grade, kinetic-but-sleek product: full visual redesign,
animated landing page, and a current-generation stack — while staying bug-free,
within the existing performance budgets, and production-grade.

## Decisions (owner-approved)

| Topic | Decision |
|---|---|
| Scope | Visual redesign **and** stack upgrade |
| Direction | Kinetic/awwwards bold (GSAP choreography), still compact and sleek |
| Landing | Yes — animated landing before mission selection |
| Animation | Keep Framer Motion 12 for UI state; add GSAP only for landing choreography |
| Performance | Keep 420 kB critical-path budget + Lighthouse gates; lazy-load landing/GSAP |
| Gamification | Keep XP/achievements; restyle mascot (geometric glyph), confetti → success pulse + XP count-up |
| Verification | Add Playwright; one compact smoke spec covering the full happy path |

## 1. Stack modernization

- React 19 + ReactDOM 19 (+ @types), `@react-three/fiber` v9 (React 19 requirement),
  latest compatible three / lucide-react / zustand / @xyflow/react / recharts.
- Tailwind CSS 4: CSS-first config via `@tailwindcss/vite`; remove
  `tailwind.config.js` + PostCSS setup.
- GSAP (core + ScrollTrigger) lazy-loaded inside the landing chunk only.
- Vite 7 / Vitest 4 / ESLint 9 stay. Bundle budget script and `lighthouserc.json` unchanged.

## 2. Landing page (lazy chunk)

Single scroll page rendered before mission selection:

- **Hero:** oversized kinetic display type with a self-typing SQL query that
  materializes a live result grid — the product is the hero animation.
- **Scroll choreography (ScrollTrigger):** mission-domain panels reveal, then the
  Novice → Operator → Architect progression as an animated path, ending in a CTA
  that transitions into mission selection.
- Skippable instantly; users with existing progress land directly on missions.
- `prefers-reduced-motion` disables choreography (content still fully accessible).

## 3. Visual system

- **Type:** Space Grotesk (display) + JetBrains Mono (code/UI-mono), self-hosted
  subset woff2.
- **Palette:** near-black canvas, one signature electric accent, grain/noise
  texture, hairline borders. Domains keep emerald/indigo/amber identities.
- **Workspace:** keep the proven resizable bento structure; restyle chrome,
  micro-interactions, animated mission-enter transition.
- **Gamification:** mascot → minimal geometric glyph; confetti → success pulse +
  XP count-up; typewriter briefing kept but tightened.

## 4. Production hardening & verification

- Green gates throughout: `eslint`, `tsc -b`, 7 vitest suites, `vite build`,
  bundle-size budget, Lighthouse local run.
- **Playwright smoke spec (~5 tests):** landing renders → enter mission →
  execute real SQL for step 1 on the WASM engine → success/XP shown →
  progress survives reload → review mode opens.
- Manual browser sweep on localhost before PR.

## Out of scope

New curriculum content, backend/services, auth, mobile-native work.
