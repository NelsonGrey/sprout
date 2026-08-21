import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
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
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type {
  ClassroomContext,
  FamilyMember,
  FamilyPolicyProfile,
  Goal,
  SavingsLabel,
  SpendCategory,
  TransactionType,
} from '@sprout/shared';
import { firebaseClient } from './firebase';
import { combineDisplayName, normalizeEmail } from './firestore';

const db = firebaseClient.firestore;

// ---- Family context ----
// contexts/{contextId} with type: 'family' reuses the exact same document
// shape (and Firestore path) as a classroom — useClassroom/useClassrooms'
// contextFromDoc parsing already works for either type, so this module
// only adds what's genuinely family-specific: creation (with a required
// policyProfileId — see below), and a type:'family'-filtered list query.
// See docs/detailed-design/06_FAMILY_MODE_TECHNICAL_DESIGN.md §1.

function familyContextFromDoc(d: QueryDocumentSnapshot<DocumentData>): ClassroomContext {
  const data = d.data();
  return {
    id: d.id,
    type: data.type,
    name: data.name,
    ownerUids: data.ownerUids,
    createdAt: (data.createdAt as Timestamp | undefined)?.toDate() ?? new Date(),
  };
}

/** Every family context this uid manages (owner or co-manager) — the
 * family-mode mirror of useClassrooms. */
export function useMyFamilyContexts(uid: string): ClassroomContext[] {
  const [contexts, setContexts] = useState<ClassroomContext[]>([]);

  useEffect(() => {
    if (!uid) {
      setContexts([]);
      return;
    }
    const q = query(
      collection(db, 'contexts'),
      where('type', '==', 'family'),
      where('ownerUids', 'array-contains', uid),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snapshot) => setContexts(snapshot.docs.map(familyContextFromDoc)));
  }, [uid]);

  return contexts;
}

/** Creates a family context — requires an existing, enabled
 * FamilyPolicyProfile (firestore.rules fails this closed otherwise; see
 * the technical design's §7). Never touches students/classroom data. */
export async function createFamilyContext({
  name,
  ownerUid,
  policyProfileId,
}: {
  name: string;
  ownerUid: string;
  policyProfileId: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, 'contexts'), {
    type: 'family',
    name,
    ownerUids: [ownerUid],
    policyProfileId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Whether this account carries the `platformAdmin` Firebase Auth custom
 * claim — the only identity allowed to author FamilyPolicyProfile
 * documents (see firestore.rules' isPlatformAdmin). Set only via the
 * Admin SDK; no self-serve path exists. undefined while the token claims
 * are still loading. */
export function usePlatformAdmin(user: User | null): boolean | undefined {
  const [isPlatformAdmin, setIsPlatformAdmin] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!user) {
      setIsPlatformAdmin(undefined);
      return;
    }
    user.getIdTokenResult().then((result) => setIsPlatformAdmin(result.claims.platformAdmin === true));
  }, [user]);

  return isPlatformAdmin;
}

// ---- Family policy profiles ----

function policyProfileFromDoc(d: QueryDocumentSnapshot<DocumentData>): FamilyPolicyProfile {
  const data = d.data();
  return {
    id: d.id,
    label: data.label,
    jurisdictionNote: data.jurisdictionNote,
    enabled: data.enabled,
    isPlatformDefault: data.isPlatformDefault,
    consentRequired: data.consentRequired,
    consentStatement: data.consentStatement,
    retentionDays: data.retentionDays ?? null,
    createdByUid: data.createdByUid,
    updatedByUid: data.updatedByUid,
    updatedAt: (data.updatedAt as Timestamp | undefined)?.toDate() ?? new Date(),
  };
}

/** Every enabled policy profile — the family-creation flow picks the
 * platform-default one automatically when exactly one exists, or offers a
 * picker when the operator has published more than one (e.g. by region).
 * All profiles (not just enabled ones) are readable per firestore.rules —
 * a platform-admin settings screen needs to see disabled ones too — but
 * this hook is specifically for the creation flow, so it filters here. */
export function useEnabledFamilyPolicyProfiles(): FamilyPolicyProfile[] {
  const [profiles, setProfiles] = useState<FamilyPolicyProfile[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'familyPolicyProfiles'), where('enabled', '==', true));
    return onSnapshot(q, (snapshot) => setProfiles(snapshot.docs.map(policyProfileFromDoc)));
  }, []);

  return profiles;
}

/** All policy profiles, enabled or not — for the platform-admin settings
 * screen. Firestore rules already gate WRITES to platform admins only;
 * reads are open to any authenticated user (profile content isn't
 * sensitive the way family data is), so this hook itself doesn't need a
 * capability check — the screen that renders edit controls does. */
export function useAllFamilyPolicyProfiles(): FamilyPolicyProfile[] {
  const [profiles, setProfiles] = useState<FamilyPolicyProfile[]>([]);

  useEffect(() => {
    return onSnapshot(collection(db, 'familyPolicyProfiles'), (snapshot) =>
      setProfiles(snapshot.docs.map(policyProfileFromDoc)),
    );
  }, []);

  return profiles;
}

export async function saveFamilyPolicyProfile({
  id,
  label,
  jurisdictionNote,
  enabled,
  isPlatformDefault,
  consentRequired,
  consentStatement,
  retentionDays,
  uid,
}: {
  id?: string;
  label: string;
  jurisdictionNote?: string;
  enabled: boolean;
  isPlatformDefault: boolean;
  consentRequired: boolean;
  consentStatement: string;
  retentionDays: number | null;
  uid: string;
}): Promise<void> {
  const data = {
    label,
    ...(jurisdictionNote ? { jurisdictionNote } : {}),
    enabled,
    isPlatformDefault,
    consentRequired,
    consentStatement,
    retentionDays,
    updatedByUid: uid,
    updatedAt: serverTimestamp(),
  };
  if (id) {
    await updateDoc(doc(db, 'familyPolicyProfiles', id), data);
  } else {
    await addDoc(collection(db, 'familyPolicyProfiles'), { ...data, createdByUid: uid });
  }
}

// ---- Family members ----

function familyMemberFromDoc(d: QueryDocumentSnapshot<DocumentData>): FamilyMember {
  const data = d.data();
  return {
    id: d.id,
    firstName: data.firstName,
    lastName: data.lastName,
    displayName: data.displayName,
    balanceCents: data.balanceCents,
    contextId: data.contextId,
    ownerUids: data.ownerUids,
    linkedUid: data.linkedUid,
    archivedAt: (data.archivedAt as Timestamp | undefined)?.toDate(),
    createdAt: (data.createdAt as Timestamp | undefined)?.toDate() ?? new Date(),
  };
}

export function useFamilyMembers(contextId: string): FamilyMember[] {
  const [members, setMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'familyMembers'), where('contextId', '==', contextId), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => setMembers(snapshot.docs.map(familyMemberFromDoc)));
  }, [contextId]);

  return members;
}

export async function addFamilyMember({
  contextId,
  firstName,
  lastName,
  ownerUids,
}: {
  contextId: string;
  firstName: string;
  lastName: string;
  ownerUids: string[];
}): Promise<void> {
  await addDoc(collection(db, 'familyMembers'), {
    firstName,
    lastName,
    displayName: combineDisplayName(firstName, lastName),
    balanceCents: 0,
    contextId,
    ownerUids,
    createdAt: serverTimestamp(),
  });
}

/** The family member record linked to [uid], if any — mirrors
 * useLinkedStudent exactly. Queries `where linkedUid == uid` rather than a
 * roster's full list, since firestore.rules' isLinkedFamilyMemberSelf
 * only ever matches the caller's own doc. */
export function useLinkedFamilyMember(uid: string): FamilyMember | null | undefined {
  const [member, setMember] = useState<FamilyMember | null | undefined>(undefined);

  useEffect(() => {
    if (!uid) {
      setMember(undefined);
      return;
    }
    const q = query(collection(db, 'familyMembers'), where('linkedUid', '==', uid));
    return onSnapshot(q, (snapshot) => setMember(snapshot.empty ? null : familyMemberFromDoc(snapshot.docs[0])));
  }, [uid]);

  return member;
}

// ---- Family transactions and goals ----
// Reuses LedgerTransaction/Goal and lib/firestore.ts's useTransactions
// as-is for reads (both are already generic over contextId/studentId with
// no students/-specific path) — only the WRITE paths need a family-scoped
// variant, since recordTransaction/createGoal/deleteGoal in firestore.ts
// hard-code the students/{id} balance/goal update path.

/** studentId here names a familyMembers/ document — matches
 * TransactionComposer's generic `onRecord` shape (see that component's doc
 * comment) so it can be passed straight in as `onRecord={recordFamilyTransaction}`
 * with no adapter. schoolId/gradeLevel are accepted (the shared shape
 * includes them for the classroom case) but never used — family has
 * neither. */
export async function recordFamilyTransaction({
  contextId,
  studentId: familyMemberId,
  type,
  amountCents,
  reason,
  savingsLabel,
  goalId,
  spendCategory,
  createdByUid,
  ownerUids,
}: {
  contextId: string;
  studentId: string;
  type: TransactionType;
  amountCents: number;
  reason: string;
  savingsLabel?: SavingsLabel;
  goalId?: string;
  spendCategory?: SpendCategory;
  createdByUid: string;
  ownerUids: string[];
  schoolId?: string;
  gradeLevel?: string;
}): Promise<void> {
  const batch = writeBatch(db);

  const transactionRef = doc(collection(db, 'contexts', contextId, 'transactions'));
  batch.set(transactionRef, {
    studentId: familyMemberId,
    type,
    amountCents,
    reason,
    createdByUid,
    createdAt: serverTimestamp(),
    ownerUids,
    ...(type === 'earn' && (savingsLabel || goalId) ? { savingsLabel: goalId ? 'goal' : savingsLabel } : {}),
    ...(type === 'earn' && goalId ? { goalId } : {}),
    ...(type === 'spend' && spendCategory ? { spendCategory } : {}),
  });

  const delta = type === 'earn' ? amountCents : -amountCents;
  batch.update(doc(db, 'familyMembers', familyMemberId), { balanceCents: increment(delta) });

  if (type === 'earn' && goalId) {
    batch.update(doc(db, 'familyMembers', familyMemberId, 'goals', goalId), { savedCents: increment(amountCents) });
  }

  await batch.commit();
}

function familyGoalFromDoc(d: QueryDocumentSnapshot<DocumentData>): Goal {
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

export function useFamilyGoals(familyMemberId: string): Goal[] {
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'familyMembers', familyMemberId, 'goals'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, (snapshot) => setGoals(snapshot.docs.map(familyGoalFromDoc)));
  }, [familyMemberId]);

  return goals;
}

export async function createFamilyGoal({
  familyMemberId,
  name,
  targetCents,
  createdByUid,
}: {
  familyMemberId: string;
  name: string;
  targetCents: number;
  createdByUid: string;
}): Promise<void> {
  await addDoc(collection(db, 'familyMembers', familyMemberId, 'goals'), {
    studentId: familyMemberId,
    name,
    targetCents,
    savedCents: 0,
    createdByUid,
    createdAt: serverTimestamp(),
  });
}

export async function deleteFamilyGoal(familyMemberId: string, goalId: string): Promise<void> {
  await deleteDoc(doc(db, 'familyMembers', familyMemberId, 'goals', goalId));
}

// ---- Invite and claim: co-managers and family members ----
// Mirrors lib/school.ts's claimPendingInviteIfAny and lib/firestore.ts's
// claimPendingStudentLinkIfAny exactly, just against the family-scoped
// collections firestore.rules defines — see that file's "Family mode"
// section for the enforcement side.

export async function inviteFamilyCoManager({
  contextId,
  email,
  invitedByUid,
}: {
  contextId: string;
  email: string;
  invitedByUid: string;
}): Promise<void> {
  await setDoc(doc(db, 'pendingFamilyManagerInvites', normalizeEmail(email)), {
    contextId,
    invitedByUid,
    createdAt: serverTimestamp(),
  });
}

/** Runs once after every sign-in, alongside claimPendingInviteIfAny/
 * claimPendingStudentLinkIfAny: if a pending family co-manager invite
 * exists for [email], appends this uid to the family context's ownerUids
 * and deletes the pending invite. No-op otherwise. Appends via an explicit
 * read-then-write of the literal array (not arrayUnion) to match
 * firestore.rules' isValidFamilyManagerInviteClaim, which compares the
 * new ownerUids against existingOwnerUids.concat([uid]) exactly. */
export async function claimPendingFamilyManagerInviteIfAny({
  uid,
  email,
}: {
  uid: string;
  email: string;
}): Promise<void> {
  const normalized = normalizeEmail(email);
  const inviteRef = doc(db, 'pendingFamilyManagerInvites', normalized);
  const inviteSnapshot = await getDoc(inviteRef);
  const invite = inviteSnapshot.data();
  if (!invite) return;

  const contextRef = doc(db, 'contexts', invite.contextId);
  const contextSnapshot = await getDoc(contextRef);
  const existingOwnerUids: string[] = contextSnapshot.data()?.ownerUids ?? [];
  if (existingOwnerUids.includes(uid)) {
    await deleteDoc(inviteRef);
    return;
  }

  const batch = writeBatch(db);
  batch.update(contextRef, { ownerUids: [...existingOwnerUids, uid] });
  batch.delete(inviteRef);
  await batch.commit();
}

export async function linkFamilyMemberAccount({
  familyMemberId,
  email,
  invitedByUid,
}: {
  familyMemberId: string;
  email: string;
  invitedByUid: string;
}): Promise<void> {
  await setDoc(doc(db, 'pendingFamilyMemberLinks', normalizeEmail(email)), {
    familyMemberId,
    invitedByUid,
    createdAt: serverTimestamp(),
  });
}

export async function cancelFamilyMemberLink(email: string): Promise<void> {
  await deleteDoc(doc(db, 'pendingFamilyMemberLinks', normalizeEmail(email)));
}

export async function unlinkFamilyMemberAccount(familyMemberId: string): Promise<void> {
  await updateDoc(doc(db, 'familyMembers', familyMemberId), { linkedUid: deleteField() });
}

export async function claimPendingFamilyMemberLinkIfAny({
  uid,
  email,
}: {
  uid: string;
  email: string;
}): Promise<void> {
  const normalized = normalizeEmail(email);
  const linkRef = doc(db, 'pendingFamilyMemberLinks', normalized);
  const linkSnapshot = await getDoc(linkRef);
  const link = linkSnapshot.data();
  if (!link) return;

  const batch = writeBatch(db);
  batch.update(doc(db, 'familyMembers', link.familyMemberId), { linkedUid: uid });
  batch.delete(linkRef);
  await batch.commit();
}
