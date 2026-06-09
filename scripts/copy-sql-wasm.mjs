#!/usr/bin/env node
// Copies the sql.js WebAssembly binaries from the *installed* package into
// public/passenger-wasm/, so the served .wasm always matches the installed
// sql.js version. Runs automatically via the `predev` / `prebuild` scripts.
//
// Why this exists: sql.js renamed its wasm (sql-wasm.wasm -> sql-wasm-browser.wasm)
// across a major bump. A hand-committed wasm silently went stale on upgrade and
// 404'd at runtime ("Engine init failed: ...wasm failed"). Generating from
// node_modules removes that whole class of bug.

import { mkdirSync, copyFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'node_modules', 'sql.js', 'dist');
const destDir = join(root, 'public', 'passenger-wasm');

if (!existsSync(srcDir)) {
  console.error('[copy-sql-wasm] sql.js not installed — run npm install first.');
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });

// Copy every non-debug .wasm sql.js ships (sql-wasm.wasm, sql-wasm-browser.wasm).
// locateFile() in useSqlEngine.ts requests whichever name the loader needs.
const wasmFiles = readdirSync(srcDir).filter(
  (f) => f.endsWith('.wasm') && !f.includes('debug'),
);

if (wasmFiles.length === 0) {
  console.error('[copy-sql-wasm] no .wasm files found in', srcDir);
  process.exit(1);
}

for (const f of wasmFiles) {
  copyFileSync(join(srcDir, f), join(destDir, f));
  console.log(`[copy-sql-wasm] ${f}`);
}
