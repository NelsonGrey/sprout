// Seeds the local Firebase emulator with one test school covering every
// role/scope in the security matrix (BR-1.3.11/1.3.12), so the UI can be
// reviewed as each persona without waiting on real account provisioning
// (Cloud Functions/Admin SDK for real accounts live in the private
// sprout-functions repo, not available here — but the emulator accepts
// Admin SDK calls with no real credentials at all, which is what makes
// this script possible).
//
// Run via `npm run seed:emulator` from the repo root (wraps this in
// `firebase emulators:exec --export-on-exit=.emulator-seed`, so the
// result gets picked back up by every regular `npm run emulators` session
// afterward — see package.json).

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

// Defensive defaults for running this script directly against an
// already-running emulator — `firebase emulators:exec` already sets these.
process.env.FIRESTORE_EMULATOR_HOST ??= 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= 'localhost:9099';

// Must match the real project ID configured in firebase_options.dart /
// packages/web/.env — the emulator partitions its local data store by
// project ID, so seeding under the wrong one means the app never sees it.
const PROJECT_ID = 'nelsongrey-sprout-dev';
const PASSWORD = 'sprouttest1';
// Not a real account — a placeholder classroom owner so the grade/whole-
// school scope demos aren't muddied by the admin/teacher also happening to
// be a direct owner.
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
    { id: 'student-alex', firstName: 'Alex', lastName: 'Rivera', studentId: 'STU-1001', contextId: 'ctx-grade-3', gradeLevel: '3', owner: teacherOwn.uid, balanceCents: 850 },
    { id: 'student-jamie', firstName: 'Jamie', lastName: 'Chen', studentId: 'STU-1002', contextId: 'ctx-grade-4', gradeLevel: '4', owner: GHOST_OWNER_UID, balanceCents: 400 },
    { id: 'student-sam', firstName: 'Sam', lastName: 'Patel', studentId: 'STU-1003', contextId: 'ctx-grade-5', gradeLevel: '5', owner: GHOST_OWNER_UID, balanceCents: 1200 },
  ];
  for (const s of students) {
    await db.collection('students').doc(s.id).set({
      firstName: s.firstName,
      lastName: s.lastName,
      displayName: `${s.firstName} ${s.lastName}`,
      studentId: s.studentId,
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

  console.log('\nSeed complete — Test Elementary (%s)\n', schoolId);
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
