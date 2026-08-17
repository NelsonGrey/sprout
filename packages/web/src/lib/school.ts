import { useEffect, useState } from 'react';
import {
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type {
  AccessRequest,
  ClassroomGrantLevel,
  MemberRole,
  MemberScope,
  PendingInvite,
  School,
  SchoolMember,
} from '@sprout/shared';
import { firebaseClient } from './firebase';

const db = firebaseClient.firestore;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function memberFromDoc(d: QueryDocumentSnapshot<DocumentData>): SchoolMember {
  const data = d.data();
  return {
    uid: d.id,
    role: data.role,
    displayName: data.displayName ?? '',
    email: data.email ?? '',
    scope: data.scope,
    classroomGrants: data.classroomGrants,
    addedByUid: data.addedByUid,
    createdAt: data.createdAt?.toDate() ?? new Date(),
  };
}

function accessRequestFromDoc(d: QueryDocumentSnapshot<DocumentData>): AccessRequest {
  const data = d.data();
  return {
    id: d.id,
    schoolId: data.schoolId,
    contextId: data.contextId,
    contextName: data.contextName,
    requestedByUid: data.requestedByUid,
    requestedByDisplayName: data.requestedByDisplayName,
    targetUid: data.targetUid,
    targetDisplayName: data.targetDisplayName,
    level: data.level,
    status: data.status,
    createdAt: data.createdAt?.toDate() ?? new Date(),
    resolvedByUid: data.resolvedByUid,
    resolvedAt: data.resolvedAt?.toDate(),
  };
}

function inviteFromDoc(d: QueryDocumentSnapshot<DocumentData>): PendingInvite {
  const data = d.data();
  return {
    email: d.id,
    schoolId: data.schoolId,
    role: data.role,
    scope: data.scope,
    invitedByUid: data.invitedByUid,
    createdAt: data.createdAt?.toDate() ?? new Date(),
  };
}

/** The caller becomes the school's founding super_admin. Also upserts
 * `users/{founderUid}` and adds the school to `users/{founderUid}.schoolIds`
 * — mirrors createClassroom's first-write-creates-profile pattern. */
export async function createSchool({
  name,
  founderUid,
  founderDisplayName,
  founderEmail,
  nces,
}: {
  name: string;
  founderUid: string;
  founderDisplayName?: string | null;
  founderEmail?: string | null;
  /** Optional — set when the founder picked a match from the NCES lookup
   * rather than typing a name manually. Purely informational (displayed on
   * the school page), not consulted by rules or anything else. */
  nces?: { ncesId: string; street: string; city: string; state: string; zip: string };
}): Promise<string> {
  const batch = writeBatch(db);

  const schoolRef = doc(collection(db, 'schools'));
  // founderUid/superAdminCount are rules bootstrap/invariant plumbing (see
  // firestore.rules' isFoundingSuperAdmin) — not modeled on School.
  batch.set(schoolRef, {
    name,
    founderUid,
    superAdminCount: 1,
    ...(nces ? { nces } : {}),
    createdAt: serverTimestamp(),
  });

  batch.set(doc(db, 'schools', schoolRef.id, 'members', founderUid), {
    role: 'super_admin',
    displayName: founderDisplayName ?? null,
    email: founderEmail ?? null,
    addedByUid: founderUid,
    createdAt: serverTimestamp(),
  });

  batch.set(
    doc(db, 'users', founderUid),
    {
      displayName: founderDisplayName ?? null,
      email: founderEmail ?? null,
      schoolIds: arrayUnion(schoolRef.id),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
  return schoolRef.id;
}

export function useSchoolIdsForUser(uid: string): string[] {
  const [schoolIds, setSchoolIds] = useState<string[]>([]);

  useEffect(() => {
    return onSnapshot(doc(db, 'users', uid), (snapshot) => {
      setSchoolIds(snapshot.data()?.schoolIds ?? []);
    });
  }, [uid]);

  return schoolIds;
}

export async function getSchool(schoolId: string): Promise<School | null> {
  const snapshot = await getDoc(doc(db, 'schools', schoolId));
  const data = snapshot.data();
  if (!data) return null;
  return {
    id: snapshot.id,
    name: data.name,
    ...(data.nces ? { nces: data.nces } : {}),
    createdAt: data.createdAt?.toDate() ?? new Date(),
  };
}

/** Name only — no nces edit (no UI surface displays those fields for
 * editing today) and no delete (rules permit it, but there's no
 * cascade-delete for the school's contexts/students/members/invites). */
export async function updateSchool(schoolId: string, updates: { name?: string }): Promise<void> {
  await updateDoc(doc(db, 'schools', schoolId), { ...updates });
}

/** Undefined while loading, null once loaded if the user isn't a member. */
export function useMyMembership(schoolId: string | undefined, uid: string): SchoolMember | null | undefined {
  const [member, setMember] = useState<SchoolMember | null | undefined>(undefined);

  useEffect(() => {
    if (!schoolId) {
      setMember(null);
      return;
    }
    return onSnapshot(doc(db, 'schools', schoolId, 'members', uid), (snapshot) => {
      setMember(snapshot.exists() ? memberFromDoc(snapshot) : null);
    });
  }, [schoolId, uid]);

  return member;
}

/** A delegate admin can remove a teacher; only a super_admin can remove an
 * admin or another super_admin (hierarchical delegation — see
 * firestore.rules). Removing the school's last super_admin is denied by the
 * rules regardless of who attempts it. Removing your own membership this
 * way is possible but has no dedicated "leave school" UI yet. */
export async function removeMember(schoolId: string, uid: string): Promise<void> {
  const memberRef = doc(db, 'schools', schoolId, 'members', uid);
  const memberSnapshot = await getDoc(memberRef);
  const role = memberSnapshot.data()?.role;

  if (role === 'super_admin') {
    // Paired with firestore.rules' superAdminCount > 1 check — kept in
    // sync here, not independently re-derived by the rules.
    const batch = writeBatch(db);
    batch.delete(memberRef);
    batch.update(doc(db, 'schools', schoolId), { superAdminCount: increment(-1) });
    await batch.commit();
  } else {
    await deleteDoc(memberRef);
  }
}

/** Changes an existing teacher's scope only — never role. Role changes
 * (promoting/demoting across teacher/admin/super_admin) stay a two-step
 * remove-then-reinvite flow; firestore.rules' members update rule only
 * permits writes that leave role as 'teacher'. */
export async function updateMemberScope(schoolId: string, uid: string, scope: MemberScope): Promise<void> {
  await updateDoc(doc(db, 'schools', schoolId, 'members', uid), { scope });
}

export function useMembersOfSchool(schoolId: string | undefined): SchoolMember[] {
  const [members, setMembers] = useState<SchoolMember[]>([]);

  useEffect(() => {
    if (!schoolId) {
      setMembers([]);
      return;
    }
    return onSnapshot(collection(db, 'schools', schoolId, 'members'), (snapshot) => {
      setMembers(snapshot.docs.map(memberFromDoc));
    });
  }, [schoolId]);

  return members;
}

/** Records who's coming, keyed by email — not tied to an existing account.
 * Activated automatically the first time that email signs in (see
 * claimPendingInviteIfAny), whether that's before or after this call. */
export async function inviteMember({
  schoolId,
  email,
  role,
  scope,
  invitedByUid,
}: {
  schoolId: string;
  email: string;
  role: MemberRole;
  scope?: MemberScope;
  invitedByUid: string;
}): Promise<void> {
  await writeBatch(db)
    .set(doc(db, 'pendingInvites', normalizeEmail(email)), {
      schoolId,
      role,
      ...(scope ? { scope } : {}),
      invitedByUid,
      createdAt: serverTimestamp(),
    })
    .commit();
}

export function usePendingInvitesForSchool(schoolId: string | undefined): PendingInvite[] {
  const [invites, setInvites] = useState<PendingInvite[]>([]);

  useEffect(() => {
    if (!schoolId) {
      setInvites([]);
      return;
    }
    const q = query(collection(db, 'pendingInvites'), where('schoolId', '==', schoolId));
    return onSnapshot(q, (snapshot) => setInvites(snapshot.docs.map(inviteFromDoc)));
  }, [schoolId]);

  return invites;
}

export async function cancelInvite(email: string): Promise<void> {
  await deleteDoc(doc(db, 'pendingInvites', normalizeEmail(email)));
}

/** Runs once after every sign-in, on every platform: if a pending invite
 * exists for `email`, activates the access it configured (creates the
 * members doc, appends to users/{uid}.schoolIds) and deletes the invite.
 * No-op if there's no matching invite — the normal case for every
 * self-serve/standalone user. */
export async function claimPendingInviteIfAny({
  uid,
  email,
  displayName,
}: {
  uid: string;
  email: string;
  displayName?: string | null;
}): Promise<void> {
  const normalized = normalizeEmail(email);
  const inviteRef = doc(db, 'pendingInvites', normalized);
  const inviteSnapshot = await getDoc(inviteRef);
  const invite = inviteSnapshot.data();
  if (!invite) return;

  const batch = writeBatch(db);
  batch.set(doc(db, 'schools', invite.schoolId, 'members', uid), {
    role: invite.role,
    displayName: displayName ?? null,
    email: normalized,
    ...(invite.scope ? { scope: invite.scope } : {}),
    addedByUid: uid,
    createdAt: serverTimestamp(),
  });
  if (invite.role === 'super_admin') {
    batch.update(doc(db, 'schools', invite.schoolId), { superAdminCount: increment(1) });
  }
  batch.set(doc(db, 'users', uid), { schoolIds: arrayUnion(invite.schoolId) }, { merge: true });
  batch.delete(inviteRef);
  await batch.commit();
}

/** A classroom owner proposing that a colleague (an existing active
 * teacher member of the school) get 'award' or 'manage' access to
 * specifically their classroom. Grants nothing by itself — only an
 * admin/super_admin approving it (see approveAccessRequest) actually
 * grants access, keeping "only admins/super_admins grant access" intact. */
export async function createAccessRequest({
  schoolId,
  contextId,
  contextName,
  requestedByUid,
  requestedByDisplayName,
  targetUid,
  targetDisplayName,
  level,
}: {
  schoolId: string;
  contextId: string;
  contextName: string;
  requestedByUid: string;
  requestedByDisplayName: string;
  targetUid: string;
  targetDisplayName: string;
  level: ClassroomGrantLevel;
}): Promise<void> {
  await writeBatch(db)
    .set(doc(collection(db, 'accessRequests')), {
      schoolId,
      contextId,
      contextName,
      requestedByUid,
      requestedByDisplayName,
      targetUid,
      targetDisplayName,
      level,
      status: 'pending',
      createdAt: serverTimestamp(),
    })
    .commit();
}

export function usePendingAccessRequestsForSchool(schoolId: string | undefined): AccessRequest[] {
  const [requests, setRequests] = useState<AccessRequest[]>([]);

  useEffect(() => {
    if (!schoolId) {
      setRequests([]);
      return;
    }
    const q = query(
      collection(db, 'accessRequests'),
      where('schoolId', '==', schoolId),
      where('status', '==', 'pending'),
    );
    return onSnapshot(q, (snapshot) => setRequests(snapshot.docs.map(accessRequestFromDoc)));
  }, [schoolId]);

  return requests;
}

/** A classroom's own request history (any status) — for the owner's view
 * on the classroom detail page. */
export function useAccessRequestsForContext(contextId: string | undefined): AccessRequest[] {
  const [requests, setRequests] = useState<AccessRequest[]>([]);

  useEffect(() => {
    if (!contextId) {
      setRequests([]);
      return;
    }
    const q = query(collection(db, 'accessRequests'), where('contextId', '==', contextId));
    return onSnapshot(q, (snapshot) => setRequests(snapshot.docs.map(accessRequestFromDoc)));
  }, [contextId]);

  return requests;
}

/** Approving is the only thing that actually grants access: updates the
 * request's status and, in the same batch, writes the requested level
 * onto the target's classroomGrants — mirrors updateMemberScope's shape. */
export async function approveAccessRequest(request: AccessRequest, resolvedByUid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, 'accessRequests', request.id), {
    status: 'approved',
    resolvedByUid,
    resolvedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'schools', request.schoolId, 'members', request.targetUid), {
    [`classroomGrants.${request.contextId}`]: request.level,
  });
  await batch.commit();
}

export async function declineAccessRequest(requestId: string, resolvedByUid: string): Promise<void> {
  await updateDoc(doc(db, 'accessRequests', requestId), {
    status: 'declined',
    resolvedByUid,
    resolvedAt: serverTimestamp(),
  });
}

/** The requester cancelling their own still-pending request. */
export async function cancelAccessRequest(requestId: string): Promise<void> {
  await deleteDoc(doc(db, 'accessRequests', requestId));
}

/** Admin-direct revoke — grants shouldn't be permanent with no way back
 * short of editing Firestore. */
export async function revokeClassroomGrant(schoolId: string, uid: string, contextId: string): Promise<void> {
  await updateDoc(doc(db, 'schools', schoolId, 'members', uid), {
    [`classroomGrants.${contextId}`]: deleteField(),
  });
}
