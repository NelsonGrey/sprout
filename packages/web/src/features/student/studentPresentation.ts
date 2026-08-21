import type { Student } from '@sprout/shared';
import { gradeLevelToBand } from '../learn/gradeBand';

/** Whether a student sees the collapsed, early-reader `Today` presentation
 * (short copy, icon+text, optional read-aloud, one scrollable view) rather
 * than the standard four-destination Today/History/Goals/Learn nav — see
 * 01_EXPERIENCE_FOUNDATIONS.md §5.2: "Pre-K–2 may collapse these into one
 * scrollable Today view." Derived from the student's own roster
 * `gradeLevel` (staff-authorized), never a self-reported age — see
 * gradeBand.ts. An unresolvable grade level fails closed to the *standard*
 * presentation (the fuller, more capable one), not the simplified one —
 * unlike Learn's "ask an adult" fail-closed, hiding functionality here has
 * no safety upside and would just make the app harder to use for a
 * student whose grade level wasn't recorded correctly. */
export function isEarlyReaderPresentation(student: Pick<Student, 'gradeLevel'>): boolean {
  const band = gradeLevelToBand(student.gradeLevel);
  return band === 'Pre-K–K' || band === 'Grades 1–2';
}
