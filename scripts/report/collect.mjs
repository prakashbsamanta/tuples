#!/usr/bin/env node
// Assembles a single CI run record from the machine-readable outputs of every
// quality gate (vitest JSON, coverage summary, Playwright JSON, bundle-size
// JSON, Lighthouse JSON) plus GitHub Actions environment metadata.
//
// Outputs (all under reports/):
//   run.json        — the summary record appended to the dashboard index
//   vitest.json     — granular unit+integration results (pass-through)
//   playwright.json — granular e2e results (pass-through)
//   lighthouse.json — trimmed Lighthouse result (scores + key metrics + audits)
//   size.json       — bundle breakdown (pass-through)
//   coverage.json   — coverage summary (pass-through)
//
// Suites taxonomy: vitest files matching *.integrity.test.ts or missionDb are
// "integration" (they exercise the real seed/replay/validation pipeline);
// every other vitest file is "unit"; Playwright is "e2e".

import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync } from 'node:fs';

const read = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const INTEGRATION_FILE = /(integrity|missionDb)\.test\.ts$/;

mkdirSync('reports', { recursive: true });

// ── GitHub context ─────────────────────────────────────────────────────
const env = process.env;
const isPR = env.GITHUB_EVENT_NAME === 'pull_request';
const event = read(env.GITHUB_EVENT_PATH) ?? {};
const sha = isPR ? (event.pull_request?.head?.sha ?? env.GITHUB_SHA) : env.GITHUB_SHA;
const server = env.GITHUB_SERVER_URL ?? 'https://github.com';
const repo = env.GITHUB_REPOSITORY ?? 'unknown/unknown';
const runId = env.GITHUB_RUN_ID ?? String(Date.now());
const now = new Date();
const id = `${now.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z-${(sha ?? 'local').slice(0, 7)}-${runId}`;

// ── Vitest: split unit vs integration, keep per-test granularity ──────
const vitest = read('reports/vitest.json');
function vitestSuite(filter) {
  const empty = { total: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0, files: 0 };
  if (!vitest) return empty;
  const out = { ...empty };
  for (const file of vitest.testResults ?? []) {
    if (!filter(file.name)) continue;
    out.files += 1;
    out.durationMs += Math.max(0, (file.endTime ?? 0) - (file.startTime ?? 0));
    for (const t of file.assertionResults ?? []) {
      out.total += 1;
      if (t.status === 'passed') out.passed += 1;
      else if (t.status === 'failed') out.failed += 1;
      else out.skipped += 1;
    }
  }
  return out;
}
const unit = vitestSuite((f) => !INTEGRATION_FILE.test(f));
const integration = vitestSuite((f) => INTEGRATION_FILE.test(f));

// ── Playwright e2e ─────────────────────────────────────────────────────
const pw = read('reports/playwright.json');
let e2e = { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0, durationMs: 0 };
if (pw?.stats) {
  e2e = {
    total: (pw.stats.expected ?? 0) + (pw.stats.unexpected ?? 0) + (pw.stats.skipped ?? 0) + (pw.stats.flaky ?? 0),
    passed: pw.stats.expected ?? 0,
    failed: pw.stats.unexpected ?? 0,
    skipped: pw.stats.skipped ?? 0,
    flaky: pw.stats.flaky ?? 0,
    durationMs: Math.round(pw.stats.duration ?? 0),
  };
}

// ── Coverage ───────────────────────────────────────────────────────────
const covSummary = read('coverage/coverage-summary.json');
const cov = covSummary?.total
  ? {
      lines: covSummary.total.lines.pct,
      statements: covSummary.total.statements.pct,
      functions: covSummary.total.functions.pct,
      branches: covSummary.total.branches.pct,
    }
  : null;
if (covSummary) writeFileSync('reports/coverage.json', JSON.stringify(covSummary));

// ── Bundle size ────────────────────────────────────────────────────────
const size = read('reports/size.json');

// ── Lighthouse: trim the multi-MB LHR down to what the dashboard shows ─
const lhr = read('reports/lighthouse-full.json');
let lighthouse = null;
if (lhr?.categories) {
  const a = lhr.audits ?? {};
  lighthouse = {
    performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
    accessibility: Math.round((lhr.categories.accessibility?.score ?? 0) * 100),
    bestPractices: Math.round((lhr.categories['best-practices']?.score ?? 0) * 100),
    fcpMs: Math.round(a['first-contentful-paint']?.numericValue ?? 0),
    lcpMs: Math.round(a['largest-contentful-paint']?.numericValue ?? 0),
    tbtMs: Math.round(a['total-blocking-time']?.numericValue ?? 0),
    cls: Number((a['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3)),
    speedIndexMs: Math.round(a['speed-index']?.numericValue ?? 0),
  };
  writeFileSync('reports/lighthouse.json', JSON.stringify({ fetchTime: lhr.fetchTime, ...lighthouse }, null, 2));
}

// ── Run record ─────────────────────────────────────────────────────────
const failedTotal = unit.failed + integration.failed + e2e.failed;
const record = {
  id,
  runId,
  runNumber: Number(env.GITHUB_RUN_NUMBER ?? 0),
  runUrl: `${server}/${repo}/actions/runs/${runId}`,
  context: isPR ? 'pr' : 'production',
  pr: isPR
    ? {
        number: event.pull_request?.number ?? null,
        title: event.pull_request?.title ?? null,
        url: event.pull_request?.html_url ?? null,
      }
    : null,
  branch: isPR ? (event.pull_request?.head?.ref ?? '') : (env.GITHUB_REF_NAME ?? ''),
  sha,
  shortSha: (sha ?? '').slice(0, 7),
  commitUrl: `${server}/${repo}/commit/${sha}`,
  timestamp: now.toISOString(),
  status: failedTotal === 0 ? 'passed' : 'failed',
  suites: { unit, integration, e2e },
  coverage: cov,
  bundle: size ? { criticalKb: size.criticalKb, budgetKb: size.budgetKb } : null,
  lighthouse,
  details: {
    vitest: `runs/${id}/vitest.json`,
    playwright: `runs/${id}/playwright.json`,
    lighthouse: lighthouse ? `runs/${id}/lighthouse.json` : null,
    size: size ? `runs/${id}/size.json` : null,
    coverage: cov ? `runs/${id}/coverage.json` : null,
  },
};

writeFileSync('reports/run.json', JSON.stringify(record, null, 2));
console.log(`Collected run record ${id}`);
console.log(JSON.stringify({ status: record.status, unit, integration, e2e, coverage: cov, bundle: record.bundle, lighthouse }, null, 2));
