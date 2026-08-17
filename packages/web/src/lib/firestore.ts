import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { ClassroomContext, LedgerTransaction, Student, TransactionType } from '@sprout/shared';
import { firebaseClient } from './firebase';

const db = firebaseClient.firestore;

function contextFromDoc(d: DocumentSnapshot<DocumentData>): ClassroomContext {
  const data = d.data()!;
  return {
    id: d.id,
    type: data.type,
    name: data.name,
    ownerUids: data.ownerUids,
    schoolId: data.schoolId,
    gradeLevel: data.gradeLevel,
    createdAt: (data.createdAt as Timestamp | undefined)?.toDate() ?? new Date(),
  };
}

function studentFromDoc(d: QueryDocumentSnapshot<DocumentData>): Student {
  const data = d.data();
  return {
    id: d.id,
    displayName: data.displayName,
    balanceCents: data.balanceCents,
    contexts: data.contexts,
    contextIds: data.contextIds,
    ownerUids: data.ownerUids,
    schoolId: data.schoolId,
    gradeLevel: data.gradeLevel,
    createdAt: (data.createdAt as Timestamp | undefined)?.toDate() ?? new Date(),
  };
}

function transactionFromDoc(d: QueryDocumentSnapshot<DocumentData>): LedgerTransaction {
  const data = d.data();
  return {
    id: d.id,
    studentId: data.studentId,
    type: data.type,
    amountCents: data.amountCents,
    reason: data.reason,
    createdByUid: data.createdByUid,
    // A pending server timestamp reads back as null right after a local
    // write, before the round-trip lands — fall back to "now".
    createdAt: (data.createdAt as Timestamp | undefined)?.toDate() ?? new Date(),
    ownerUids: data.ownerUids,
  };
}

export function useClassrooms(ownerUid: string): ClassroomContext[] {
  const [classrooms, setClassrooms] = useState<ClassroomContext[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'contexts'),
      where('ownerUids', 'array-contains', ownerUid),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snapshot) => setClassrooms(snapshot.docs.map(contextFromDoc)));
  }, [ownerUid]);

  return classrooms;
}

/** A single classroom by id, regardless of ownership — for a classroom's
 * detail page, where the viewer may be an admin/super_admin or a
 * scoped-but-non-owning teacher rather than the direct owner. Relies on the
 * same firestore.rules read permission (isContextOwner || hasScopedAccess)
 * that already governs the list queries above; undefined while loading or
 * if the doc doesn't exist/isn't visible to this viewer. */
export function useClassroom(contextId: string): ClassroomContext | undefined {
  const [classroom, setClassroom] = useState<ClassroomContext | undefined>(undefined);

  useEffect(() => {
    return onSnapshot(doc(db, 'contexts', contextId), (snapshot) => {
      setClassroom(snapshot.exists() ? contextFromDoc(snapshot) : undefined);
    });
  }, [contextId]);

  return classroom;
}

/** Classrooms visible via a school-wide or grade-level scope grant
 * (BR-1.3.11/1.3.12), independent of direct ownership — the caller merges
 * this with useClassrooms client-side, de-duplicating by id. `gradeLevels`
 * undefined means whole-school scope; a list filters to those grades. */
export function useClassroomsInSchool(schoolId: string | undefined, gradeLevels?: string[]): ClassroomContext[] {
  const [classrooms, setClassrooms] = useState<ClassroomContext[]>([]);
  const gradeLevelsKey = gradeLevels?.join(',');

  useEffect(() => {
    if (!schoolId) {
      setClassrooms([]);
      return;
    }
    const constraints = [where('schoolId', '==', schoolId)];
    if (gradeLevelsKey !== undefined) {
      constraints.push(where('gradeLevel', 'in', gradeLevelsKey.split(',')));
    }
    const q = query(collection(db, 'contexts'), ...constraints);
    return onSnapshot(q, (snapshot) => setClassrooms(snapshot.docs.map(contextFromDoc)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gradeLevelsKey stands in for gradeLevels (array identity would re-fire every render)
  }, [schoolId, gradeLevelsKey]);

  return classrooms;
}

export async function createClassroom({
  name,
  ownerUid,
  ownerDisplayName,
  ownerEmail,
  schoolId,
  gradeLevel,
}: {
  name: string;
  ownerUid: string;
  ownerDisplayName?: string | null;
  ownerEmail?: string | null;
  schoolId?: string;
  gradeLevel?: string;
}): Promise<void> {
  const batch = writeBatch(db);

  const userRef = doc(db, 'users', ownerUid);
  batch.set(
    userRef,
    { displayName: ownerDisplayName ?? null, email: ownerEmail ?? null, createdAt: serverTimestamp() },
    { merge: true },
  );

  const contextRef = doc(collection(db, 'contexts'));
  batch.set(contextRef, {
    type: 'classroom',
    name,
    ownerUids: [ownerUid],
    ...(schoolId ? { schoolId } : {}),
    ...(gradeLevel ? { gradeLevel } : {}),
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

export function useStudents(contextId: string): Student[] {
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'students'),
      where('contextIds', 'array-contains', contextId),
      orderBy('displayName'),
    );
    return onSnapshot(q, (snapshot) => setStudents(snapshot.docs.map(studentFromDoc)));
  }, [contextId]);

  return students;
}

export async function addStudent({
  contextId,
  displayName,
  ownerUids,
  schoolId,
  gradeLevel,
}: {
  contextId: string;
  displayName: string;
  ownerUids: string[];
  schoolId?: string;
  gradeLevel?: string;
}): Promise<void> {
  await addDoc(collection(db, 'students'), {
    displayName,
    balanceCents: 0,
    contexts: { [contextId]: { type: 'classroom', role: 'member' } },
    contextIds: [contextId],
    ownerUids,
    ...(schoolId ? { schoolId } : {}),
    ...(gradeLevel ? { gradeLevel } : {}),
    createdAt: serverTimestamp(),
  });
}

export function useTransactions(contextId: string, studentId: string): LedgerTransaction[] {
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'contexts', contextId, 'transactions'),
      where('studentId', '==', studentId),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snapshot) => setTransactions(snapshot.docs.map(transactionFromDoc)));
  }, [contextId, studentId]);

  return transactions;
}

export async function recordTransaction({
  contextId,
  studentId,
  type,
  amountCents,
  reason,
  createdByUid,
  ownerUids,
}: {
  contextId: string;
  studentId: string;
  type: TransactionType;
  amountCents: number;
  reason: string;
  createdByUid: string;
  ownerUids: string[];
}): Promise<void> {
  // A batch (not a runTransaction) is enough: increment() is itself atomic
  // and this write doesn't depend on reading the current balance first.
  const batch = writeBatch(db);

  const transactionRef = doc(collection(db, 'contexts', contextId, 'transactions'));
  batch.set(transactionRef, {
    studentId,
    type,
    amountCents,
    reason,
    createdByUid,
    createdAt: serverTimestamp(),
    ownerUids,
  });

  const delta = type === 'earn' ? amountCents : -amountCents;
  batch.update(doc(db, 'students', studentId), { balanceCents: increment(delta) });

  await batch.commit();
}
