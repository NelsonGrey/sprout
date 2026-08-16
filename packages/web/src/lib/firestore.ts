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
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { ClassroomContext, LedgerTransaction, Student, TransactionType } from '@sprout/shared';
import { firebaseClient } from './firebase';

const db = firebaseClient.firestore;

function contextFromDoc(d: QueryDocumentSnapshot<DocumentData>): ClassroomContext {
  const data = d.data();
  return {
    id: d.id,
    type: data.type,
    name: data.name,
    ownerUids: data.ownerUids,
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

export async function createClassroom({
  name,
  ownerUid,
  ownerDisplayName,
  ownerEmail,
}: {
  name: string;
  ownerUid: string;
  ownerDisplayName?: string | null;
  ownerEmail?: string | null;
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
}: {
  contextId: string;
  displayName: string;
  ownerUids: string[];
}): Promise<void> {
  await addDoc(collection(db, 'students'), {
    displayName,
    balanceCents: 0,
    contexts: { [contextId]: { type: 'classroom', role: 'member' } },
    contextIds: [contextId],
    ownerUids,
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
