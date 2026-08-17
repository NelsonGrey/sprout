// Creates the same set of role/scope test personas as
// seed-emulator-accounts.mjs, but against the REAL nelsongrey-sprout-dev
// Firebase project (Auth + Firestore), not the local emulator.
//
// Requires valid Application Default Credentials for an account with
// Editor/Owner (or equivalent Firebase Auth Admin + Firestore) access on
// the project — run `gcloud auth application-default login` first if
// `gcloud auth application-default print-access-token` fails.
//
// Guarded behind an explicit env var so this can never run by accident:
//   CONFIRM_REAL_FIREBASE=yes node scripts/seed-real-dev-accounts.mjs

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

if (process.env.CONFIRM_REAL_FIREBASE !== 'yes') {
  console.error(
    'Refusing to run: this writes real data to the nelsongrey-sprout-dev ' +
      'Firebase project (not the emulator). Re-run with ' +
      'CONFIRM_REAL_FIREBASE=yes to proceed.',
  );
  process.exit(1);
}

const PROJECT_ID = 'nelsongrey-sprout-dev';
const PASSWORD = 'sprouttest1';
const GHOST_OWNER_UID = 'ghost-owner-1';

const app = initializeApp({ projectId: PROJECT_ID });
const auth = getAuth(app);
const db = getFirestore(app);

async function createTestUser({ email, displayName }) {
  try {
    return await auth.createUser({ email, password: PASSWORD, displayName, emailVerified: true });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      return auth.getUserByEmail(email);
    }
    throw error;
  }
}

async function main() {
  console.log('Seeding REAL project: %s\n', PROJECT_ID);

  const superAdmin = await createTestUser({ email: 'super1@test.sprout', displayName: 'Super Admin' });
  const admin = await createTestUser({ email: 'admin1@test.sprout', displayName: 'Office Manager' });
  const teacherOwn = await createTestUser({ email: 'teacher.own@test.sprout', displayName: 'Ms. Own-Scope' });
  const teacherGrades = await createTestUser({ email: 'teacher.grades@test.sprout', displayName: 'Mr. Grade-Scope' });
  const teacherSchool = await createTestUser({ email: 'teacher.school@test.sprout', displayName: 'Coach Whole-School' });

  const schoolRef = db.collection('schools').doc();
  const schoolId = schoolRef.id;

  await schoolRef.set({
    name: 'Test Elementary',
    founderUid: superAdmin.uid,
    superAdminCount: 1,
    createdAt: FieldValue.serverTimestamp(),
  });

  const members = [
    { user: superAdmin, role: 'super_admin', addedBy: superAdmin.uid },
    { user: admin, role: 'admin', addedBy: superAdmin.uid },
    { user: teacherOwn, role: 'teacher', scope: { type: 'own' }, addedBy: admin.uid },
    { user: teacherGrades, role: 'teacher', scope: { type: 'grades', grades: ['4', '5'] }, addedBy: admin.uid },
    { user: teacherSchool, role: 'teacher', scope: { type: 'school' }, addedBy: admin.uid },
  ];

  for (const m of members) {
    await schoolRef.collection('members').doc(m.user.uid).set({
      role: m.role,
      displayName: m.user.displayName,
      email: m.user.email,
      ...(m.scope ? { scope: m.scope } : {}),
      addedByUid: m.addedBy,
      createdAt: FieldValue.serverTimestamp(),
    });
    await db.collection('users').doc(m.user.uid).set(
      {
        displayName: m.user.displayName,
        email: m.user.email,
        schoolIds: FieldValue.arrayUnion(schoolId),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  const classrooms = [
    { id: 'ctx-grade-3', name: '3rd Grade - Room 12', gradeLevel: '3', owner: teacherOwn.uid },
    { id: 'ctx-grade-4', name: '4th Grade - Room 8', gradeLevel: '4', owner: GHOST_OWNER_UID },
    { id: 'ctx-grade-5', name: '5th Grade - Room 14', gradeLevel: '5', owner: GHOST_OWNER_UID },
  ];
  for (const c of classrooms) {
    await db.collection('contexts').doc(c.id).set({
      type: 'classroom',
      name: c.name,
      ownerUids: [c.owner],
      schoolId,
      gradeLevel: c.gradeLevel,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  const students = [
    { id: 'student-alex', name: 'Alex', contextId: 'ctx-grade-3', gradeLevel: '3', owner: teacherOwn.uid, balanceCents: 850 },
    { id: 'student-jamie', name: 'Jamie', contextId: 'ctx-grade-4', gradeLevel: '4', owner: GHOST_OWNER_UID, balanceCents: 400 },
    { id: 'student-sam', name: 'Sam', contextId: 'ctx-grade-5', gradeLevel: '5', owner: GHOST_OWNER_UID, balanceCents: 1200 },
  ];
  for (const s of students) {
    await db.collection('students').doc(s.id).set({
      displayName: s.name,
      balanceCents: s.balanceCents,
      contexts: { [s.contextId]: { type: 'classroom', role: 'member' } },
      contextIds: [s.contextId],
      ownerUids: [s.owner],
      schoolId,
      gradeLevel: s.gradeLevel,
      createdAt: FieldValue.serverTimestamp(),
    });
    await db
      .collection('contexts')
      .doc(s.contextId)
      .collection('transactions')
      .doc()
      .set({
        studentId: s.id,
        type: 'earn',
        amountCents: s.balanceCents,
        reason: 'Starting balance (seed data)',
        createdByUid: s.owner,
        createdAt: FieldValue.serverTimestamp(),
        ownerUids: [s.owner],
      });
  }

  console.log('\nSeed complete — Test Elementary (%s) in REAL project %s\n', schoolId, PROJECT_ID);
  console.log('Test accounts (password for all: %s):', PASSWORD);
  console.log('  super1@test.sprout          — super admin');
  console.log('  admin1@test.sprout          — admin (delegate)');
  console.log("  teacher.own@test.sprout     — teacher, scope 'own' (owns 3rd Grade)");
  console.log("  teacher.grades@test.sprout  — teacher, scope 'grades' [4, 5]");
  console.log("  teacher.school@test.sprout  — teacher, scope 'school' (whole-school specialist)\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
