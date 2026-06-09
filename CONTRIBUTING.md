# Contributing to Tuples

Thanks for helping improve Tuples! This guide covers the day-to-day workflow.
For the *why* behind the pipeline, see [`docs/devops/PIPELINE.md`](docs/devops/PIPELINE.md).

## TL;DR

```bash
git switch -c feat/my-change      # 1. branch off main
# …make changes…
npm run lint && npm test && npm run build   # 2. local gates
git commit -m "feat: short description"      # 3. conventional commit
git push -u origin feat/my-change            # 4. push
gh pr create --fill                          # 5. open a PR → CI runs → merge
```

## Branching model (trunk-based)

- **`main` is always deployable.** Every push to `main` auto-deploys to GitHub Pages.
- **No direct commits to `main`.** It's protected — all changes go through a PR.
- **Short-lived feature branches**, named by type:
  - `feat/…` new feature
  - `fix/…` bug fix
  - `docs/…` documentation
  - `chore/…`, `ci/…`, `refactor/…`, `perf/…`, `test/…`

## Commits & PR titles (Conventional Commits)

We use [Conventional Commits](https://www.conventionalcommits.org/). Because PRs
are **squash-merged**, the **PR title** becomes the commit on `main` and is
linted by CI. Format:

```
<type>: <short, imperative description>
```

Examples: `feat: add CSV export`, `fix: results panel empty after solve`,
`docs: explain the deploy workflow`.

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert`.

## Local checks (must pass before pushing)

| Command | What it does |
| --- | --- |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run build` | Type-check (`tsc -b`) + production build |

These are the same gates CI runs, so green locally ≈ green in CI.

## Opening a PR

1. Push your branch and open a PR against `main`.
2. The PR runs: **CI** (lint/test/build), **CodeQL**, **Dependency Review**, and **PR Title Lint**.
3. All required checks must be green to merge.
4. Use **Squash and merge**. The branch auto-deletes after merge.
5. Merging to `main` triggers the **Deploy** workflow → live in ~1–2 minutes.

## Adding tests

Pure logic lives in `src/lib/*.ts` with co-located `*.test.ts` files run by
Vitest. New logic should come with tests. UI is verified at a sanity level in
the browser.

## Reporting bugs / requesting features

Use the issue templates (Bug report / Feature request). Security issues:
follow [`SECURITY.md`](SECURITY.md) — do **not** file them publicly.
