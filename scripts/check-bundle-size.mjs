#!/usr/bin/env node
// Bundle-size budget guard. Computes the gzipped size of the *critical path*
// (the entry script + everything index.html preloads) and fails if it exceeds
// the budget. Lazy chunks (3D background, charts, sound, editor) are excluded
// because they don't block first paint. Run after `npm run build`.
//
// Prints a per-build report so every CI run shows the current numbers.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const DIST = 'dist';
const ASSETS = join(DIST, 'assets');

// Budget for the initial (render-blocking) JavaScript, gzipped.
const BUDGET_KB = 420;

function gzKb(file) {
  return gzipSync(readFileSync(file)).length / 1024;
}

const html = readFileSync(join(DIST, 'index.html'), 'utf8');

// Critical path = entry <script type=module src> + every modulepreload link.
const critical = new Set();
for (const m of html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)) critical.add(m[1]);
for (const m of html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+\.js)"/g)) critical.add(m[1]);

const toPath = (href) => join(DIST, href.replace(/^\/tuples\//, '').replace(/^\//, ''));

let criticalKb = 0;
const rows = [];
for (const href of critical) {
  const kb = gzKb(toPath(href));
  criticalKb += kb;
  rows.push([href.split('/').pop(), kb]);
}

// Also report lazy JS chunks (informational — not counted against the budget).
const allJs = readdirSync(ASSETS).filter((f) => f.endsWith('.js'));
const criticalNames = new Set([...critical].map((h) => h.split('/').pop()));
const lazy = allJs
  .filter((f) => !criticalNames.has(f))
  .map((f) => [f, gzKb(join(ASSETS, f))]);

const fmt = (kb) => `${kb.toFixed(1)} kB`;
const pad = (s, n) => String(s).padEnd(n);

console.log('\n📦 Bundle report (gzipped)\n');
console.log('  Critical path (blocks first paint):');
for (const [name, kb] of rows.sort((a, b) => b[1] - a[1])) console.log(`    ${pad(name, 34)} ${fmt(kb)}`);
console.log(`    ${pad('— total critical —', 34)} ${fmt(criticalKb)}  (budget ${BUDGET_KB} kB)`);
console.log('\n  Lazy chunks (loaded on demand, not budgeted):');
for (const [name, kb] of lazy.sort((a, b) => b[1] - a[1])) console.log(`    ${pad(name, 34)} ${fmt(kb)}`);

const headroom = BUDGET_KB - criticalKb;
console.log('');
if (criticalKb > BUDGET_KB) {
  console.error(`❌ Critical-path bundle ${fmt(criticalKb)} exceeds budget ${BUDGET_KB} kB by ${fmt(-headroom)}.`);
  console.error('   Reduce initial JS (lazy-load a dependency) or, if justified, raise BUDGET_KB in scripts/check-bundle-size.mjs.');
  process.exit(1);
}
console.log(`✅ Critical-path bundle ${fmt(criticalKb)} is within budget (${fmt(headroom)} headroom).\n`);
