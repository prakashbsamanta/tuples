# Tuples — Production Pipeline & DevOps Guide

This document explains, end-to-end, how Tuples goes from a code change on your
laptop to a live, public website — and every quality and security gate in
between. It's written to be **learned from**: each section says *what* the piece
does, *why* it exists, and *how* to operate or change it.

> **Big picture:** Tuples is a static single-page app (React + Vite). SQLite runs
> in the browser via WebAssembly, so there is **no backend and no server-side
> secret**. That makes hosting free and security mostly about the *supply chain*
> (your dependencies and your CI/CD), not about protecting a server.

---

## 1. The lifecycle of a change

```
                feature branch                         main (protected)
  you ───────────────┐                                       │
   │  git switch -c   │                                       │
   │  feat/x          ▼                                       │
   │           ┌────────────┐    open PR     ┌──────────────┐ │
   │  commit ─▶│  PR branch  │ ─────────────▶ │  Pull Request │ │
   │  push     └────────────┘                └──────┬───────┘ │
   │                                                │          │
   │                          ┌─────────────────────▼────────┐ │
   │                          │  Required checks (must pass): │ │
   │                          │   • CI: lint / test / build   │ │
   │                          │   • CodeQL (SAST)             │ │
   │                          │   • Dependency Review         │ │
   │                          │   • PR Title Lint             │ │
   │                          └─────────────────────┬────────┘ │
   │                                                │ squash    │
   │                                                ▼ merge     ▼
   │                                          ┌──────────────────────┐
   │                                          │  push to main         │
   │                                          │  → Deploy workflow    │
   │                                          │  → GitHub Pages (live)│
   │                                          └──────────────────────┘
```

**You never push to `main` directly.** Everything is a PR. Merging is what
ships to production.

---

## 2. Branching model — trunk-based development

- **`main`** is the single source of truth and is **always deployable**. It is
  protected by a ruleset (see §6).
- **Short-lived feature branches** are cut from `main`, named by Conventional
  Commit type: `feat/…`, `fix/…`, `docs/…`, `chore/…`, `ci/…`, `refactor/…`,
  `perf/…`, `test/…`.
- We **squash-merge** so `main` has one clean commit per change and a linear
  history (easy to read, easy to revert, easy to bisect).

Why trunk-based (vs. git-flow with `develop`/`release` branches)? For a
continuously-deployed static site there's nothing to "stage" — there's one
environment (production) and one branch that feeds it. Long-lived branches would
just create merge debt.

---

## 3. Conventional Commits

PR titles must look like `type: description` (e.g. `feat: add CSV export`).
This is enforced by the **PR Title Lint** check. Because we squash-merge, the
PR title becomes the commit message on `main`. Benefits:

- Readable, scannable history.
- Machine-parseable → you can later auto-generate a changelog or derive semantic
  version bumps without changing your workflow.

Allowed types: `feat fix docs style refactor perf test build ci chore revert`.

---

## 4. CI — the quality gate (`.github/workflows/ci.yml`)

Runs on every PR to `main` (and on pushes to `main` as a safety net).

| Step | Command | Catches |
| --- | --- | --- |
| Install | `npm ci` | lockfile drift, non-reproducible installs |
| Lint | `npm run lint` | style / common JS-TS mistakes |
| Test | `npm test` | logic regressions (Vitest) |
| Build | `npm run build` | type errors (`tsc -b`) + broken production build |

Hardening choices in this workflow (these recur in every workflow):

- **`permissions: contents: read`** — least privilege. The default `GITHUB_TOKEN`
  would otherwise be broadly scoped; we grant only what's needed.
- **`concurrency` with `cancel-in-progress`** — if you push twice quickly, the
  older run is cancelled to save minutes.
- **SHA-pinned actions** — see §7.
- **`node-version-file: .nvmrc`** — CI uses the exact Node version (`22` LTS) the repo
  declares, so "works in CI" matches "works locally".

The job is named **`build-test`** — that exact name is what the branch ruleset
marks as a *required* status check.

---

## 5. Deployment — GitHub Pages from Actions (`.github/workflows/deploy.yml`)

We use GitHub's modern Pages flow: the site is published **directly from a build
artifact produced by Actions** — there is no `gh-pages` branch to maintain.

Trigger: **push to `main`** (which only happens via a merged, CI-passed PR) or
manual `workflow_dispatch`.

Two jobs:

1. **build** — checkout → setup Node → `configure-pages` → `npm ci` →
   `npm run build` → `upload-pages-artifact` (uploads `dist/`).
2. **deploy** — consumes the artifact via `deploy-pages` and publishes it. It
   runs in the **`github-pages` environment**, which gives you a deployment URL,
   a history of deploys, and a place to add manual-approval rules later.

Token scopes required by the Pages actions:

- `pages: write` — publish to the Pages service.
- `id-token: write` — OIDC token used to authenticate the deploy (no stored secret).
- `contents: read` — check out the code.

`concurrency: group: pages, cancel-in-progress: false` ensures deploys never
overlap and an in-flight publish is never cancelled half-way.

### The `base` path gotcha

A **project** Pages site is served from a sub-path:
`https://<user>.github.io/tuples/`. So the production build must reference assets
under `/tuples/`. That's why `vite.config.ts` sets:

```ts
base: command === 'build' ? '/tuples/' : '/'
```

Dev stays at `/`; only the production build uses `/tuples/`. If you later add a
**custom domain** or move to a **user/org** page (served at the root), change the
build base back to `'/'`.

---

## 6. Security layers

Defence in depth — multiple independent gates:

| Layer | File / setting | What it does |
| --- | --- | --- |
| **SAST** | `codeql.yml` | CodeQL scans JS/TS for vulnerability patterns; weekly + per-PR. Findings appear under **Security → Code scanning**. |
| **Supply-chain (PR)** | `dependency-review.yml` | Fails a PR that adds a dependency with a known high+ vuln or a denied license (AGPL/GPL-3.0). |
| **Supply-chain (ongoing)** | `dependabot.yml` | Weekly PRs to patch npm packages and bump pinned Actions. |
| **Posture audit** | `scorecard.yml` | OpenSSF Scorecard grades the repo against best practices and explains each gap. |
| **Secret scanning + push protection** | repo setting | Blocks commits that contain credentials; alerts on leaked secrets. |
| **Private vulnerability reporting** | repo setting + `SECURITY.md` | Lets people report issues privately. |
| **Least-privilege tokens** | `permissions:` in every workflow | Minimises blast radius if a workflow is compromised. |
| **Pinned actions** | all workflows | See §7. |
| **Branch protection** | ruleset on `main` | No unreviewed/unverified code reaches production. |

### Branch protection ruleset (on `main`)

- Require a **pull request** before merging.
- Require these **status checks** to pass: `build-test`, `analyze` (CodeQL),
  `dependency-review`.
- Require branches to be **up to date** before merging.
- Require **linear history** (squash/rebase only).
- Require **conversation resolution** before merging.
- Block **force pushes** and **branch deletion**.
- **Required approvals: 0** *for now* (solo). See §8 to raise it to 1 when
  collaborators join.

---

## 7. Why GitHub Actions are pinned to commit SHAs

Every `uses:` references an immutable **commit SHA**, not a moving tag:

```yaml
uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4
```

A tag like `@v4` can be **repointed** by the action's maintainer (or an attacker
who compromises their account) to malicious code — and your CI has access to your
repo. A SHA can't be moved. This is the OpenSSF supply-chain recommendation.

The trade-off (you don't get automatic updates) is solved by **Dependabot's
`github-actions` ecosystem**, which opens PRs that update both the SHA and the
`# v4` comment when a new release ships.

### Build-toolchain version policy

`vite`, `@vitejs/plugin-react`, and `vitest` are **coupled** — they must share
the same Vite major (the test runner builds with the same Vite as the app). To
keep that invariant safe, Dependabot is configured to **ignore *major* bumps**
of these three (see `dependabot.yml`); minor/patch updates still flow normally.

We currently sit on the **Vite 7 line** (Node 22 LTS) — deliberately one major
behind the just-released Vite 8 — for stability. Moving to Vite 8 is a
*manual, atomic* change: bump `vite`, `@vitejs/plugin-react` (→ 6), and confirm
`vitest` supports it, all in one PR, then verify `npm ci` + build + a browser
smoke test before merging.

---

## 8. Operating the pipeline

### Day-to-day

```bash
git switch -c feat/my-change
# …edit…
npm run lint && npm test && npm run build   # same gates as CI
git commit -m "feat: describe the change"
git push -u origin feat/my-change
gh pr create --fill                         # CI + security run automatically
# once green:
gh pr merge --squash --delete-branch        # ships to production
```

### When collaborators join (raise the review bar)

In **Settings → Rules → Rulesets → `main`** (or via API), edit the
*"Require a pull request before merging"* rule:

- set **Required approvals** to `1` (or more),
- enable **Require review from Code Owners** (uses `.github/CODEOWNERS`),
- enable **Dismiss stale approvals when new commits are pushed**.

> Note: with required approvals ≥ 1 you can't approve your own PR, which is why
> it's `0` while you're solo.

### Rolling back a bad deploy

Revert the offending commit on `main` via a PR (`git revert <sha>` → PR → merge).
The merge re-triggers Deploy and ships the reverted state. (You can also re-run an
older successful Deploy from the Actions tab.)

### Where to watch things

- **Actions** tab — CI / Deploy / CodeQL / Scorecard runs.
- **Security** tab — code scanning alerts, Dependabot alerts, secret scanning.
- **Environments → github-pages** — deploy history and the live URL.

---

## 9. Recommended next-level add-ons (optional)

These weren't built yet to keep the core pipeline lean, but they're the natural
"next rung" of maturity:

- **Lighthouse CI** — performance/accessibility/SEO budgets enforced on each PR.
- **Preview deployments per PR** — GitHub Pages doesn't do this natively; if you
  ever want it, Cloudflare Pages / Netlify / Vercel give per-PR preview URLs for
  free (would replace the Pages deploy step).
- **Bundle-size budget** — fail CI if the main JS chunk grows beyond a threshold
  (the app currently ships a large main chunk; see the README's notes).
- **Release automation** — `release-please` to cut tagged releases + changelog
  from the Conventional Commit history.
- **CSP / security headers** — Pages can't set custom headers; a `<meta>` CSP or a
  move to a host that supports headers would harden the runtime.
