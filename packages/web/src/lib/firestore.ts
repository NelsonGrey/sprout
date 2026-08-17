import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { ClassroomContext, LedgerTransaction, PendingStudentLink, Student, TransactionType } from '@sprout/shared';
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

export function studentFromDoc(d: QueryDocumentSnapshot<DocumentData>): Student {
  const data = d.data();
  return {
    id: d.id,
    firstName: data.firstName,
    lastName: data.lastName,
    displayName: data.displayName,
    studentId: data.studentId,
    balanceCents: data.balanceCents,
    contexts: data.contexts,
    contextIds: data.contextIds,
    ownerUids: data.ownerUids,
    schoolId: data.schoolId,
    gradeLevel: data.gradeLevel,
    contextName: data.contextName,
    linkedUid: data.linkedUid,
    createdAt: (data.createdAt as Timestamp | undefined)?.toDate() ?? new Date(),
  };
}

/** "Mary Jane Smith" -> {first: "Mary Jane", last: "Smith"} — splits on the
 * last whitespace so the existing single-box quick-add UI can keep working
 * unchanged while the stored record gets structured first/last fields. A
 * single-word name (no space) becomes an empty last name. */
export function splitDisplayName(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim();
  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace === -1) return { firstName: trimmed, lastName: '' };
  return { firstName: trimmed.slice(0, lastSpace).trim(), lastName: trimmed.slice(lastSpace + 1).trim() };
}

function combineDisplayName(firstName: string, lastName: string): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
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

/** Rename or re-grade a classroom. Not cascading — students' contextIds
 * pointing at a since-deleted classroom aren't cleaned up by deleteClassroom
 * below; there's no batch/cascade infrastructure for that yet. */
export async function updateClassroom(
  contextId: string,
  updates: { name?: string; gradeLevel?: string },
): Promise<void> {
  await updateDoc(doc(db, 'contexts', contextId), { ...updates });
}

export async function deleteClassroom(contextId: string): Promise<void> {
  await deleteDoc(doc(db, 'contexts', contextId));
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
  firstName,
  lastName,
  studentId,
  ownerUids,
  schoolId,
  gradeLevel,
  contextName,
}: {
  contextId: string;
  firstName: string;
  lastName: string;
  studentId?: string;
  ownerUids: string[];
  schoolId?: string;
  gradeLevel?: string;
  contextName?: string;
}): Promise<void> {
  await addDoc(collection(db, 'students'), {
    firstName,
    lastName,
    displayName: combineDisplayName(firstName, lastName),
    ...(studentId ? { studentId } : {}),
    balanceCents: 0,
    contexts: { [contextId]: { type: 'classroom', role: 'member' } },
    contextIds: [contextId],
    ownerUids,
    ...(schoolId ? { schoolId } : {}),
    ...(gradeLevel ? { gradeLevel } : {}),
    ...(contextName ? { contextName } : {}),
    createdAt: serverTimestamp(),
  });
}

/** Not cascading — a deleted student's transactions subcollection (owned by
 * the context, not the student) is orphaned but inert, never queried
 * without a studentId filter that would now just return nothing new.
 * firstName/lastName must be updated together (both or neither) — a
 * partial name update would leave displayName recombined from a stale
 * half; callers editing a name always present both fields at once. */
export async function updateStudent(
  id: string,
  updates: { firstName?: string; lastName?: string; studentId?: string; gradeLevel?: string },
): Promise<void> {
  const data: Record<string, unknown> = { ...updates };
  if (updates.firstName !== undefined && updates.lastName !== undefined) {
    data.displayName = combineDisplayName(updates.firstName, updates.lastName);
  }
  await updateDoc(doc(db, 'students', id), data);
}

export async function deleteStudent(studentId: string): Promise<void> {
  await deleteDoc(doc(db, 'students', studentId));
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
  schoolId,
  gradeLevel,
}: {
  contextId: string;
  studentId: string;
  type: TransactionType;
  amountCents: number;
  reason: string;
  createdByUid: string;
  ownerUids: string[];
  // Denormalized from the student, so a scoped/delegated (not just
  // owning) teacher's award actually satisfies the transactions rule's
  // hasAwardAccess check — without these, only direct owners could ever
  // record a transaction, regardless of scope/classroomGrants.
  schoolId?: string;
  gradeLevel?: string;
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
    ...(schoolId ? { schoolId } : {}),
    ...(gradeLevel ? { gradeLevel } : {}),
  });

  const delta = type === 'earn' ? amountCents : -amountCents;
  batch.update(doc(db, 'students', studentId), { balanceCents: increment(delta) });

  await batch.commit();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function pendingStudentLinkFromDoc(d: QueryDocumentSnapshot<DocumentData>): PendingStudentLink {
  const data = d.data();
  return {
    email: d.id,
    studentId: data.studentId,
    invitedByUid: data.invitedByUid,
    createdAt: (data.createdAt as Timestamp | undefined)?.toDate() ?? new Date(),
  };
}

/** Records that [email] should be linked to [studentId] the first time
 * that email signs in — see claimPendingStudentLinkIfAny. Only a staff
 * member with manage access to the student's classroom may call this
 * (enforced by firestore.rules' canManageStudentLink, not just this UI). */
export async function linkStudentAccount({
  studentId,
  email,
  invitedByUid,
}: {
  studentId: string;
  email: string;
  invitedByUid: string;
}): Promise<void> {
  await setDoc(doc(db, 'pendingStudentLinks', normalizeEmail(email)), {
    studentId,
    invitedByUid,
    createdAt: serverTimestamp(),
  });
}

export async function cancelStudentLink(email: string): Promise<void> {
  await deleteDoc(doc(db, 'pendingStudentLinks', normalizeEmail(email)));
}

export function usePendingStudentLinkForStudent(studentId: string | undefined): PendingStudentLink | null {
  const [invite, setInvite] = useState<PendingStudentLink | null>(null);

  useEffect(() => {
    if (!studentId) {
      setInvite(null);
      return;
    }
    const q = query(collection(db, 'pendingStudentLinks'), where('studentId', '==', studentId));
    return onSnapshot(q, (snapshot) => setInvite(snapshot.empty ? null : pendingStudentLinkFromDoc(snapshot.docs[0])));
  }, [studentId]);

  return invite;
}

/** Staff clearing a linked account — the only way to free up a mis-linked
 * record for relinking (firestore.rules enforces first-claim-wins, so a
 * second claim attempt is denied without this). */
export async function unlinkStudentAccount(studentId: string): Promise<void> {
  await updateDoc(doc(db, 'students', studentId), { linkedUid: deleteField() });
}

/** Runs once after every sign-in, alongside claimPendingInviteIfAny: if a
 * pending student link exists for [email], links this account to that
 * student's roster record (sets students/{studentId}.linkedUid) and
 * deletes the pending link. No-op if there's no matching pending link —
 * the normal case for every non-student user. */
export async function claimPendingStudentLinkIfAny({
  uid,
  email,
}: {
  uid: string;
  email: string;
}): Promise<void> {
  const normalized = normalizeEmail(email);
  const linkRef = doc(db, 'pendingStudentLinks', normalized);
  const linkSnapshot = await getDoc(linkRef);
  const link = linkSnapshot.data();
  if (!link) return;

  const batch = writeBatch(db);
  batch.update(doc(db, 'students', link.studentId), { linkedUid: uid });
  batch.delete(linkRef);
  await batch.commit();
}

/** The student roster record linked to [uid], if any — undefined while
 * loading, null once loaded if this account isn't linked to a student.
 * Queries `where linkedUid == uid` rather than reading a classroom's full
 * roster (useStudents), since firestore.rules' isLinkedStudentSelf only
 * ever matches the caller's own doc — any broader query would be denied
 * outright the moment a classroom has more than one student. */
export function useLinkedStudent(uid: string): Student | null | undefined {
  const [student, setStudent] = useState<Student | null | undefined>(undefined);

  useEffect(() => {
    const q = query(collection(db, 'students'), where('linkedUid', '==', uid));
    return onSnapshot(q, (snapshot) => setStudent(snapshot.empty ? null : studentFromDoc(snapshot.docs[0])));
  }, [uid]);

  return student;
}
