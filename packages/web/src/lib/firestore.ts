import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
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
import type { ClassroomContext, Goal, LedgerTransaction, PendingStudentLink, SavingsLabel, SpendCategory, StoreItem, Student, TransactionType } from '@sprout/shared';
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
  // firstName/lastName are absent on students created before the Phase 1
  // roster migration (only displayName was ever written) — derive them so
  // every caller can rely on the type's non-optional contract.
  const { firstName, lastName } =
    data.firstName !== undefined && data.lastName !== undefined
      ? { firstName: data.firstName, lastName: data.lastName }
      : splitDisplayName(data.displayName ?? '');
  return {
    id: d.id,
    firstName,
    lastName,
    displayName: data.displayName,
    studentId: data.studentId,
    balanceCents: data.balanceCents,
    contexts: data.contexts,
    contextId: data.contextId,
    ownerUids: data.ownerUids,
    schoolId: data.schoolId,
    gradeLevel: data.gradeLevel,
    contextName: data.contextName,
    linkedUid: data.linkedUid,
    archivedAt: (data.archivedAt as Timestamp | undefined)?.toDate(),
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
    ...(data.savingsLabel ? { savingsLabel: data.savingsLabel } : {}),
    ...(data.goalId ? { goalId: data.goalId } : {}),
    ...(data.spendCategory ? { spendCategory: data.spendCategory } : {}),
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

/** Rename or re-grade a classroom. Not cascading — students' contextId
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

/** Single-owner replace, not append — matches createClassroom's
 * single-element-array convention. Reassigning to a different teacher IS
 * the unassign step (no separate call needed); pass ownerUid: null to leave
 * the classroom unassigned. Re-denormalizes ownerUids onto every existing
 * student in the classroom too — students carry their own copy of
 * ownerUids, used directly by firestore.rules' isContextOwner on student
 * update/delete (a live lookup on the classroom isn't performed there).
 * Skipping this would strand a newly-assigned non-admin owner without
 * write access to the pre-existing roster, or — for unassign — leave a
 * departed owner's isContextOwner check still true on those students even
 * after they lose the classroom and their school membership. Always
 * called by an admin (UI-gated), so these per-student writes are
 * authorized via hasManageAccess/isAtLeastAdmin, not isContextOwner — no
 * firestore.rules change needed on students. No users/{uid} write here
 * (unlike createClassroom): the caller is an admin acting on someone
 * else's behalf, and users/{userId} rules are isOwner(userId)-only —
 * bundling that write into this batch would fail the whole batch. */
export async function assignClassroomOwner(contextId: string, ownerUid: string | null): Promise<void> {
  const ownerUids = ownerUid ? [ownerUid] : [];
  const studentsSnapshot = await getDocs(query(collection(db, 'students'), where('contextId', '==', contextId)));
  const batch = writeBatch(db);
  batch.update(doc(db, 'contexts', contextId), { ownerUids });
  for (const studentDoc of studentsSnapshot.docs) {
    batch.update(studentDoc.ref, { ownerUids });
  }
  await batch.commit();
}

export function useStudents(contextId: string): Student[] {
  const [students, setStudents] = useState<Student[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'students'),
      where('contextId', '==', contextId),
      orderBy('displayName'),
    );
    // Archived (graduated) students never belong in an active classroom
    // roster — that's an admin-level lookup via StudentsPage's "Show
    // archived" toggle instead.
    return onSnapshot(q, (snapshot) => setStudents(snapshot.docs.map(studentFromDoc).filter((s) => !s.archivedAt)));
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
    contextId,
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

/** Every student in a school, independent of which classroom owns them —
 * for the school-wide Students admin list. Mirrors useClassroomsInSchool's
 * exact query shape (no server-side orderBy — sort client-side, same
 * convention that already avoids needing a composite index there). */
export function useStudentsInSchool(schoolId: string | undefined, gradeLevels?: string[]): Student[] {
  const [students, setStudents] = useState<Student[]>([]);
  const gradeLevelsKey = gradeLevels?.join(',');

  useEffect(() => {
    if (!schoolId) {
      setStudents([]);
      return;
    }
    const constraints = [where('schoolId', '==', schoolId)];
    if (gradeLevelsKey !== undefined) {
      constraints.push(where('gradeLevel', 'in', gradeLevelsKey.split(',')));
    }
    const q = query(collection(db, 'students'), ...constraints);
    return onSnapshot(q, (snapshot) => setStudents(snapshot.docs.map(studentFromDoc)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gradeLevelsKey stands in for gradeLevels (array identity would re-fire every render)
  }, [schoolId, gradeLevelsKey]);

  return students;
}

/** Reassigns a student to a different classroom — contextId/ownerUids/
 * schoolId/gradeLevel/contextName, never touches name/studentId.
 * ownerUids must be the destination classroom's actual owner(s), not left
 * stale from the old one: otherwise a non-admin teacher whose classroom
 * gains this student via reassignment would have no direct (isContextOwner)
 * access to them, only admins would. Callers are expected to already have
 * manage access on both the source and destination classroom
 * (firestore.rules enforces this regardless). */
export async function moveStudentToClassroom(
  studentId: string,
  target: { contextId: string; ownerUids: string[]; schoolId?: string; gradeLevel?: string; contextName?: string },
): Promise<void> {
  await updateDoc(doc(db, 'students', studentId), {
    contextId: target.contextId,
    contexts: { [target.contextId]: { type: 'classroom', role: 'member' } },
    ownerUids: target.ownerUids,
    ...(target.schoolId ? { schoolId: target.schoolId } : {}),
    ...(target.gradeLevel ? { gradeLevel: target.gradeLevel } : {}),
    ...(target.contextName ? { contextName: target.contextName } : {}),
  });
}

// Chunked at 400 ids/batch — Firestore's writeBatch caps at 500 operations
// and each id is exactly 1 (a single update/delete) — same convention as
// commitStudentImport.
const BULK_CHUNK_SIZE = 400;

export async function bulkMoveStudents(
  studentIds: string[],
  target: { contextId: string; ownerUids: string[]; schoolId?: string; gradeLevel?: string; contextName?: string },
): Promise<void> {
  for (let i = 0; i < studentIds.length; i += BULK_CHUNK_SIZE) {
    const batch = writeBatch(db);
    for (const id of studentIds.slice(i, i + BULK_CHUNK_SIZE)) {
      batch.update(doc(db, 'students', id), {
        contextId: target.contextId,
        contexts: { [target.contextId]: { type: 'classroom', role: 'member' } },
        ownerUids: target.ownerUids,
        ...(target.schoolId ? { schoolId: target.schoolId } : {}),
        ...(target.gradeLevel ? { gradeLevel: target.gradeLevel } : {}),
        ...(target.contextName ? { contextName: target.contextName } : {}),
      });
    }
    await batch.commit();
  }
}

export async function bulkDeleteStudents(studentIds: string[]): Promise<void> {
  for (let i = 0; i < studentIds.length; i += BULK_CHUNK_SIZE) {
    const batch = writeBatch(db);
    for (const id of studentIds.slice(i, i + BULK_CHUNK_SIZE)) {
      batch.delete(doc(db, 'students', id));
    }
    await batch.commit();
  }
}

/** Graduated/left-the-school students — a field flip, not a delete, so
 * balance and transaction history (contexts/{contextId}/transactions,
 * untouched by this) are preserved. Archived students drop out of active
 * classroom/roster views (see useStudents/StudentsPage's "Show archived"
 * toggle) but the doc itself, and everything it references, stays intact. */
export async function bulkArchiveStudents(studentIds: string[]): Promise<void> {
  for (let i = 0; i < studentIds.length; i += BULK_CHUNK_SIZE) {
    const batch = writeBatch(db);
    for (const id of studentIds.slice(i, i + BULK_CHUNK_SIZE)) {
      batch.update(doc(db, 'students', id), { archivedAt: serverTimestamp() });
    }
    await batch.commit();
  }
}

/** Un-archives a returning student. Their old classroom is almost always
 * gone or repurposed by the time they come back, so restoring always
 * reassigns them to a currently-chosen classroom in the same write that
 * clears archivedAt — never just a bare flag flip. */
export async function restoreStudents(
  studentIds: string[],
  target: { contextId: string; ownerUids: string[]; schoolId?: string; gradeLevel?: string; contextName?: string },
): Promise<void> {
  for (let i = 0; i < studentIds.length; i += BULK_CHUNK_SIZE) {
    const batch = writeBatch(db);
    for (const id of studentIds.slice(i, i + BULK_CHUNK_SIZE)) {
      batch.update(doc(db, 'students', id), {
        contextId: target.contextId,
        contexts: { [target.contextId]: { type: 'classroom', role: 'member' } },
        ownerUids: target.ownerUids,
        ...(target.schoolId ? { schoolId: target.schoolId } : {}),
        ...(target.gradeLevel ? { gradeLevel: target.gradeLevel } : {}),
        ...(target.contextName ? { contextName: target.contextName } : {}),
        archivedAt: deleteField(),
      });
    }
    await batch.commit();
  }
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
  savingsLabel,
  goalId,
  spendCategory,
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
  // Only meaningful (and only allowed by firestore.rules) on an 'earn' —
  // silently dropped for a 'spend' rather than making every call site
  // remember to omit it.
  savingsLabel?: SavingsLabel;
  // A specific goal this earn counts toward — implies savingsLabel:
  // 'goal' (set automatically below if the caller passed goalId without
  // it). Also dropped for a 'spend'.
  goalId?: string;
  // The need/want/both mirror of savingsLabel, for a 'spend'. Dropped for
  // an 'earn'.
  spendCategory?: SpendCategory;
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
    ...(type === 'earn' && (savingsLabel || goalId) ? { savingsLabel: goalId ? 'goal' : savingsLabel } : {}),
    ...(type === 'earn' && goalId ? { goalId } : {}),
    ...(type === 'spend' && spendCategory ? { spendCategory } : {}),
  });

  const delta = type === 'earn' ? amountCents : -amountCents;
  batch.update(doc(db, 'students', studentId), { balanceCents: increment(delta) });

  if (type === 'earn' && goalId) {
    batch.update(doc(db, 'students', studentId, 'goals', goalId), { savedCents: increment(amountCents) });
  }

  await batch.commit();
}

function goalFromDoc(d: QueryDocumentSnapshot<DocumentData>): Goal {
  const data = d.data();
  return {
    id: d.id,
    studentId: data.studentId,
    name: data.name,
    targetCents: data.targetCents,
    savedCents: data.savedCents,
    createdByUid: data.createdByUid,
    createdAt: (data.createdAt as Timestamp | undefined)?.toDate() ?? new Date(),
  };
}

export function useGoals(studentId: string): Goal[] {
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'students', studentId, 'goals'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => setGoals(snapshot.docs.map(goalFromDoc)));
  }, [studentId]);

  return goals;
}

export async function createGoal({
  studentId,
  name,
  targetCents,
  createdByUid,
}: {
  studentId: string;
  name: string;
  targetCents: number;
  createdByUid: string;
}): Promise<void> {
  await addDoc(collection(db, 'students', studentId, 'goals'), {
    studentId,
    name,
    targetCents,
    savedCents: 0,
    createdByUid,
    createdAt: serverTimestamp(),
  });
}

export async function deleteGoal(studentId: string, goalId: string): Promise<void> {
  await deleteDoc(doc(db, 'students', studentId, 'goals', goalId));
}

function storeItemFromDoc(d: QueryDocumentSnapshot<DocumentData>): StoreItem {
  const data = d.data();
  return {
    id: d.id,
    contextId: data.contextId,
    name: data.name,
    priceCents: data.priceCents,
    createdByUid: data.createdByUid,
    createdAt: (data.createdAt as Timestamp | undefined)?.toDate() ?? new Date(),
  };
}

export function useStoreItems(contextId: string): StoreItem[] {
  const [items, setItems] = useState<StoreItem[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'contexts', contextId, 'storeItems'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => setItems(snapshot.docs.map(storeItemFromDoc)));
  }, [contextId]);

  return items;
}

export async function createStoreItem({
  contextId,
  name,
  priceCents,
  createdByUid,
}: {
  contextId: string;
  name: string;
  priceCents: number;
  createdByUid: string;
}): Promise<void> {
  await addDoc(collection(db, 'contexts', contextId, 'storeItems'), {
    contextId,
    name,
    priceCents,
    createdByUid,
    createdAt: serverTimestamp(),
  });
}

// The "meet a surprise" step of the Classroom Store Budget lesson — a
// price changes mid-activity. Name is updatable too rather than a
// price-only setter, so a single form can handle both.
export async function updateStoreItem(
  contextId: string,
  itemId: string,
  updates: { name: string; priceCents: number },
): Promise<void> {
  await updateDoc(doc(db, 'contexts', contextId, 'storeItems', itemId), updates);
}

export async function deleteStoreItem(contextId: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'contexts', contextId, 'storeItems', itemId));
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

/** One parsed+validated CSV row, ready to commit. `existingId` is the
 * Firestore doc id of the student this row updates (matched by studentId
 * within the school, computed by the caller against useStudentsInSchool's
 * already-loaded data) — absent means create new. Reassignment is never
 * an implicit side effect of importing: a matched row updates
 * name/studentId/gradeLevel only, never contextId/ownerUids, even if the
 * chosen destination classroom differs from where the student already is. */
export interface StudentImportRow {
  firstName: string;
  lastName: string;
  studentId?: string;
  gradeLevel?: string;
  existingId?: string;
}

/** Chunked at 400 rows/batch — Firestore's writeBatch caps at 500
 * operations and each row is exactly 1 (a single set or update). */
export async function commitStudentImport(
  rows: StudentImportRow[],
  target: { contextId: string; ownerUids: string[]; schoolId: string; gradeLevel?: string; contextName: string },
): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    for (const row of rows.slice(i, i + CHUNK_SIZE)) {
      const displayName = combineDisplayName(row.firstName, row.lastName);
      const gradeLevel = row.gradeLevel || target.gradeLevel;
      if (row.existingId) {
        batch.update(doc(db, 'students', row.existingId), {
          firstName: row.firstName,
          lastName: row.lastName,
          displayName,
          ...(row.studentId ? { studentId: row.studentId } : {}),
          ...(gradeLevel ? { gradeLevel } : {}),
        });
      } else {
        batch.set(doc(collection(db, 'students')), {
          firstName: row.firstName,
          lastName: row.lastName,
          displayName,
          ...(row.studentId ? { studentId: row.studentId } : {}),
          balanceCents: 0,
          contexts: { [target.contextId]: { type: 'classroom', role: 'member' } },
          contextId: target.contextId,
          ownerUids: target.ownerUids,
          schoolId: target.schoolId,
          ...(gradeLevel ? { gradeLevel } : {}),
          contextName: target.contextName,
          createdAt: serverTimestamp(),
        });
      }
    }
    await batch.commit();
  }
}
