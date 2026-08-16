import { readFileSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
