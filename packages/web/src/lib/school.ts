import { useEffect, useState } from 'react';
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { MemberRole, MemberScope, PendingInvite, School, SchoolMember } from '@sprout/shared';
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
    addedByUid: data.addedByUid,
    createdAt: data.createdAt?.toDate() ?? new Date(),
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

/** Also upserts `users/{principalUid}` and adds the school to
 * `users/{principalUid}.schoolIds` — mirrors createClassroom's
 * first-write-creates-profile pattern. */
export async function createSchool({
  name,
  principalUid,
  principalDisplayName,
  principalEmail,
}: {
  name: string;
  principalUid: string;
  principalDisplayName?: string | null;
  principalEmail?: string | null;
}): Promise<string> {
  const batch = writeBatch(db);

  const schoolRef = doc(collection(db, 'schools'));
  batch.set(schoolRef, { name, principalUid, createdAt: serverTimestamp() });

  batch.set(doc(db, 'schools', schoolRef.id, 'members', principalUid), {
    role: 'admin',
    displayName: principalDisplayName ?? null,
    email: principalEmail ?? null,
    addedByUid: principalUid,
    createdAt: serverTimestamp(),
  });

  batch.set(
    doc(db, 'users', principalUid),
    {
      displayName: principalDisplayName ?? null,
      email: principalEmail ?? null,
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
  return { id: snapshot.id, name: data.name, principalUid: data.principalUid, createdAt: data.createdAt?.toDate() ?? new Date() };
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

/** A delegate admin can remove a teacher; only the principal can remove an
 * admin (hierarchical delegation — see firestore.rules). Removing your own
 * membership this way is possible but has no dedicated "leave school" UI
 * yet. */
export async function removeMember(schoolId: string, uid: string): Promise<void> {
  await deleteDoc(doc(db, 'schools', schoolId, 'members', uid));
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
  batch.set(doc(db, 'users', uid), { schoolIds: arrayUnion(invite.schoolId) }, { merge: true });
  batch.delete(inviteRef);
  await batch.commit();
}
