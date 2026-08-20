/** Appends `fromLesson`/`fromStep` query params to a target route, so
 * navigating away from the guided lesson runner to try a real product
 * feature (see lessonActivityLinks.ts) is a genuine deep link, not a dead
 * end — LessonReturnBanner reads these back on whatever page they land on
 * to offer a way back to the exact step. See
 * 05_IMPLEMENTATION_HANDOFF.md's Slice 3 step 4. */
export function withLessonReturn(path: string, lessonSlug: string, step: number): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}fromLesson=${encodeURIComponent(lessonSlug)}&fromStep=${step}`;
}
