import { readFileSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';

const OWNER_UID = 'owner-1';
const OTHER_UID = 'other-1';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'sprout-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

async function seedClassroomWithStudent() {
  const owner = testEnv.authenticatedContext(OWNER_UID).firestore();
  await setDoc(doc(owner, 'contexts/ctx-1'), {
    type: 'classroom',
    name: '4th Grade',
    ownerUids: [OWNER_UID],
    createdAt: new Date(),
  });
  await setDoc(doc(owner, 'students/student-1'), {
    displayName: 'Alex',
    balanceCents: 0,
    contexts: { 'ctx-1': { type: 'classroom', role: 'member' } },
    contextIds: ['ctx-1'],
    ownerUids: [OWNER_UID],
    createdAt: new Date(),
  });
}

describe('firestore.rules', () => {
  it('lets the owner create a context, add a student, and record a transaction', async () => {
    await seedClassroomWithStudent();
    const owner = testEnv.authenticatedContext(OWNER_UID).firestore();

    await assertSucceeds(
      setDoc(doc(owner, 'contexts/ctx-1/transactions/tx-1'), {
        studentId: 'student-1',
        type: 'earn',
        amountCents: 500,
        reason: 'Homework',
        createdByUid: OWNER_UID,
        createdAt: new Date(),
        ownerUids: [OWNER_UID],
      }),
    );
    await assertSucceeds(getDoc(doc(owner, 'students/student-1')));
  });

  it("denies a non-owner from reading or writing another teacher's data", async () => {
    await seedClassroomWithStudent();
    const other = testEnv.authenticatedContext(OTHER_UID).firestore();

    await assertFails(getDoc(doc(other, 'contexts/ctx-1')));
    await assertFails(getDoc(doc(other, 'students/student-1')));
    await assertFails(
      setDoc(doc(other, 'contexts/ctx-1/transactions/tx-1'), {
        studentId: 'student-1',
        type: 'earn',
        amountCents: 100,
        reason: 'Snooping',
        createdByUid: OTHER_UID,
        createdAt: new Date(),
        ownerUids: [OWNER_UID],
      }),
    );
  });

  it('denies unauthenticated access', async () => {
    const anon = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(anon, 'contexts/ctx-1'), {
        type: 'classroom',
        name: '4th Grade',
        ownerUids: [OWNER_UID],
        createdAt: new Date(),
      }),
    );
  });

  it('rejects a non-positive transaction amount', async () => {
    await seedClassroomWithStudent();
    const owner = testEnv.authenticatedContext(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(owner, 'contexts/ctx-1/transactions/tx-bad'), {
        studentId: 'student-1',
        type: 'earn',
        amountCents: 0,
        reason: 'Invalid',
        createdByUid: OWNER_UID,
        createdAt: new Date(),
        ownerUids: [OWNER_UID],
      }),
    );
  });
});

describe('firestore.rules — school security matrix', () => {
  const PRINCIPAL_UID = 'principal-1';
  const DELEGATE_UID = 'delegate-1';
  const GRADE_TEACHER_UID = 'grade-teacher-1';
  const SPECIALIST_UID = 'specialist-1';
  const OWN_SCOPE_TEACHER_UID = 'own-scope-teacher-1';
  const OUTSIDER_UID = 'outsider-1';
  const NEW_TEACHER_EMAIL = 'new.teacher@example.com';
  const SCHOOL_ID = 'school-1';

  async function seedSchoolWithAdmins() {
    const principal = testEnv.authenticatedContext(PRINCIPAL_UID).firestore();
    await setDoc(doc(principal, `schools/${SCHOOL_ID}`), {
      name: 'Riverside Elementary',
      principalUid: PRINCIPAL_UID,
      createdAt: new Date(),
    });
    await setDoc(doc(principal, `schools/${SCHOOL_ID}/members/${PRINCIPAL_UID}`), {
      role: 'admin',
      displayName: 'Principal',
      email: 'principal@example.com',
      addedByUid: PRINCIPAL_UID,
      createdAt: new Date(),
    });
    await setDoc(doc(principal, `schools/${SCHOOL_ID}/members/${DELEGATE_UID}`), {
      role: 'admin',
      displayName: 'Office Manager',
      email: 'delegate@example.com',
      addedByUid: PRINCIPAL_UID,
      createdAt: new Date(),
    });
  }

  async function seedClassroomAndStudent(gradeLevel: string) {
    // Written by an owning teacher (not the principal/delegate) — scoped
    // visibility for admins/other teachers is a read-only grant, so the
    // seeded docs' ownerUids must actually contain whoever is writing them.
    const owner = testEnv.authenticatedContext(OWNER_UID).firestore();
    await setDoc(doc(owner, 'contexts/school-ctx-1'), {
      type: 'classroom',
      name: `Grade ${gradeLevel} Room`,
      ownerUids: [OWNER_UID],
      schoolId: SCHOOL_ID,
      gradeLevel,
      createdAt: new Date(),
    });
    await setDoc(doc(owner, 'students/school-student-1'), {
      displayName: 'Jamie',
      balanceCents: 0,
      contexts: { 'school-ctx-1': { type: 'classroom', role: 'member' } },
      contextIds: ['school-ctx-1'],
      ownerUids: [OWNER_UID],
      schoolId: SCHOOL_ID,
      gradeLevel,
      createdAt: new Date(),
    });
  }

  it('lets the principal found a school and become its own admin', async () => {
    const principal = testEnv.authenticatedContext(PRINCIPAL_UID).firestore();
    await assertSucceeds(
      setDoc(doc(principal, `schools/${SCHOOL_ID}`), {
        name: 'Riverside Elementary',
        principalUid: PRINCIPAL_UID,
        createdAt: new Date(),
      }),
    );
    await assertSucceeds(
      setDoc(doc(principal, `schools/${SCHOOL_ID}/members/${PRINCIPAL_UID}`), {
        role: 'admin',
        displayName: 'Principal',
        email: 'principal@example.com',
        addedByUid: PRINCIPAL_UID,
        createdAt: new Date(),
      }),
    );
  });

  it('lets the principal delegate admin to a second person', async () => {
    const principal = testEnv.authenticatedContext(PRINCIPAL_UID).firestore();
    await setDoc(doc(principal, `schools/${SCHOOL_ID}`), {
      name: 'Riverside Elementary',
      principalUid: PRINCIPAL_UID,
      createdAt: new Date(),
    });
    await setDoc(doc(principal, `schools/${SCHOOL_ID}/members/${PRINCIPAL_UID}`), {
      role: 'admin',
      displayName: 'Principal',
      email: 'principal@example.com',
      addedByUid: PRINCIPAL_UID,
      createdAt: new Date(),
    });

    await assertSucceeds(
      setDoc(doc(principal, `schools/${SCHOOL_ID}/members/${DELEGATE_UID}`), {
        role: 'admin',
        displayName: 'Office Manager',
        email: 'delegate@example.com',
        addedByUid: PRINCIPAL_UID,
        createdAt: new Date(),
      }),
    );
  });

  it('lets a delegate admin add a grade-scoped teacher, but not another admin', async () => {
    await seedSchoolWithAdmins();
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();

    await assertSucceeds(
      setDoc(doc(delegate, `schools/${SCHOOL_ID}/members/${GRADE_TEACHER_UID}`), {
        role: 'teacher',
        displayName: 'Ms. Lord',
        email: 'lord@example.com',
        scope: { type: 'grades', grades: ['3', '4'] },
        addedByUid: DELEGATE_UID,
        createdAt: new Date(),
      }),
    );

    await assertFails(
      setDoc(doc(delegate, `schools/${SCHOOL_ID}/members/another-admin`), {
        role: 'admin',
        displayName: 'Uninvited Admin',
        email: 'uninvited@example.com',
        addedByUid: DELEGATE_UID,
        createdAt: new Date(),
      }),
    );
  });

  it('denies a delegate admin removing the principal', async () => {
    await seedSchoolWithAdmins();
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    await assertFails(deleteDoc(doc(delegate, `schools/${SCHOOL_ID}/members/${PRINCIPAL_UID}`)));
  });

  it('lets a grade-scoped teacher read classrooms/students in that grade but not other grades', async () => {
    await seedSchoolWithAdmins();
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    await setDoc(doc(delegate, `schools/${SCHOOL_ID}/members/${GRADE_TEACHER_UID}`), {
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      scope: { type: 'grades', grades: ['4'] },
      addedByUid: DELEGATE_UID,
      createdAt: new Date(),
    });
    await seedClassroomAndStudent('4');

    const gradeTeacher = testEnv.authenticatedContext(GRADE_TEACHER_UID).firestore();
    await assertSucceeds(getDoc(doc(gradeTeacher, 'contexts/school-ctx-1')));
    await assertSucceeds(getDoc(doc(gradeTeacher, 'students/school-student-1')));

    await testEnv.clearFirestore();
    await seedSchoolWithAdmins();
    await setDoc(doc(delegate, `schools/${SCHOOL_ID}/members/${GRADE_TEACHER_UID}`), {
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      scope: { type: 'grades', grades: ['5'] },
      addedByUid: DELEGATE_UID,
      createdAt: new Date(),
    });
    await seedClassroomAndStudent('4');
    await assertFails(getDoc(doc(gradeTeacher, 'contexts/school-ctx-1')));
  });

  it('lets a whole-school-scoped teacher (PE/art/music) read any classroom/student', async () => {
    await seedSchoolWithAdmins();
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    await setDoc(doc(delegate, `schools/${SCHOOL_ID}/members/${SPECIALIST_UID}`), {
      role: 'teacher',
      displayName: 'Coach Kim',
      email: 'kim@example.com',
      scope: { type: 'school' },
      addedByUid: DELEGATE_UID,
      createdAt: new Date(),
    });
    await seedClassroomAndStudent('K');

    const specialist = testEnv.authenticatedContext(SPECIALIST_UID).firestore();
    await assertSucceeds(getDoc(doc(specialist, 'contexts/school-ctx-1')));
    await assertSucceeds(getDoc(doc(specialist, 'students/school-student-1')));
  });

  it('denies an own-scope teacher reading a classroom they do not own, even in the same school', async () => {
    await seedSchoolWithAdmins();
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    await setDoc(doc(delegate, `schools/${SCHOOL_ID}/members/${OWN_SCOPE_TEACHER_UID}`), {
      role: 'teacher',
      displayName: 'Mr. Own-Scope',
      email: 'ownscope@example.com',
      scope: { type: 'own', grades: [] },
      addedByUid: DELEGATE_UID,
      createdAt: new Date(),
    });
    await seedClassroomAndStudent('2');

    const ownScopeTeacher = testEnv.authenticatedContext(OWN_SCOPE_TEACHER_UID).firestore();
    await assertFails(getDoc(doc(ownScopeTeacher, 'contexts/school-ctx-1')));
  });

  it('lets a new teacher claim a pending invite that matches their verified email', async () => {
    await seedSchoolWithAdmins();
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    await setDoc(doc(delegate, `pendingInvites/${NEW_TEACHER_EMAIL}`), {
      schoolId: SCHOOL_ID,
      role: 'teacher',
      scope: { type: 'own' },
      invitedByUid: DELEGATE_UID,
      createdAt: new Date(),
    });

    const newTeacherUid = 'new-teacher-uid';
    const newTeacher = testEnv
      .authenticatedContext(newTeacherUid, { email: NEW_TEACHER_EMAIL })
      .firestore();

    await assertSucceeds(
      setDoc(doc(newTeacher, `schools/${SCHOOL_ID}/members/${newTeacherUid}`), {
        role: 'teacher',
        displayName: 'New Teacher',
        email: NEW_TEACHER_EMAIL,
        scope: { type: 'own' },
        addedByUid: newTeacherUid,
        createdAt: new Date(),
      }),
    );
    await assertSucceeds(deleteDoc(doc(newTeacher, `pendingInvites/${NEW_TEACHER_EMAIL}`)));
  });

  it('lets a school admin read and cancel a pending invite they created', async () => {
    await seedSchoolWithAdmins();
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    await setDoc(doc(delegate, `pendingInvites/${NEW_TEACHER_EMAIL}`), {
      schoolId: SCHOOL_ID,
      role: 'teacher',
      scope: { type: 'own' },
      invitedByUid: DELEGATE_UID,
      createdAt: new Date(),
    });

    await assertSucceeds(getDoc(doc(delegate, `pendingInvites/${NEW_TEACHER_EMAIL}`)));
    await assertSucceeds(deleteDoc(doc(delegate, `pendingInvites/${NEW_TEACHER_EMAIL}`)));
  });

  it("denies claiming an invite that isn't the caller's own, or with mismatched role/scope", async () => {
    await seedSchoolWithAdmins();
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    await setDoc(doc(delegate, `pendingInvites/${NEW_TEACHER_EMAIL}`), {
      schoolId: SCHOOL_ID,
      role: 'teacher',
      scope: { type: 'own' },
      invitedByUid: DELEGATE_UID,
      createdAt: new Date(),
    });

    const outsider = testEnv.authenticatedContext(OUTSIDER_UID, { email: 'someone.else@example.com' }).firestore();
    await assertFails(getDoc(doc(outsider, `pendingInvites/${NEW_TEACHER_EMAIL}`)));
    await assertFails(
      setDoc(doc(outsider, `schools/${SCHOOL_ID}/members/${OUTSIDER_UID}`), {
        role: 'teacher',
        displayName: 'Outsider',
        email: 'someone.else@example.com',
        scope: { type: 'own' },
        addedByUid: OUTSIDER_UID,
        createdAt: new Date(),
      }),
    );

    const newTeacherUid = 'new-teacher-uid';
    const newTeacher = testEnv
      .authenticatedContext(newTeacherUid, { email: NEW_TEACHER_EMAIL })
      .firestore();
    await assertFails(
      setDoc(doc(newTeacher, `schools/${SCHOOL_ID}/members/${newTeacherUid}`), {
        role: 'admin',
        displayName: 'New Teacher',
        email: NEW_TEACHER_EMAIL,
        addedByUid: newTeacherUid,
        createdAt: new Date(),
      }),
    );
  });
});
