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
  // Two more directly-owning teachers, purely to give ClassroomsPage/the
  // master-detail student list more than one real (non-ghost-owned)
  // classroom to browse.
  const teacherFirst = await createTestUser({ email: 'teacher.first@test.sprout', displayName: 'Mx. First-Own' });
  const teacherSecond = await createTestUser({ email: 'teacher.second@test.sprout', displayName: 'Mr. Second-Own' });

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
    { user: teacherFirst, role: 'teacher', scope: { type: 'own' }, addedBy: admin.uid },
    { user: teacherSecond, role: 'teacher', scope: { type: 'own' }, addedBy: admin.uid },
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
    { id: 'ctx-grade-1', name: '1st Grade - Room 3', gradeLevel: '1', owner: teacherFirst.uid },
    { id: 'ctx-grade-2', name: '2nd Grade - Room 5', gradeLevel: '2', owner: teacherSecond.uid },
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

  // A real classroom-sized roster (not just one token student) per
  // classroom, so a browsed list — the master-detail student list, bulk
  // select, sort/search — has something realistic to work with. Balances
  // vary deterministically (not random) so a re-seed always produces the
  // same, reproducible data.
  const FIRST_NAMES = [
    'Alex', 'Jamie', 'Sam', 'Morgan', 'Casey', 'Riley', 'Jordan', 'Taylor',
    'Avery', 'Quinn', 'Rowan', 'Skyler', 'Emerson', 'Finley', 'Harper', 'Reese',
    'Dakota', 'Elliot', 'Hayden', 'Peyton', 'Kai', 'Remy', 'Sage', 'Wren',
    'Blake', 'Cameron', 'Drew', 'Frankie',
  ];
  const LAST_NAMES = [
    'Rivera', 'Chen', 'Patel', 'Nguyen', 'Garcia', 'Kim', 'Johnson', 'Brooks',
    'Martinez', 'Singh', 'Wright', 'Davis', 'Flores', 'Bennett', 'Cohen', 'Ortiz',
    'Diaz', 'Hughes', 'Torres', 'Reyes', 'Cole', 'Foster', 'Grant', 'Hayes',
    'Ibrahim', 'Jensen', 'Kaur', 'Lam',
  ];

  const students = [];
  let nameIndex = 0;
  let studentNumber = 1;
  for (const c of classrooms) {
    const rosterSize = 6;
    for (let i = 0; i < rosterSize; i++) {
      const firstName = FIRST_NAMES[nameIndex % FIRST_NAMES.length];
      const lastName = LAST_NAMES[nameIndex % LAST_NAMES.length];
      nameIndex++;
      students.push({
        id: `student-${c.id}-${i}`,
        firstName,
        lastName,
        studentId: `STU-${String(1000 + studentNumber++).padStart(4, '0')}`,
        contextId: c.id,
        gradeLevel: c.gradeLevel,
        owner: c.owner,
        // Cycles through a handful of realistic starting balances rather
        // than one flat amount for every student.
        balanceCents: [850, 400, 1200, 250, 675, 1500][i % 6],
      });
    }
  }
  for (const s of students) {
    await db.collection('students').doc(s.id).set({
      firstName: s.firstName,
      lastName: s.lastName,
      displayName: `${s.firstName} ${s.lastName}`,
      studentId: s.studentId,
      balanceCents: s.balanceCents,
      contexts: { [s.contextId]: { type: 'classroom', role: 'member' } },
      contextId: s.contextId,
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
  console.log('%d classrooms, %d students\n', classrooms.length, students.length);
  console.log('Test accounts (password for all: %s):', PASSWORD);
  console.log('  super1@test.sprout          — super admin');
  console.log('  admin1@test.sprout          — admin (delegate)');
  console.log("  teacher.own@test.sprout     — teacher, scope 'own' (owns 3rd Grade)");
  console.log("  teacher.grades@test.sprout  — teacher, scope 'grades' [4, 5]");
  console.log("  teacher.school@test.sprout  — teacher, scope 'school' (whole-school specialist)");
  console.log("  teacher.first@test.sprout   — teacher, scope 'own' (owns 1st Grade)");
  console.log("  teacher.second@test.sprout  — teacher, scope 'own' (owns 2nd Grade)\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
