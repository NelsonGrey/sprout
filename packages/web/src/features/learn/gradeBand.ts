import type { LessonBand } from '@sprout/shared';

/** Maps a student's free-text `gradeLevel` (school-entered, unenforced —
 * see @sprout/shared's School.enabledGrades comment) to a lesson band, so
 * `/app/learn` can offer "Start mission" only when a lesson is actually
 * within a student's own band (01_EXPERIENCE_FOUNDATIONS.md §5.3 / the
 * LEARN-01 spec), never from a self-reported age. Returns undefined for
 * anything unrecognized — callers must treat that the same as "not in
 * band" (fail closed to "ask an adult"), not assume access. */
export function gradeLevelToBand(gradeLevel: string | undefined): LessonBand | undefined {
  if (!gradeLevel) return undefined;
  const normalized = gradeLevel.trim().toLowerCase().replace(/^grade\s*/, '');

  if (['pk', 'pre-k', 'prek', 'k', 'kindergarten'].includes(normalized)) {
    return 'Pre-K–K';
  }
  if (['1', '2'].includes(normalized)) return 'Grades 1–2';
  if (['3', '4'].includes(normalized)) return 'Grades 3–4';
  if (['5', '6'].includes(normalized)) return 'Grades 5–6';
  return undefined;
}
