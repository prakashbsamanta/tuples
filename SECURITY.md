# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Instead, report privately via GitHub's **Security → Advisories → "Report a
vulnerability"** (Private Vulnerability Reporting is enabled on this repo), or
email the maintainer at **prakashbsamanta@gmail.com**.

You can expect an initial acknowledgement within a few days. Once a fix is
ready it will be released and you'll be credited (unless you prefer to remain
anonymous).

## Supported versions

This is a continuously-deployed web app — only the version currently live on
the `main` branch (and the GitHub Pages site) is supported. There are no
long-lived release branches to patch.

## How this project protects itself

- **Branch protection** — `main` is protected; all changes land via reviewed PRs that pass CI.
- **CodeQL** static analysis on every PR and weekly.
- **Dependency Review** blocks PRs that introduce known-vulnerable packages.
- **Dependabot** opens PRs to patch vulnerable dependencies and outdated Actions.
- **OpenSSF Scorecard** continuously audits the repo's security posture.
- **Pinned GitHub Actions** (by commit SHA) to defend against supply-chain attacks.
- **Least-privilege workflow tokens** (`permissions:` scoped per workflow/job).
- **Secret scanning + push protection** prevent credentials from being committed.

There is no backend and no server-side secrets: the app is a fully static SPA
running SQLite (via WebAssembly) entirely in the user's browser.
