import { describe, expect, it } from 'vitest';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { studentFromDoc } from './firestore';

function fakeSnapshot(data: DocumentData): QueryDocumentSnapshot<DocumentData> {
  return { id: 'student-1', data: () => data } as QueryDocumentSnapshot<DocumentData>;
}

describe('studentFromDoc', () => {
  it('reads firstName/lastName directly when present', () => {
    const student = studentFromDoc(
      fakeSnapshot({ firstName: 'Alex', lastName: 'Rivera', displayName: 'Alex Rivera' }),
    );

    expect(student.firstName).toBe('Alex');
    expect(student.lastName).toBe('Rivera');
  });

  it('derives firstName/lastName from displayName for pre-migration students', () => {
    // Students created before the Phase 1 roster migration only ever had
    // displayName written — firstName/lastName are absent on the raw doc,
    // even though the Student type claims they're always strings.
    const student = studentFromDoc(fakeSnapshot({ displayName: 'Jamie Chen' }));

    expect(student.firstName).toBe('Jamie');
    expect(student.lastName).toBe('Chen');
  });

  it('never returns undefined firstName/lastName, even with no displayName', () => {
    const student = studentFromDoc(fakeSnapshot({}));

    expect(student.firstName).toBe('');
    expect(student.lastName).toBe('');
  });
});
