import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { lessons, getLesson } from './lessons.js';
import { LessonsSchema } from './lessonSchema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('lessons', () => {
  it('validates against the canonical schema', () => {
    expect(() => LessonsSchema.parse(lessons)).not.toThrow();
  });

  it('has eight starter lessons with unique slugs', () => {
    expect(lessons).toHaveLength(8);
    expect(new Set(lessons.map(l => l.slug)).size).toBe(8);
  });

  it('carries an inclusion note and standards note on every lesson', () => {
    for (const lesson of lessons) {
      expect(lesson.inclusionNote, lesson.slug).toBeTruthy();
      expect(lesson.standardsNote, lesson.slug).toBeTruthy();
    }
  });

  it('resolves a lesson by slug', () => {
    expect(getLesson('the-waiting-garden')?.title).toBe('The Waiting Garden');
    expect(getLesson('not-a-real-slug')).toBeUndefined();
    expect(getLesson(undefined)).toBeUndefined();
  });

  // packages/mobile can't import this TS module directly, so it bundles a
  // generated JSON asset instead (see scripts/generate-mobile-content.mjs).
  // This test is the drift guard the handoff doc requires: if someone edits
  // a lesson here and forgets to regenerate mobile's copy, this fails.
  it('matches the generated mobile content asset (run `npm run generate:mobile-content -w @sprout/shared` if this fails)', () => {
    const assetPath = join(
      __dirname,
      '..',
      '..',
      '..',
      'mobile',
      'assets',
      'content',
      'lessons.json'
    );
    const assetJson = JSON.parse(readFileSync(assetPath, 'utf-8'));
    expect(assetJson).toEqual(JSON.parse(JSON.stringify(lessons)));
  });
});
