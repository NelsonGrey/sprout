// One-off backfill for the students.contextIds -> students.contextId
// rename (see firestore.rules' isReadableClassroom). Sets contextId from
// the first (only) element of the legacy contextIds array wherever
// contextId is missing. Safe to re-run — skips docs that already have
// contextId set.
//
// Requires valid Application Default Credentials for an account with
// Firestore access on the target project — run
// `gcloud auth application-default login` first if
// `gcloud auth application-default print-access-token` fails.
//
// Guarded behind an explicit env var so this can never run by accident:
//   CONFIRM_REAL_FIREBASE=yes node scripts/backfill-student-context-id.mjs [projectId]

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (process.env.CONFIRM_REAL_FIREBASE !== 'yes') {
  console.error(
    'Refusing to run: this writes real data to a real Firebase project ' +
      '(not the emulator). Re-run with CONFIRM_REAL_FIREBASE=yes to proceed.',
  );
  process.exit(1);
}

const PROJECT_ID = process.argv[2] ?? 'nelsongrey-sprout-dev';

const app = initializeApp({ projectId: PROJECT_ID });
const db = getFirestore(app);

const snapshot = await db.collection('students').get();
console.log(`Found ${snapshot.size} student document(s) in ${PROJECT_ID}.`);

let updated = 0;
let skipped = 0;
let empty = 0;
const batch = db.batch();

for (const docSnap of snapshot.docs) {
  const data = docSnap.data();
  if (data.contextId !== undefined) {
    skipped += 1;
    continue;
  }
  const legacy = Array.isArray(data.contextIds) ? data.contextIds : [];
  if (legacy.length === 0) {
    console.warn(`  student ${docSnap.id}: no contextIds to backfill from — leaving as-is.`);
    empty += 1;
    continue;
  }
  batch.update(docSnap.ref, { contextId: legacy[0] });
  updated += 1;
}

if (updated > 0) {
  await batch.commit();
}

console.log(`Backfilled ${updated}, already-set ${skipped}, no-source-data ${empty}.`);
