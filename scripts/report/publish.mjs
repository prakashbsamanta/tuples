#!/usr/bin/env node
// Publishes the collected run record into the ci-reports branch checkout.
//
//   node scripts/report/publish.mjs <ci-reports-checkout-dir>
//
// Layout on the ci-reports branch:
//   data/index.json        — array of run summaries, newest first
//   data/runs/<id>/*.json  — granular per-run details (vitest, playwright, …)
//
// Retention: entries (and their detail dirs) older than RETENTION_DAYS are
// pruned on every publish, so the dashboard always serves a rolling window.

import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const RETENTION_DAYS = 183; // ~6 months
const MAX_RUNS = 1500; // hard cap as a safety net

const dest = process.argv[2];
if (!dest) {
  console.error('usage: publish.mjs <ci-reports-checkout-dir>');
  process.exit(1);
}

const record = JSON.parse(readFileSync('reports/run.json', 'utf8'));
const dataDir = join(dest, 'data');
const runsDir = join(dataDir, 'runs');
mkdirSync(runsDir, { recursive: true });

// Copy granular detail files for this run.
const runDir = join(runsDir, record.id);
mkdirSync(runDir, { recursive: true });
for (const f of ['vitest.json', 'playwright.json', 'lighthouse.json', 'size.json', 'coverage.json']) {
  const src = join('reports', f);
  if (existsSync(src)) cpSync(src, join(runDir, f));
}

// Update the index: prepend, dedupe by id, prune by age and count.
const indexPath = join(dataDir, 'index.json');
const index = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : [];
const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

const merged = [record, ...index.filter((r) => r.id !== record.id)]
  .filter((r) => new Date(r.timestamp).getTime() >= cutoff)
  .slice(0, MAX_RUNS);

// Remove detail dirs for pruned entries.
const keep = new Set(merged.map((r) => r.id));
for (const r of index) {
  if (!keep.has(r.id)) rmSync(join(runsDir, r.id), { recursive: true, force: true });
}

writeFileSync(indexPath, JSON.stringify(merged, null, 1));
writeFileSync(
  join(dataDir, 'meta.json'),
  JSON.stringify({ updatedAt: new Date().toISOString(), retentionDays: RETENTION_DAYS, runs: merged.length }, null, 2)
);
console.log(`Published ${record.id} — index now holds ${merged.length} run(s) within ${RETENTION_DAYS} days.`);
