#!/usr/bin/env node
// Generates packages/mobile's bundled lesson-content asset from this
// package's canonical, schema-validated TS source (./src/content/lessons.ts)
// — see 05_IMPLEMENTATION_HANDOFF.md's Slice 3 step 1: avoid hand-duplicating
// the eight lesson bodies in Dart. Run after `npm run build` (needs
// ./dist/content/lessons.js); re-run whenever lesson content changes.
// packages/shared/src/content/lessons.test.ts fails if this drifts.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { lessons } from '../dist/content/lessons.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(
  __dirname,
  '..',
  '..',
  'mobile',
  'assets',
  'content',
  'lessons.json'
);

writeFileSync(outPath, JSON.stringify(lessons, null, 2) + '\n');
console.log(`Generated ${lessons.length} lessons -> ${outPath}`);
