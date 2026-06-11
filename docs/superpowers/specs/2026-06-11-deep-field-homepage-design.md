# Deep Field — unified homepage + full per-world re-theme

Approved 2026-06-11. Replaces the Landing/MissionSelection split with one homepage
and extends each track's identity ("world") through every in-app surface.

## Decisions (user-confirmed)

1. **One page does both** — landing and mission selection merge; no `tuples_entered` gate.
2. **Vibe: Deep Field** — cinematic; each track is a world with its own light.
3. **Structure: Triptych** — three living world panels fill the first viewport.
4. **Proof section: real SQL** — lazy-loaded sql.js playground on the homepage.
5. **Scope: full re-theme** — world accents flow through all in-app surfaces.

## World identity system

| World | Track | Domain id | Accent | Panel bg |
|---|---|---|---|---|
| The Lab | Builder | clinical-trials-research | `#5DCAA5` | `#081009` |
| The Floor | Analyst | algorithmic-trading | `#8FB6FF` | `#0A0D18` |
| The Belt | Optimizer | space-logistics | `#FFB454` | `#120D06` |

- `src/lib/worlds.ts`: `{ id, domainId, name, role, epithet, accent, accentDim }` + lookup by domainId.
- CSS custom properties in `index.css`: `[data-world="lab|floor|belt"]` sets
  `--world-accent`, `--world-accent-soft` (10–15% alpha fills), `--world-border`,
  `--world-bg`. Components consume via Tailwind arbitrary values
  (`text-(--world-accent)` etc.).
- Volt `#C8FF3D` remains brand-only: logo, XP, demo cursor.
- Phase colors (Novice→Capstone) unchanged — the cross-world progression language.

## Homepage (`src/components/home/Home.tsx`)

Rendered whenever `activeDomainId` is null. `Landing/`, `MissionSelection.tsx`,
and the `tuples_entered` localStorage logic are deleted.

- **Act 1 — Triptych (100vh):** three vertical panels (buttons), each with an
  ambient canvas atmosphere tinted per world. Hover/focus widens the panel
  (flex-grow transition) and brightens it; siblings dim. Panel content: index,
  world name, role, epithet, step count, progress bar, Continue/Enter/Certified
  state from the store. Center overlay: "Every world runs on a database." +
  sub-line + scroll cue. Mobile: panels stack vertically.
- **Act 2 — Proof:** copy left, terminal right. Real sql.js seeded with a small
  `worlds`/`concepts` demo dataset; loads via IntersectionObserver when the
  section approaches the viewport. Preset query chips + free input + results
  table. Errors render like the in-app terminal.
- **Act 3 — Method:** three cards — hidden test datasets, real query plans,
  certification exams — plus a 140 steps / 3 worlds / 0 servers stat strip.
- **Act 4 — Closing CTA:** compact world row repeating the choice.
- Motion: GSAP (lazy chunk) for hero reveal + scroll triggers;
  `prefers-reduced-motion` renders everything static.

## Atmosphere component

`src/components/home/Atmosphere.tsx`: 2D canvas drifting particle field
(~100 lines). Props: `tint`, `density`, `dim`. devicePixelRatio-aware, pauses
when offscreen (IntersectionObserver) and under reduced motion. Replaces the
three.js `ReactiveBackground` (≈240 kB lazy chunk), which is deleted along with
its R3F/three dependencies if nothing else imports them.

## Full re-theme (in-app)

Workspace root gets `data-world={world.id}`. Replace hardcoded indigo/violet
accents with world tokens in: App header (mission name chip, progress bar,
step badge), PathVisualizer (active step), SqlTerminal (Submit button, hint
accents stay amber), SuccessToast, GameStatus accents, ExamPanel (start/cta),
narrative "Mission Briefing" chip. A dim Atmosphere renders behind the bento
workspace. Semantic colors (error red, fix/optimize/open badges, emerald
checkmarks) unchanged.

## Performance & gates

- Critical path budget 420 kB unchanged; GSAP and sql.js stay out of it.
- Deleting three.js should improve Lighthouse performance.
- Gates: lint, tsc, vitest (incl. curriculum integrity), Playwright e2e,
  build, `npm run size`, Lighthouse. No push until user reviews localhost.

## Testing

Playwright rewritten: (1) homepage → enter The Lab → solve step 0 → reload
persists; (2) proof playground loads lazily and runs a preset query;
(3) error-coaching test adapted to new entry flow. Unit/integrity tests
untouched.

## Implementation order

1. worlds.ts + CSS tokens
2. Atmosphere component
3. Home.tsx (acts 1–4) + deletions + App routing
4. In-app re-theme
5. e2e rewrite + all gates
