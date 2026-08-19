import { describe, expect, it } from 'vitest';
import { audiences, getLesson, gradeBands, lessons } from './content';
import { isMarketingPath } from './marketingPaths';

describe('marketing content', () => {
  it('covers every stakeholder path', () => {
    expect(audiences.map(audience => audience.slug)).toEqual([
      'districts',
      'schools',
      'educators',
      'families',
      'students',
    ]);
    expect(audiences.every(audience => audience.outcomes.length === 3)).toBe(
      true
    );
    expect(audiences.every(audience => audience.questions.length === 3)).toBe(
      true
    );
  });

  it('ships at least one complete lesson for every active grade band', () => {
    for (const band of gradeBands.slice(1)) {
      expect(lessons.some(lesson => lesson.band === band)).toBe(true);
    }

    for (const lesson of lessons) {
      expect(lesson.mission.length).toBeGreaterThanOrEqual(3);
      expect(lesson.reflect.length).toBeGreaterThanOrEqual(3);
      expect(lesson.familyBridge.length).toBeGreaterThan(20);
      expect(lesson.inclusionNote.length).toBeGreaterThan(20);
      expect(getLesson(lesson.slug)).toBe(lesson);
    }
  });
});

describe('marketing route boundaries', () => {
  it('uses the root route for marketing only when signed out', () => {
    expect(isMarketingPath('/', false)).toBe(true);
    expect(isMarketingPath('/', true)).toBe(false);
  });

  it('keeps public content available to signed-in and signed-out visitors', () => {
    expect(isMarketingPath('/districts', false)).toBe(true);
    expect(isMarketingPath('/curriculum/goal-trail', true)).toBe(true);
    expect(isMarketingPath('/classrooms/class-1', false)).toBe(false);
  });
});
