import { readFileSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';

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
    contextId: 'ctx-1',
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

  it('lets the owner tag an earn transaction with a savings label', async () => {
    await seedClassroomWithStudent();
    const owner = testEnv.authenticatedContext(OWNER_UID).firestore();

    await assertSucceeds(
      setDoc(doc(owner, 'contexts/ctx-1/transactions/tx-goal'), {
        studentId: 'student-1',
        type: 'earn',
        amountCents: 500,
        reason: 'Allowance',
        savingsLabel: 'goal',
        createdByUid: OWNER_UID,
        createdAt: new Date(),
        ownerUids: [OWNER_UID],
      }),
    );
  });

  it('rejects a savings label on a spend, and rejects an unrecognized label value', async () => {
    await seedClassroomWithStudent();
    const owner = testEnv.authenticatedContext(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(owner, 'contexts/ctx-1/transactions/tx-spend-label'), {
        studentId: 'student-1',
        type: 'spend',
        amountCents: 200,
        reason: 'Store',
        savingsLabel: 'goal',
        createdByUid: OWNER_UID,
        createdAt: new Date(),
        ownerUids: [OWNER_UID],
      }),
    );
    await assertFails(
      setDoc(doc(owner, 'contexts/ctx-1/transactions/tx-bad-label'), {
        studentId: 'student-1',
        type: 'earn',
        amountCents: 200,
        reason: 'Allowance',
        savingsLabel: 'not_a_real_label',
        createdByUid: OWNER_UID,
        createdAt: new Date(),
        ownerUids: [OWNER_UID],
      }),
    );
  });

  it('lets the owner create a goal, then record a transaction that credits its progress', async () => {
    await seedClassroomWithStudent();
    const owner = testEnv.authenticatedContext(OWNER_UID).firestore();

    await assertSucceeds(
      setDoc(doc(owner, 'students/student-1/goals/goal-1'), {
        studentId: 'student-1',
        name: 'New soccer ball',
        targetCents: 2000,
        savedCents: 0,
        createdByUid: OWNER_UID,
        createdAt: new Date(),
      }),
    );
    await assertSucceeds(
      setDoc(doc(owner, 'contexts/ctx-1/transactions/tx-goal-linked'), {
        studentId: 'student-1',
        type: 'earn',
        amountCents: 500,
        reason: 'Allowance',
        savingsLabel: 'goal',
        goalId: 'goal-1',
        createdByUid: OWNER_UID,
        createdAt: new Date(),
        ownerUids: [OWNER_UID],
      }),
    );
    await assertSucceeds(
      updateDoc(doc(owner, 'students/student-1/goals/goal-1'), { savedCents: 500 }),
    );
    await assertSucceeds(getDoc(doc(owner, 'students/student-1/goals/goal-1')));
  });

  it("rejects a transaction naming a goal that doesn't exist, and rejects a non-owner reading or creating a goal", async () => {
    await seedClassroomWithStudent();
    const owner = testEnv.authenticatedContext(OWNER_UID).firestore();
    const other = testEnv.authenticatedContext(OTHER_UID).firestore();

    await assertFails(
      setDoc(doc(owner, 'contexts/ctx-1/transactions/tx-fake-goal'), {
        studentId: 'student-1',
        type: 'earn',
        amountCents: 500,
        reason: 'Allowance',
        savingsLabel: 'goal',
        goalId: 'no-such-goal',
        createdByUid: OWNER_UID,
        createdAt: new Date(),
        ownerUids: [OWNER_UID],
      }),
    );

    await setDoc(doc(owner, 'students/student-1/goals/goal-1'), {
      studentId: 'student-1',
      name: 'New soccer ball',
      targetCents: 2000,
      savedCents: 0,
      createdByUid: OWNER_UID,
      createdAt: new Date(),
    });
    await assertFails(getDoc(doc(other, 'students/student-1/goals/goal-1')));
    await assertFails(
      setDoc(doc(other, 'students/student-1/goals/goal-2'), {
        studentId: 'student-1',
        name: 'Snooping',
        targetCents: 100,
        savedCents: 0,
        createdByUid: OTHER_UID,
        createdAt: new Date(),
      }),
    );
  });

  it('lets the owner delete a goal', async () => {
    await seedClassroomWithStudent();
    const owner = testEnv.authenticatedContext(OWNER_UID).firestore();
    await setDoc(doc(owner, 'students/student-1/goals/goal-1'), {
      studentId: 'student-1',
      name: 'New soccer ball',
      targetCents: 2000,
      savedCents: 0,
      createdByUid: OWNER_UID,
      createdAt: new Date(),
    });

    await assertSucceeds(deleteDoc(doc(owner, 'students/student-1/goals/goal-1')));
  });

  it('lets the owner tag a spend with a spend category', async () => {
    await seedClassroomWithStudent();
    const owner = testEnv.authenticatedContext(OWNER_UID).firestore();

    await assertSucceeds(
      setDoc(doc(owner, 'contexts/ctx-1/transactions/tx-spend-category'), {
        studentId: 'student-1',
        type: 'spend',
        amountCents: 300,
        reason: 'New cleats',
        spendCategory: 'need',
        createdByUid: OWNER_UID,
        createdAt: new Date(),
        ownerUids: [OWNER_UID],
      }),
    );
  });

  it('rejects a spend category on an earn, and rejects an unrecognized category value', async () => {
    await seedClassroomWithStudent();
    const owner = testEnv.authenticatedContext(OWNER_UID).firestore();

    await assertFails(
      setDoc(doc(owner, 'contexts/ctx-1/transactions/tx-earn-category'), {
        studentId: 'student-1',
        type: 'earn',
        amountCents: 300,
        reason: 'Allowance',
        spendCategory: 'need',
        createdByUid: OWNER_UID,
        createdAt: new Date(),
        ownerUids: [OWNER_UID],
      }),
    );
    await assertFails(
      setDoc(doc(owner, 'contexts/ctx-1/transactions/tx-bad-category'), {
        studentId: 'student-1',
        type: 'spend',
        amountCents: 300,
        reason: 'New cleats',
        spendCategory: 'not_a_real_category',
        createdByUid: OWNER_UID,
        createdAt: new Date(),
        ownerUids: [OWNER_UID],
      }),
    );
  });

  it('lets the owner stock, reprice, and remove a classroom store item', async () => {
    await seedClassroomWithStudent();
    const owner = testEnv.authenticatedContext(OWNER_UID).firestore();

    await assertSucceeds(
      setDoc(doc(owner, 'contexts/ctx-1/storeItems/item-1'), {
        contextId: 'ctx-1',
        name: 'Pencil pouch',
        priceCents: 250,
        createdByUid: OWNER_UID,
        createdAt: new Date(),
      }),
    );
    // The lesson's "meet a surprise" step — a price changes mid-activity.
    await assertSucceeds(
      updateDoc(doc(owner, 'contexts/ctx-1/storeItems/item-1'), {
        contextId: 'ctx-1',
        name: 'Pencil pouch',
        priceCents: 300,
      }),
    );
    await assertSucceeds(deleteDoc(doc(owner, 'contexts/ctx-1/storeItems/item-1')));
  });

  it('rejects a non-owner reading or stocking another classroom\'s store, and a non-positive price', async () => {
    await seedClassroomWithStudent();
    const owner = testEnv.authenticatedContext(OWNER_UID).firestore();
    const other = testEnv.authenticatedContext(OTHER_UID).firestore();

    await assertFails(
      setDoc(doc(owner, 'contexts/ctx-1/storeItems/item-bad'), {
        contextId: 'ctx-1',
        name: 'Free item',
        priceCents: 0,
        createdByUid: OWNER_UID,
        createdAt: new Date(),
      }),
    );

    await setDoc(doc(owner, 'contexts/ctx-1/storeItems/item-1'), {
      contextId: 'ctx-1',
      name: 'Pencil pouch',
      priceCents: 250,
      createdByUid: OWNER_UID,
      createdAt: new Date(),
    });
    await assertFails(getDoc(doc(other, 'contexts/ctx-1/storeItems/item-1')));
    await assertFails(
      setDoc(doc(other, 'contexts/ctx-1/storeItems/item-2'), {
        contextId: 'ctx-1',
        name: 'Snooping',
        priceCents: 100,
        createdByUid: OTHER_UID,
        createdAt: new Date(),
      }),
    );
  });
});

describe('firestore.rules — school security matrix', () => {
  const SUPER_ADMIN_UID = 'super-admin-1';
  const SECOND_SUPER_ADMIN_UID = 'super-admin-2';
  const DELEGATE_UID = 'delegate-1';
  const GRADE_TEACHER_UID = 'grade-teacher-1';
  const SPECIALIST_UID = 'specialist-1';
  const OWN_SCOPE_TEACHER_UID = 'own-scope-teacher-1';
  const OUTSIDER_UID = 'outsider-1';
  const NEW_TEACHER_EMAIL = 'new.teacher@example.com';
  const SCHOOL_ID = 'school-1';

  // A super_admin (the founder) plus one regular admin (delegate) — the
  // baseline most tests build on. superAdminCount stays 1 here; tests that
  // need a second super_admin add one explicitly.
  async function seedSchoolWithAdmins() {
    const superAdmin = testEnv.authenticatedContext(SUPER_ADMIN_UID).firestore();
    await setDoc(doc(superAdmin, `schools/${SCHOOL_ID}`), {
      name: 'Riverside Elementary',
      founderUid: SUPER_ADMIN_UID,
      superAdminCount: 1,
      createdAt: new Date(),
    });
    await setDoc(doc(superAdmin, `schools/${SCHOOL_ID}/members/${SUPER_ADMIN_UID}`), {
      role: 'super_admin',
      displayName: 'Principal',
      email: 'principal@example.com',
      addedByUid: SUPER_ADMIN_UID,
      createdAt: new Date(),
    });
    await setDoc(doc(superAdmin, `schools/${SCHOOL_ID}/members/${DELEGATE_UID}`), {
      role: 'admin',
      displayName: 'Office Manager',
      email: 'delegate@example.com',
      addedByUid: SUPER_ADMIN_UID,
      createdAt: new Date(),
    });
  }

  async function seedClassroomAndStudent(gradeLevel: string) {
    // The classroom itself is still written by its owning teacher
    // (isContextOwner alone is enough at create time, regardless of
    // schoolId) — scoped visibility for admins/other teachers is a
    // read-only grant, so the seeded doc's ownerUids must actually contain
    // whoever is writing it. The student, though, is added by an admin
    // (delegate): roster creation on a school-affiliated classroom is
    // school-staff-only, same as rename/delete — see canManageClassroom.
    const owner = testEnv.authenticatedContext(OWNER_UID).firestore();
    await setDoc(doc(owner, 'contexts/school-ctx-1'), {
      type: 'classroom',
      name: `Grade ${gradeLevel} Room`,
      ownerUids: [OWNER_UID],
      schoolId: SCHOOL_ID,
      gradeLevel,
      createdAt: new Date(),
    });
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    await setDoc(doc(delegate, 'students/school-student-1'), {
      displayName: 'Jamie',
      balanceCents: 0,
      contexts: { 'school-ctx-1': { type: 'classroom', role: 'member' } },
      contextId: 'school-ctx-1',
      ownerUids: [OWNER_UID],
      schoolId: SCHOOL_ID,
      gradeLevel,
      createdAt: new Date(),
    });
  }

  it('lets a founder create a school and become its own super admin', async () => {
    const superAdmin = testEnv.authenticatedContext(SUPER_ADMIN_UID).firestore();
    await assertSucceeds(
      setDoc(doc(superAdmin, `schools/${SCHOOL_ID}`), {
        name: 'Riverside Elementary',
        founderUid: SUPER_ADMIN_UID,
        superAdminCount: 1,
        createdAt: new Date(),
      }),
    );
    await assertSucceeds(
      setDoc(doc(superAdmin, `schools/${SCHOOL_ID}/members/${SUPER_ADMIN_UID}`), {
        role: 'super_admin',
        displayName: 'Principal',
        email: 'principal@example.com',
        addedByUid: SUPER_ADMIN_UID,
        createdAt: new Date(),
      }),
    );
  });

  it('rejects founding a school with a starting superAdminCount other than 1', async () => {
    const superAdmin = testEnv.authenticatedContext(SUPER_ADMIN_UID).firestore();
    await assertFails(
      setDoc(doc(superAdmin, `schools/${SCHOOL_ID}`), {
        name: 'Riverside Elementary',
        founderUid: SUPER_ADMIN_UID,
        superAdminCount: 0,
        createdAt: new Date(),
      }),
    );
  });

  it('lets a super admin add a second super admin and a regular admin', async () => {
    await seedSchoolWithAdmins();
    const superAdmin = testEnv.authenticatedContext(SUPER_ADMIN_UID).firestore();

    await assertSucceeds(
      setDoc(doc(superAdmin, `schools/${SCHOOL_ID}/members/${SECOND_SUPER_ADMIN_UID}`), {
        role: 'super_admin',
        displayName: 'Assistant Principal',
        email: 'assistant@example.com',
        addedByUid: SUPER_ADMIN_UID,
        createdAt: new Date(),
      }),
    );
    await assertSucceeds(
      setDoc(doc(superAdmin, `schools/${SCHOOL_ID}/members/another-admin`), {
        role: 'admin',
        displayName: 'Second Delegate',
        email: 'second-delegate@example.com',
        addedByUid: SUPER_ADMIN_UID,
        createdAt: new Date(),
      }),
    );
  });

  it('lets a delegate admin add a grade-scoped teacher, but not another admin or a super admin', async () => {
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
    await assertFails(
      setDoc(doc(delegate, `schools/${SCHOOL_ID}/members/another-super-admin`), {
        role: 'super_admin',
        displayName: 'Uninvited Super Admin',
        email: 'uninvited-sa@example.com',
        addedByUid: DELEGATE_UID,
        createdAt: new Date(),
      }),
    );
  });

  it('denies a delegate admin removing the super admin, or an admin', async () => {
    await seedSchoolWithAdmins();
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    await assertFails(deleteDoc(doc(delegate, `schools/${SCHOOL_ID}/members/${SUPER_ADMIN_UID}`)));
    // Only a super_admin removes an admin — not even another admin can.
    await setDoc(doc(testEnv.authenticatedContext(SUPER_ADMIN_UID).firestore(), `schools/${SCHOOL_ID}/members/another-admin`), {
      role: 'admin',
      displayName: 'Second Delegate',
      email: 'second-delegate@example.com',
      addedByUid: SUPER_ADMIN_UID,
      createdAt: new Date(),
    });
    await assertFails(deleteDoc(doc(delegate, `schools/${SCHOOL_ID}/members/another-admin`)));
  });

  it('denies removing the last super admin, but allows it once a second exists', async () => {
    await seedSchoolWithAdmins();
    const superAdmin = testEnv.authenticatedContext(SUPER_ADMIN_UID).firestore();

    // Only one super_admin so far (superAdminCount: 1) — removing it must fail.
    await assertFails(deleteDoc(doc(superAdmin, `schools/${SCHOOL_ID}/members/${SUPER_ADMIN_UID}`)));

    // Add a second super_admin and bump the counter (the app does both in
    // one batch — done here as two writes since rules-unit-testing doesn't
    // need atomicity to exercise the rule itself).
    await setDoc(doc(superAdmin, `schools/${SCHOOL_ID}/members/${SECOND_SUPER_ADMIN_UID}`), {
      role: 'super_admin',
      displayName: 'Assistant Principal',
      email: 'assistant@example.com',
      addedByUid: SUPER_ADMIN_UID,
      createdAt: new Date(),
    });
    await setDoc(doc(superAdmin, `schools/${SCHOOL_ID}`), {
      name: 'Riverside Elementary',
      founderUid: SUPER_ADMIN_UID,
      superAdminCount: 2,
      createdAt: new Date(),
    });

    await assertSucceeds(deleteDoc(doc(superAdmin, `schools/${SCHOOL_ID}/members/${SUPER_ADMIN_UID}`)));
  });

  it('lets a plain teacher or a plain admin delete their own membership doc (account deletion)', async () => {
    await seedSchoolWithAdmins();
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    await setDoc(doc(delegate, `schools/${SCHOOL_ID}/members/${GRADE_TEACHER_UID}`), {
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      scope: { type: 'own' },
      addedByUid: DELEGATE_UID,
      createdAt: new Date(),
    });

    // A plain teacher removing themselves is neither isAtLeastAdmin nor
    // isSuperAdmin — before the self-delete branch existed, this failed.
    const teacher = testEnv.authenticatedContext(GRADE_TEACHER_UID).firestore();
    await assertSucceeds(deleteDoc(doc(teacher, `schools/${SCHOOL_ID}/members/${GRADE_TEACHER_UID}`)));

    // A plain admin removing themselves is not isSuperAdmin — same gap.
    await assertSucceeds(deleteDoc(doc(delegate, `schools/${SCHOOL_ID}/members/${DELEGATE_UID}`)));
  });

  it('lets an admin (not just a super admin) act on, rename, and delete any classroom/student in their school', async () => {
    await seedSchoolWithAdmins();
    await seedClassroomAndStudent('4');
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();

    await assertSucceeds(getDoc(doc(delegate, 'contexts/school-ctx-1')));
    await assertSucceeds(
      setDoc(doc(delegate, 'contexts/school-ctx-1/transactions/tx-admin'), {
        studentId: 'school-student-1',
        type: 'earn',
        amountCents: 200,
        reason: 'Admin adjustment',
        createdByUid: DELEGATE_UID,
        createdAt: new Date(),
        schoolId: SCHOOL_ID,
        gradeLevel: '4',
      }),
    );
    // Full manage rights, unlike a merely award-scoped teacher below.
    await assertSucceeds(
      setDoc(
        doc(delegate, 'students/school-student-1'),
        { displayName: 'Jamie R.' },
        { merge: true },
      ),
    );
    await assertSucceeds(deleteDoc(doc(delegate, 'contexts/school-ctx-1')));
  });

  it('gives a grade-scoped teacher award-only access in that grade (read + record, never rename/delete) and nothing outside it', async () => {
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
    // Award access: can record a transaction for a student they don't own
    // but whose grade is in scope.
    await assertSucceeds(
      setDoc(doc(gradeTeacher, 'contexts/school-ctx-1/transactions/tx-scoped'), {
        studentId: 'school-student-1',
        type: 'earn',
        amountCents: 300,
        reason: 'Great work',
        createdByUid: GRADE_TEACHER_UID,
        createdAt: new Date(),
        schoolId: SCHOOL_ID,
        gradeLevel: '4',
      }),
    );
    // But never manage rights — grade scope alone must not let them
    // rename/delete a classroom or student they don't own, and must not
    // let them create a new one in that grade either.
    await assertFails(
      setDoc(doc(gradeTeacher, 'students/school-student-1'), { displayName: 'Hacked' }, { merge: true }),
    );
    await assertFails(deleteDoc(doc(gradeTeacher, 'contexts/school-ctx-1')));
    // Naming themselves as owner would still succeed (that's the ordinary
    // "create my own classroom" path, unrelated to scope) — the narrowed
    // rule specifically blocks using grade scope to create a classroom
    // for someone else, which admin/super_admin creation would use.
    await assertFails(
      setDoc(doc(gradeTeacher, 'contexts/school-new-ctx'), {
        type: 'classroom',
        name: 'Spontaneous Classroom',
        ownerUids: [OWNER_UID],
        schoolId: SCHOOL_ID,
        gradeLevel: '4',
        createdAt: new Date(),
      }),
    );

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

  it('gives a whole-school-scoped teacher (PE/art/music) award-only access everywhere, never rename/delete', async () => {
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
    await assertSucceeds(
      setDoc(doc(specialist, 'contexts/school-ctx-1/transactions/tx-specialist'), {
        studentId: 'school-student-1',
        type: 'earn',
        amountCents: 100,
        reason: 'Good sportsmanship',
        createdByUid: SPECIALIST_UID,
        createdAt: new Date(),
        schoolId: SCHOOL_ID,
        gradeLevel: 'K',
      }),
    );
    await assertFails(
      setDoc(doc(specialist, 'students/school-student-1'), { displayName: 'Renamed' }, { merge: true }),
    );
    await assertFails(deleteDoc(doc(specialist, 'students/school-student-1')));
  });

  it("denies a school-affiliated classroom's own owner from renaming/deleting it or adding a student — only school staff can, once a school is attached", async () => {
    await seedSchoolWithAdmins();
    await seedClassroomAndStudent('4');
    const owner = testEnv.authenticatedContext(OWNER_UID).firestore();

    await assertFails(setDoc(doc(owner, 'contexts/school-ctx-1'), { name: 'Renamed' }, { merge: true }));
    await assertFails(deleteDoc(doc(owner, 'contexts/school-ctx-1')));
    await assertFails(
      setDoc(doc(owner, 'students/school-new-student'), {
        displayName: 'New Kid',
        balanceCents: 0,
        contexts: { 'school-ctx-1': { type: 'classroom', role: 'member' } },
        contextId: 'school-ctx-1',
        ownerUids: [OWNER_UID],
        schoolId: SCHOOL_ID,
        gradeLevel: '4',
        createdAt: new Date(),
      }),
    );
    // Award access (recording their own classroom's transactions) is
    // untouched — this is a manage-tier restriction only.
    await assertSucceeds(
      setDoc(doc(owner, 'contexts/school-ctx-1/transactions/tx-owner'), {
        studentId: 'school-student-1',
        type: 'earn',
        amountCents: 100,
        reason: 'Still awards fine',
        createdByUid: OWNER_UID,
        createdAt: new Date(),
        ownerUids: [OWNER_UID],
        schoolId: SCHOOL_ID,
        gradeLevel: '4',
      }),
    );
  });

  it('restricts a school-affiliated classroom store catalog to school staff — the owner alone can no longer stock it', async () => {
    await seedSchoolWithAdmins();
    await seedClassroomAndStudent('4');
    const owner = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(owner, 'contexts/school-ctx-1/storeItems/item-1'), {
        contextId: 'school-ctx-1',
        name: 'Pencil pouch',
        priceCents: 250,
        createdByUid: OWNER_UID,
        createdAt: new Date(),
      }),
    );

    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    await assertSucceeds(
      setDoc(doc(delegate, 'contexts/school-ctx-1/storeItems/item-1'), {
        contextId: 'school-ctx-1',
        name: 'Pencil pouch',
        priceCents: 250,
        createdByUid: DELEGATE_UID,
        createdAt: new Date(),
      }),
    );
  });

  it('lets a schoolless classroom owner keep full manage rights — no school means no staff to defer to', async () => {
    await seedClassroomWithStudent();
    const owner = testEnv.authenticatedContext(OWNER_UID).firestore();

    await assertSucceeds(setDoc(doc(owner, 'contexts/ctx-1'), { name: 'Renamed' }, { merge: true }));
    await assertSucceeds(
      setDoc(doc(owner, 'students/new-student'), {
        displayName: 'New Kid',
        balanceCents: 0,
        contexts: { 'ctx-1': { type: 'classroom', role: 'member' } },
        contextId: 'ctx-1',
        ownerUids: [OWNER_UID],
        createdAt: new Date(),
      }),
    );
    await assertSucceeds(
      setDoc(doc(owner, 'contexts/ctx-1/storeItems/item-1'), {
        contextId: 'ctx-1',
        name: 'Pencil pouch',
        priceCents: 250,
        createdByUid: OWNER_UID,
        createdAt: new Date(),
      }),
    );
    await assertSucceeds(deleteDoc(doc(owner, 'students/new-student')));
    await assertSucceeds(deleteDoc(doc(owner, 'contexts/ctx-1')));
  });

  it('lets an admin reassign ownerUids on a school classroom, but denies the same write to the classroom owner', async () => {
    await seedSchoolWithAdmins();
    await seedClassroomAndStudent('4');
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();

    // The classroom's own (non-admin) owner cannot reassign ownerUids.
    const owner = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(setDoc(doc(owner, 'contexts/school-ctx-1'), { ownerUids: [OWNER_UID, OTHER_UID] }, { merge: true }));

    // Admin: can reassign ownerUids...
    await assertSucceeds(
      setDoc(doc(delegate, 'contexts/school-ctx-1'), { ownerUids: [OTHER_UID] }, { merge: true }),
    );
    // ...and can update an existing student's own denormalized ownerUids in
    // that reassigned classroom — the linchpin of assignClassroomOwner's
    // re-denormalization, exercised via the same canManageClassroom branch.
    await assertSucceeds(
      setDoc(doc(delegate, 'students/school-student-1'), { ownerUids: [OTHER_UID] }, { merge: true }),
    );
  });

  it('lets an admin move a student between two classrooms in their own school, but denies moving into a classroom in a different school', async () => {
    await seedSchoolWithAdmins();
    await seedClassroomAndStudent('4');
    const owner = testEnv.authenticatedContext(OWNER_UID).firestore();
    await setDoc(doc(owner, 'contexts/school-ctx-2'), {
      type: 'classroom',
      name: 'Grade 4 Other Room',
      ownerUids: [OWNER_UID],
      schoolId: SCHOOL_ID,
      gradeLevel: '4',
      createdAt: new Date(),
    });
    // A classroom in a different school entirely — the admin has no
    // standing there at all.
    await setDoc(doc(owner, 'contexts/other-school-ctx'), {
      type: 'classroom',
      name: 'Different School Room',
      ownerUids: [OWNER_UID],
      schoolId: 'some-other-school',
      gradeLevel: '4',
      createdAt: new Date(),
    });

    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    const studentData = {
      displayName: 'Jamie',
      balanceCents: 0,
      ownerUids: [OWNER_UID],
      gradeLevel: '4',
      createdAt: new Date(),
    };
    // Reassign into a classroom in the same school — succeeds.
    await assertSucceeds(
      setDoc(doc(delegate, 'students/school-student-1'), {
        ...studentData,
        contexts: { 'school-ctx-2': { type: 'classroom', role: 'member' } },
        contextId: 'school-ctx-2',
        schoolId: SCHOOL_ID,
      }),
    );
    // Reassign into a classroom in a different school — denied, even
    // though the admin manages the "before" side.
    await assertFails(
      setDoc(doc(delegate, 'students/school-student-1'), {
        ...studentData,
        contexts: { 'other-school-ctx': { type: 'classroom', role: 'member' } },
        contextId: 'other-school-ctx',
        schoolId: 'some-other-school',
      }),
    );
  });

  it("lets a teacher with an 'award' classroom grant record transactions but never rename/delete", async () => {
    await seedSchoolWithAdmins();
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    await setDoc(doc(delegate, `schools/${SCHOOL_ID}/members/${GRADE_TEACHER_UID}`), {
      role: 'teacher',
      displayName: 'Ms. Award-Only',
      email: 'award-only@example.com',
      scope: { type: 'own' },
      classroomGrants: { 'school-ctx-1': 'award' },
      addedByUid: DELEGATE_UID,
      createdAt: new Date(),
    });
    await seedClassroomAndStudent('4');

    const grantee = testEnv.authenticatedContext(GRADE_TEACHER_UID).firestore();
    await assertSucceeds(getDoc(doc(grantee, 'contexts/school-ctx-1')));
    await assertSucceeds(
      setDoc(doc(grantee, 'contexts/school-ctx-1/transactions/tx-award-grant'), {
        studentId: 'school-student-1',
        type: 'earn',
        amountCents: 150,
        reason: 'Nice work',
        createdByUid: GRADE_TEACHER_UID,
        createdAt: new Date(),
        schoolId: SCHOOL_ID,
        gradeLevel: '4',
      }),
    );
    await assertFails(
      setDoc(doc(grantee, 'students/school-student-1'), { displayName: 'Nope' }, { merge: true }),
    );
    await assertFails(deleteDoc(doc(grantee, 'contexts/school-ctx-1')));
  });

  it('resolves the classroom roster LIST query for every access path, and denies an outsider — not just single-document reads', async () => {
    // Regression test for the architecture bug that caused "students no
    // longer show up in any class": a rule that authorizes a LIST query by
    // reading a field the query itself doesn't filter on (e.g. checking
    // ownerUids/schoolId while the query filters by contextId) denies the
    // whole query, even for a caller who would pass a single-document get.
    // isReadableClassroom's get()-on-the-classroom-document fix must be
    // exercised via a real query()/getDocs(), not getDoc(), to catch this.
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
    await setDoc(doc(delegate, `schools/${SCHOOL_ID}/members/${SPECIALIST_UID}`), {
      role: 'teacher',
      displayName: 'Coach Kim',
      email: 'kim@example.com',
      scope: { type: 'own' },
      classroomGrants: { 'school-ctx-1': 'award' },
      addedByUid: DELEGATE_UID,
      createdAt: new Date(),
    });
    await seedClassroomAndStudent('4');
    const owner = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(owner, 'contexts/school-ctx-1/transactions/tx-1'), {
        studentId: 'school-student-1',
        type: 'earn',
        amountCents: 200,
        reason: 'Starting balance',
        createdByUid: OWNER_UID,
        createdAt: new Date(),
        ownerUids: [OWNER_UID],
        schoolId: SCHOOL_ID,
        gradeLevel: '4',
      }),
    );

    const roles = [OWNER_UID, SUPER_ADMIN_UID, GRADE_TEACHER_UID, SPECIALIST_UID];
    for (const uid of roles) {
      const db = testEnv.authenticatedContext(uid).firestore();
      const rosterSnapshot = await assertSucceeds(
        getDocs(query(collection(db, 'students'), where('contextId', '==', 'school-ctx-1'))),
      );
      if (rosterSnapshot.empty) {
        throw new Error(`expected the roster query to return the seeded student for ${uid}, got zero docs`);
      }
      const txSnapshot = await assertSucceeds(
        getDocs(
          query(
            collection(db, 'contexts/school-ctx-1/transactions'),
            where('studentId', '==', 'school-student-1'),
          ),
        ),
      );
      if (txSnapshot.empty) {
        throw new Error(`expected the transactions query to return the seeded transaction for ${uid}, got zero docs`);
      }
    }
    const outsiderDb = testEnv.authenticatedContext(OUTSIDER_UID).firestore();
    await assertFails(getDocs(query(collection(outsiderDb, 'students'), where('contextId', '==', 'school-ctx-1'))));
    await assertFails(
      getDocs(
        query(
          collection(outsiderDb, 'contexts/school-ctx-1/transactions'),
          where('studentId', '==', 'school-student-1'),
        ),
      ),
    );
  });

  it("resolves useStudentsInSchool's schoolId-filtered LIST query for an admin, and denies a non-admin teacher", async () => {
    // Regression test for a real bug found during review: fixing the
    // contextId-filtered roster query (above) initially dropped the
    // schoolId-filtered query StudentsPage/ArchiveStudentsPage/
    // PromoteStudentsPage rely on (useStudentsInSchool), since contextId
    // isn't the field that query filters on. Only admins ever call it with
    // a real schoolId (UI-gated), so only admin access needs to work here.
    await seedSchoolWithAdmins();
    await seedClassroomAndStudent('4');

    const superAdmin = testEnv.authenticatedContext(SUPER_ADMIN_UID).firestore();
    const snapshot = await assertSucceeds(
      getDocs(query(collection(superAdmin, 'students'), where('schoolId', '==', SCHOOL_ID))),
    );
    if (snapshot.empty) {
      throw new Error('expected the schoolId-filtered query to return the seeded student for an admin, got zero docs');
    }

    const owner = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(getDocs(query(collection(owner, 'students'), where('schoolId', '==', SCHOOL_ID))));
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

  it('denies a self-claiming invitee from attaching classroomGrants to their own new member doc', async () => {
    // Regression test for a real hole found during review: without the
    // explicit guard on the invite-claim branch, a new teacher could grant
    // themselves manage rights on any classroom the moment they sign up,
    // completely bypassing the owner-request/admin-approval flow.
    await seedSchoolWithAdmins();
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    await setDoc(doc(delegate, `pendingInvites/${NEW_TEACHER_EMAIL}`), {
      schoolId: SCHOOL_ID,
      role: 'teacher',
      scope: { type: 'own' },
      invitedByUid: DELEGATE_UID,
      createdAt: new Date(),
    });

    const newTeacherUid = 'self-escalating-teacher';
    const newTeacher = testEnv
      .authenticatedContext(newTeacherUid, { email: NEW_TEACHER_EMAIL })
      .firestore();
    await assertFails(
      setDoc(doc(newTeacher, `schools/${SCHOOL_ID}/members/${newTeacherUid}`), {
        role: 'teacher',
        displayName: 'Self Escalator',
        email: NEW_TEACHER_EMAIL,
        scope: { type: 'own' },
        classroomGrants: { 'some-classroom': 'award' },
        addedByUid: newTeacherUid,
        createdAt: new Date(),
      }),
    );
  });

  it("lets an admin directly edit a teacher's classroomGrants (e.g. approving an access request)", async () => {
    await seedSchoolWithAdmins();
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    await setDoc(doc(delegate, `schools/${SCHOOL_ID}/members/${GRADE_TEACHER_UID}`), {
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      scope: { type: 'own' },
      addedByUid: DELEGATE_UID,
      createdAt: new Date(),
    });

    await assertSucceeds(
      setDoc(
        doc(delegate, `schools/${SCHOOL_ID}/members/${GRADE_TEACHER_UID}`),
        { classroomGrants: { 'school-ctx-1': 'award' } },
        { merge: true },
      ),
    );
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

  it("resolves useMembersOfSchool's LIST query for a plain teacher (any member) and an admin; denies an outsider", async () => {
    // Regression test for a real bug found live: isOwner(memberUid) is
    // only true for exactly one document in a multi-member LIST scan, so
    // it can never uniformly authorize the whole query — Firestore denies
    // the entire request the moment the scanned set includes even one
    // OTHER member's document. useMembersOfSchool (shown to any classroom
    // owner picking a delegate on ClassroomDetailPage, not just admins)
    // needs "is the caller some member of this school" instead, which IS
    // uniform (schoolId + request.auth.uid are fixed for the whole query).
    await seedSchoolWithAdmins();
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    await setDoc(doc(delegate, `schools/${SCHOOL_ID}/members/${GRADE_TEACHER_UID}`), {
      role: 'teacher',
      displayName: 'Plain Teacher',
      email: 'plain-teacher@example.com',
      scope: { type: 'own' },
      addedByUid: DELEGATE_UID,
      createdAt: new Date(),
    });

    for (const uid of [SUPER_ADMIN_UID, GRADE_TEACHER_UID]) {
      const db = testEnv.authenticatedContext(uid).firestore();
      const snapshot = await assertSucceeds(getDocs(collection(db, `schools/${SCHOOL_ID}/members`)));
      if (snapshot.size < 2) {
        throw new Error(`expected ${uid} to see all school members, got ${snapshot.size}`);
      }
    }
    const outsider = testEnv.authenticatedContext(OUTSIDER_UID).firestore();
    await assertFails(getDocs(collection(outsider, `schools/${SCHOOL_ID}/members`)));
  });
});

describe('firestore.rules — accessRequests', () => {
  const SUPER_ADMIN_UID = 'ar-super-admin-1';
  const DELEGATE_UID = 'ar-delegate-1';
  const OWNER_TEACHER_UID = 'ar-owner-teacher-1';
  const TARGET_TEACHER_UID = 'ar-target-teacher-1';
  const OUTSIDER_UID = 'ar-outsider-1';
  const SCHOOL_ID = 'ar-school-1';
  const CONTEXT_ID = 'ar-ctx-1';

  async function seedSchoolOwnerAndTarget() {
    const superAdmin = testEnv.authenticatedContext(SUPER_ADMIN_UID).firestore();
    await setDoc(doc(superAdmin, `schools/${SCHOOL_ID}`), {
      name: 'Riverside Elementary',
      founderUid: SUPER_ADMIN_UID,
      superAdminCount: 1,
      createdAt: new Date(),
    });
    await setDoc(doc(superAdmin, `schools/${SCHOOL_ID}/members/${SUPER_ADMIN_UID}`), {
      role: 'super_admin',
      displayName: 'Principal',
      email: 'principal@example.com',
      addedByUid: SUPER_ADMIN_UID,
      createdAt: new Date(),
    });
    await setDoc(doc(superAdmin, `schools/${SCHOOL_ID}/members/${DELEGATE_UID}`), {
      role: 'admin',
      displayName: 'Office Manager',
      email: 'delegate@example.com',
      addedByUid: SUPER_ADMIN_UID,
      createdAt: new Date(),
    });
    await setDoc(doc(superAdmin, `schools/${SCHOOL_ID}/members/${OWNER_TEACHER_UID}`), {
      role: 'teacher',
      displayName: 'Owning Teacher',
      email: 'owner-teacher@example.com',
      scope: { type: 'own' },
      addedByUid: SUPER_ADMIN_UID,
      createdAt: new Date(),
    });
    await setDoc(doc(superAdmin, `schools/${SCHOOL_ID}/members/${TARGET_TEACHER_UID}`), {
      role: 'teacher',
      displayName: 'Target Teacher',
      email: 'target-teacher@example.com',
      scope: { type: 'own' },
      addedByUid: SUPER_ADMIN_UID,
      createdAt: new Date(),
    });
    const owner = testEnv.authenticatedContext(OWNER_TEACHER_UID).firestore();
    await setDoc(doc(owner, `contexts/${CONTEXT_ID}`), {
      type: 'classroom',
      name: '4th Grade',
      ownerUids: [OWNER_TEACHER_UID],
      schoolId: SCHOOL_ID,
      gradeLevel: '4',
      createdAt: new Date(),
    });
  }

  function pendingRequestData(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      schoolId: SCHOOL_ID,
      contextId: CONTEXT_ID,
      contextName: '4th Grade',
      requestedByUid: OWNER_TEACHER_UID,
      requestedByDisplayName: 'Owning Teacher',
      targetUid: TARGET_TEACHER_UID,
      targetDisplayName: 'Target Teacher',
      level: 'award',
      status: 'pending',
      createdAt: new Date(),
      ...overrides,
    };
  }

  it('lets the classroom owner create a pending request naming an existing teacher', async () => {
    await seedSchoolOwnerAndTarget();
    const owner = testEnv.authenticatedContext(OWNER_TEACHER_UID).firestore();
    await assertSucceeds(setDoc(doc(owner, 'accessRequests/req-1'), pendingRequestData()));
  });

  it('denies creating a request for a classroom the caller does not own', async () => {
    await seedSchoolOwnerAndTarget();
    const outsider = testEnv.authenticatedContext(OUTSIDER_UID).firestore();
    await assertFails(
      setDoc(
        doc(outsider, 'accessRequests/req-2'),
        pendingRequestData({ requestedByUid: OUTSIDER_UID }),
      ),
    );
  });

  it('denies spoofing requestedByUid as someone else', async () => {
    await seedSchoolOwnerAndTarget();
    const owner = testEnv.authenticatedContext(OWNER_TEACHER_UID).firestore();
    await assertFails(
      setDoc(
        doc(owner, 'accessRequests/req-3'),
        pendingRequestData({ requestedByUid: DELEGATE_UID }),
      ),
    );
  });

  it("denies a request whose schoolId doesn't match the classroom's real school", async () => {
    await seedSchoolOwnerAndTarget();
    const owner = testEnv.authenticatedContext(OWNER_TEACHER_UID).firestore();
    await assertFails(
      setDoc(
        doc(owner, 'accessRequests/req-4'),
        pendingRequestData({ schoolId: 'some-other-school' }),
      ),
    );
  });

  it("denies a request targeting a uid that isn't an existing teacher member", async () => {
    await seedSchoolOwnerAndTarget();
    const owner = testEnv.authenticatedContext(OWNER_TEACHER_UID).firestore();
    await assertFails(
      setDoc(
        doc(owner, 'accessRequests/req-5'),
        pendingRequestData({ targetUid: 'not-a-member' }),
      ),
    );
  });

  it('denies an owner naming themselves as the target', async () => {
    await seedSchoolOwnerAndTarget();
    const owner = testEnv.authenticatedContext(OWNER_TEACHER_UID).firestore();
    await assertFails(
      setDoc(
        doc(owner, 'accessRequests/req-6'),
        pendingRequestData({ targetUid: OWNER_TEACHER_UID }),
      ),
    );
  });

  it('lets an admin approve a pending request, but denies the requester (non-admin) resolving it themselves', async () => {
    await seedSchoolOwnerAndTarget();
    const owner = testEnv.authenticatedContext(OWNER_TEACHER_UID).firestore();
    await setDoc(doc(owner, 'accessRequests/req-7'), pendingRequestData());

    await assertFails(
      setDoc(
        doc(owner, 'accessRequests/req-7'),
        { status: 'approved', resolvedByUid: OWNER_TEACHER_UID, resolvedAt: new Date() },
        { merge: true },
      ),
    );

    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    await assertSucceeds(
      setDoc(
        doc(delegate, 'accessRequests/req-7'),
        { status: 'approved', resolvedByUid: DELEGATE_UID, resolvedAt: new Date() },
        { merge: true },
      ),
    );
  });

  it('denies re-resolving an already-resolved request', async () => {
    await seedSchoolOwnerAndTarget();
    const owner = testEnv.authenticatedContext(OWNER_TEACHER_UID).firestore();
    await setDoc(doc(owner, 'accessRequests/req-8'), pendingRequestData());
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    await setDoc(
      doc(delegate, 'accessRequests/req-8'),
      { status: 'declined', resolvedByUid: DELEGATE_UID, resolvedAt: new Date() },
      { merge: true },
    );

    await assertFails(
      setDoc(
        doc(delegate, 'accessRequests/req-8'),
        { status: 'approved', resolvedByUid: DELEGATE_UID, resolvedAt: new Date() },
        { merge: true },
      ),
    );
  });

  it('denies an admin changing a frozen field (level) alongside the status update', async () => {
    await seedSchoolOwnerAndTarget();
    const owner = testEnv.authenticatedContext(OWNER_TEACHER_UID).firestore();
    await setDoc(doc(owner, 'accessRequests/req-9'), pendingRequestData());
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();

    // Any change to level is rejected, regardless of whether the attempted
    // value is itself otherwise a valid app-level value — the rule just
    // compares old vs. new, it doesn't re-validate the enum here.
    await assertFails(
      setDoc(
        doc(delegate, 'accessRequests/req-9'),
        { status: 'approved', level: 'not-award', resolvedByUid: DELEGATE_UID, resolvedAt: new Date() },
        { merge: true },
      ),
    );
  });

  it("rejects creating a request with a level other than 'award' — the only grant level that exists", async () => {
    await seedSchoolOwnerAndTarget();
    const owner = testEnv.authenticatedContext(OWNER_TEACHER_UID).firestore();
    await assertFails(
      setDoc(doc(owner, 'accessRequests/req-bad-level'), pendingRequestData({ level: 'manage' })),
    );
  });

  it('lets the requester cancel their own pending request, but not once resolved', async () => {
    await seedSchoolOwnerAndTarget();
    const owner = testEnv.authenticatedContext(OWNER_TEACHER_UID).firestore();
    await setDoc(doc(owner, 'accessRequests/req-10'), pendingRequestData());
    await assertSucceeds(deleteDoc(doc(owner, 'accessRequests/req-10')));

    await setDoc(doc(owner, 'accessRequests/req-11'), pendingRequestData());
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    await setDoc(
      doc(delegate, 'accessRequests/req-11'),
      { status: 'approved', resolvedByUid: DELEGATE_UID, resolvedAt: new Date() },
      { merge: true },
    );
    await assertFails(deleteDoc(doc(owner, 'accessRequests/req-11')));
    await assertSucceeds(deleteDoc(doc(delegate, 'accessRequests/req-11')));
  });

  it('lets an admin, the requester, and the target read a request; denies an outsider', async () => {
    await seedSchoolOwnerAndTarget();
    const owner = testEnv.authenticatedContext(OWNER_TEACHER_UID).firestore();
    await setDoc(doc(owner, 'accessRequests/req-12'), pendingRequestData());

    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    const target = testEnv.authenticatedContext(TARGET_TEACHER_UID).firestore();
    const outsider = testEnv.authenticatedContext(OUTSIDER_UID).firestore();
    await assertSucceeds(getDoc(doc(delegate, 'accessRequests/req-12')));
    await assertSucceeds(getDoc(doc(owner, 'accessRequests/req-12')));
    await assertSucceeds(getDoc(doc(target, 'accessRequests/req-12')));
    await assertFails(getDoc(doc(outsider, 'accessRequests/req-12')));
  });

  it("resolves useAccessRequestsForContext's contextId-filtered LIST query for the classroom owner and an admin; denies an outsider", async () => {
    // Regression test for the same bug class as the students/transactions
    // list queries above: this rule used to check isAtLeastAdmin(schoolId)
    // directly, but the only real query here filters by contextId, not
    // schoolId — denying the whole query for every admin. isReadableClassroom
    // fixes it the same way, using contextId (already scalar here, no
    // array-indexing limitation to work around).
    await seedSchoolOwnerAndTarget();
    const owner = testEnv.authenticatedContext(OWNER_TEACHER_UID).firestore();
    await setDoc(doc(owner, 'accessRequests/req-13'), pendingRequestData());

    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    const outsider = testEnv.authenticatedContext(OUTSIDER_UID).firestore();

    for (const db of [owner, delegate]) {
      const snapshot = await assertSucceeds(
        getDocs(query(collection(db, 'accessRequests'), where('contextId', '==', CONTEXT_ID))),
      );
      if (snapshot.empty) {
        throw new Error('expected the accessRequests query to return the seeded request, got zero docs');
      }
    }
    await assertFails(
      getDocs(query(collection(outsider, 'accessRequests'), where('contextId', '==', CONTEXT_ID))),
    );
  });

  it("resolves usePendingAccessRequestsForSchool's schoolId-filtered LIST query for admins; denies an outsider", async () => {
    // Regression test: this rule had no schoolId branch at all, so
    // AccessRequestsPage's (and now the dashboard/School-hub badge's)
    // schoolId + status query was silently denied for every admin — the
    // pending count just stayed 0 with a console-only permission error,
    // never a visible failure. Fixed the same way as the contextId branch
    // above: isAtLeastAdmin(schoolId) resolved via a get()/exists() on the
    // caller's own member doc, keyed by the query-constrained schoolId.
    await seedSchoolOwnerAndTarget();
    await setDoc(doc(testEnv.authenticatedContext(OWNER_TEACHER_UID).firestore(), 'accessRequests/req-14'), pendingRequestData());

    const superAdmin = testEnv.authenticatedContext(SUPER_ADMIN_UID).firestore();
    const delegate = testEnv.authenticatedContext(DELEGATE_UID).firestore();
    const outsider = testEnv.authenticatedContext(OUTSIDER_UID).firestore();

    for (const db of [superAdmin, delegate]) {
      const snapshot = await assertSucceeds(
        getDocs(
          query(
            collection(db, 'accessRequests'),
            where('schoolId', '==', SCHOOL_ID),
            where('status', '==', 'pending'),
          ),
        ),
      );
      if (snapshot.empty) {
        throw new Error('expected the accessRequests query to return the seeded request, got zero docs');
      }
    }
    await assertFails(
      getDocs(
        query(
          collection(outsider, 'accessRequests'),
          where('schoolId', '==', SCHOOL_ID),
          where('status', '==', 'pending'),
        ),
      ),
    );
  });
});

describe('firestore.rules — student self-access (BR-1.3.3/1.4.1)', () => {
  const SUPER_ADMIN_UID = 'sa-super-admin-1';
  const OWNER_TEACHER_UID = 'sa-owner-teacher-1';
  const OTHER_TEACHER_UID = 'sa-other-teacher-1';
  const OUTSIDER_UID = 'sa-outsider-1';
  const SCHOOL_ID = 'sa-school-1';
  const CONTEXT_ID = 'sa-ctx-1';
  const STUDENT_ID = 'sa-student-1';
  const OTHER_STUDENT_ID = 'sa-student-2';
  const STUDENT_EMAIL = 'student@example.com';

  async function seedSchoolClassroomAndStudents() {
    const superAdmin = testEnv.authenticatedContext(SUPER_ADMIN_UID).firestore();
    await setDoc(doc(superAdmin, `schools/${SCHOOL_ID}`), {
      name: 'Riverside Elementary',
      founderUid: SUPER_ADMIN_UID,
      superAdminCount: 1,
      createdAt: new Date(),
    });
    await setDoc(doc(superAdmin, `schools/${SCHOOL_ID}/members/${SUPER_ADMIN_UID}`), {
      role: 'super_admin',
      displayName: 'Principal',
      email: 'principal@example.com',
      addedByUid: SUPER_ADMIN_UID,
      createdAt: new Date(),
    });
    await setDoc(doc(superAdmin, `schools/${SCHOOL_ID}/members/${OWNER_TEACHER_UID}`), {
      role: 'teacher',
      displayName: 'Owning Teacher',
      email: 'owner-teacher@example.com',
      scope: { type: 'own' },
      addedByUid: SUPER_ADMIN_UID,
      createdAt: new Date(),
    });
    await setDoc(doc(superAdmin, `schools/${SCHOOL_ID}/members/${OTHER_TEACHER_UID}`), {
      role: 'teacher',
      displayName: 'Unrelated Teacher',
      email: 'other-teacher@example.com',
      scope: { type: 'own' },
      addedByUid: SUPER_ADMIN_UID,
      createdAt: new Date(),
    });

    const owner = testEnv.authenticatedContext(OWNER_TEACHER_UID).firestore();
    await setDoc(doc(owner, `contexts/${CONTEXT_ID}`), {
      type: 'classroom',
      name: '4th Grade',
      ownerUids: [OWNER_TEACHER_UID],
      schoolId: SCHOOL_ID,
      gradeLevel: '4',
      createdAt: new Date(),
    });
    // Roster creation on a school-affiliated classroom is school-staff-only
    // (see canManageClassroom) — the owner alone can no longer add
    // students, so these two are seeded by the super admin instead.
    await setDoc(doc(superAdmin, `students/${STUDENT_ID}`), {
      firstName: 'Alex',
      lastName: 'Rivera',
      displayName: 'Alex Rivera',
      balanceCents: 500,
      contexts: { [CONTEXT_ID]: { type: 'classroom', role: 'member' } },
      contextId: CONTEXT_ID,
      ownerUids: [OWNER_TEACHER_UID],
      schoolId: SCHOOL_ID,
      gradeLevel: '4',
      createdAt: new Date(),
    });
    await setDoc(doc(superAdmin, `students/${OTHER_STUDENT_ID}`), {
      firstName: 'Jamie',
      lastName: 'Chen',
      displayName: 'Jamie Chen',
      balanceCents: 200,
      contexts: { [CONTEXT_ID]: { type: 'classroom', role: 'member' } },
      contextId: CONTEXT_ID,
      ownerUids: [OWNER_TEACHER_UID],
      schoolId: SCHOOL_ID,
      gradeLevel: '4',
      createdAt: new Date(),
    });
    await setDoc(doc(owner, `contexts/${CONTEXT_ID}/transactions/tx-1`), {
      studentId: STUDENT_ID,
      type: 'earn',
      amountCents: 500,
      reason: 'Starting balance',
      createdByUid: OWNER_TEACHER_UID,
      createdAt: new Date(),
      ownerUids: [OWNER_TEACHER_UID],
      schoolId: SCHOOL_ID,
      gradeLevel: '4',
    });
  }

  async function linkStudent() {
    // Sending the invite is school-staff-only for a school-affiliated
    // classroom (same as rename/delete/roster) — the owner alone can't.
    const superAdmin = testEnv.authenticatedContext(SUPER_ADMIN_UID).firestore();
    await setDoc(doc(superAdmin, `pendingStudentLinks/${STUDENT_EMAIL}`), {
      studentId: STUDENT_ID,
      invitedByUid: SUPER_ADMIN_UID,
      createdAt: new Date(),
    });
    const student = testEnv.authenticatedContext('sa-student-uid', { email: STUDENT_EMAIL }).firestore();
    await setDoc(doc(student, `students/${STUDENT_ID}`), { linkedUid: 'sa-student-uid' }, { merge: true });
    await deleteDoc(doc(student, `pendingStudentLinks/${STUDENT_EMAIL}`));
  }

  it('lets school staff create a pending student link, but denies the classroom owner and an unrelated teacher (school-affiliated classroom, staff-only)', async () => {
    await seedSchoolClassroomAndStudents();
    const superAdmin = testEnv.authenticatedContext(SUPER_ADMIN_UID).firestore();
    await assertSucceeds(
      setDoc(doc(superAdmin, `pendingStudentLinks/${STUDENT_EMAIL}`), {
        studentId: STUDENT_ID,
        invitedByUid: SUPER_ADMIN_UID,
        createdAt: new Date(),
      }),
    );
    await deleteDoc(doc(superAdmin, `pendingStudentLinks/${STUDENT_EMAIL}`));

    // Ownership alone no longer suffices, same as rename/delete/roster.
    const owner = testEnv.authenticatedContext(OWNER_TEACHER_UID).firestore();
    await assertFails(
      setDoc(doc(owner, `pendingStudentLinks/${STUDENT_EMAIL}`), {
        studentId: STUDENT_ID,
        invitedByUid: OWNER_TEACHER_UID,
        createdAt: new Date(),
      }),
    );

    const otherTeacher = testEnv.authenticatedContext(OTHER_TEACHER_UID).firestore();
    await assertFails(
      setDoc(doc(otherTeacher, `pendingStudentLinks/${STUDENT_EMAIL}`), {
        studentId: STUDENT_ID,
        invitedByUid: OTHER_TEACHER_UID,
        createdAt: new Date(),
      }),
    );
  });

  it('denies spoofing invitedByUid on a pending student link', async () => {
    await seedSchoolClassroomAndStudents();
    const superAdmin = testEnv.authenticatedContext(SUPER_ADMIN_UID).firestore();
    await assertFails(
      setDoc(doc(superAdmin, `pendingStudentLinks/${STUDENT_EMAIL}`), {
        studentId: STUDENT_ID,
        invitedByUid: OTHER_TEACHER_UID,
        createdAt: new Date(),
      }),
    );
  });

  it('lets a student claim a pending link matching their verified email, exactly once', async () => {
    await seedSchoolClassroomAndStudents();
    const superAdmin = testEnv.authenticatedContext(SUPER_ADMIN_UID).firestore();
    await setDoc(doc(superAdmin, `pendingStudentLinks/${STUDENT_EMAIL}`), {
      studentId: STUDENT_ID,
      invitedByUid: SUPER_ADMIN_UID,
      createdAt: new Date(),
    });

    const student = testEnv.authenticatedContext('sa-student-uid', { email: STUDENT_EMAIL }).firestore();
    await assertSucceeds(
      setDoc(doc(student, `students/${STUDENT_ID}`), { linkedUid: 'sa-student-uid' }, { merge: true }),
    );
    // The real claim flow deletes the pending link once claimed (see
    // claimPendingStudentLinkIfAny) — do the same here before recreating it
    // below, or the recreate would be an update (no rule permits) rather
    // than a fresh create.
    await deleteDoc(doc(superAdmin, `pendingStudentLinks/${STUDENT_EMAIL}`));

    // First-claim-wins: a second claimant (even with a fresh pending link
    // re-created for a different uid) is denied — the record is already linked.
    await setDoc(doc(superAdmin, `pendingStudentLinks/${STUDENT_EMAIL}`), {
      studentId: STUDENT_ID,
      invitedByUid: SUPER_ADMIN_UID,
      createdAt: new Date(),
    });
    const impersonator = testEnv.authenticatedContext('sa-impersonator-uid', { email: STUDENT_EMAIL }).firestore();
    await assertFails(
      setDoc(doc(impersonator, `students/${STUDENT_ID}`), { linkedUid: 'sa-impersonator-uid' }, { merge: true }),
    );
  });

  it('lets a linked student read their own student doc and transactions, but nothing else', async () => {
    await seedSchoolClassroomAndStudents();
    await linkStudent();
    const student = testEnv.authenticatedContext('sa-student-uid', { email: STUDENT_EMAIL }).firestore();

    await assertSucceeds(getDoc(doc(student, `students/${STUDENT_ID}`)));
    await assertSucceeds(getDoc(doc(student, `contexts/${CONTEXT_ID}/transactions/tx-1`)));

    await assertFails(getDoc(doc(student, `students/${OTHER_STUDENT_ID}`)));
    await assertFails(getDoc(doc(student, `contexts/${CONTEXT_ID}`)));
  });

  it('denies a linked student any write on their own student doc or a new transaction', async () => {
    await seedSchoolClassroomAndStudents();
    await linkStudent();
    const student = testEnv.authenticatedContext('sa-student-uid', { email: STUDENT_EMAIL }).firestore();

    await assertFails(setDoc(doc(student, `students/${STUDENT_ID}`), { displayName: 'Hacked' }, { merge: true }));
    await assertFails(deleteDoc(doc(student, `students/${STUDENT_ID}`)));
    await assertFails(
      setDoc(doc(student, `contexts/${CONTEXT_ID}/transactions/tx-self`), {
        studentId: STUDENT_ID,
        type: 'earn',
        amountCents: 1000000,
        reason: 'Self-serve',
        createdByUid: 'sa-student-uid',
        createdAt: new Date(),
        schoolId: SCHOOL_ID,
        gradeLevel: '4',
      }),
    );
  });

  it('lets staff clear linkedUid (unlink) but never set it to an arbitrary uid via the normal update path', async () => {
    await seedSchoolClassroomAndStudents();
    await linkStudent();
    // canManageClassroom-gated, same as rename/delete/roster — the
    // classroom's own (non-admin) owner no longer qualifies as "staff"
    // here, so this uses an admin throughout.
    const superAdmin = testEnv.authenticatedContext(SUPER_ADMIN_UID).firestore();

    // A normal field edit must leave linkedUid untouched — implicitly
    // verified by this succeeding at all under the restructured update
    // rule's first branch — and explicitly verified by reading it back.
    await assertSucceeds(
      setDoc(doc(superAdmin, `students/${STUDENT_ID}`), { lastName: 'Riviera' }, { merge: true }),
    );
    const afterRename = await getDoc(doc(superAdmin, `students/${STUDENT_ID}`));
    if (afterRename.data()?.linkedUid !== 'sa-student-uid') {
      throw new Error('linkedUid was unexpectedly altered by an unrelated field edit');
    }

    // Staff CAN unlink (clear to null)...
    await assertSucceeds(
      setDoc(doc(superAdmin, `students/${STUDENT_ID}`), { linkedUid: null }, { merge: true }),
    );
    // ...but cannot directly hijack it to an arbitrary uid.
    await assertFails(
      setDoc(doc(superAdmin, `students/${STUDENT_ID}`), { linkedUid: 'sa-hijacker-uid' }, { merge: true }),
    );
  });
});
