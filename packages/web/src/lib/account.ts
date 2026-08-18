import type { User } from 'firebase/auth';
import { deleteUser } from 'firebase/auth';
import { arrayRemove, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import type { MemberRole } from '@sprout/shared';
import { firebaseClient } from './firebase';
import { bulkDeleteStudents, deleteClassroom } from './firestore';
import { removeMember } from './school';

const db = firebaseClient.firestore;

export interface SchoolMembershipSummary {
  schoolId: string;
  schoolName: string;
  role: MemberRole;
  isSoleSuperAdmin: boolean;
}

export interface AccountDeletionSummary {
  schoolMemberships: SchoolMembershipSummary[];
  standaloneClassrooms: { id: string; name: string }[];
  linkedStudentName: string | null;
}

/** Everything a user should see before confirming account deletion — which
 * schools they'd leave (and whether any would be left without a super
 * admin, a hard block), which personal classrooms would be permanently
 * destroyed (vs. school classrooms, which are only unassigned), and
 * whether they're a linked student (informational only — see
 * deleteMyAccount's doc comment on why linkedUid is deliberately left
 * as-is). */
export async function getAccountDeletionSummary(uid: string): Promise<AccountDeletionSummary> {
  const userSnapshot = await getDoc(doc(db, 'users', uid));
  const schoolIds: string[] = userSnapshot.data()?.schoolIds ?? [];

  const schoolMemberships = await Promise.all(
    schoolIds.map(async (schoolId): Promise<SchoolMembershipSummary> => {
      const [schoolSnapshot, memberSnapshot] = await Promise.all([
        getDoc(doc(db, 'schools', schoolId)),
        getDoc(doc(db, 'schools', schoolId, 'members', uid)),
      ]);
      const role: MemberRole = memberSnapshot.data()?.role ?? 'teacher';
      const superAdminCount: number = schoolSnapshot.data()?.superAdminCount ?? 0;
      return {
        schoolId,
        schoolName: schoolSnapshot.data()?.name ?? 'Unknown School',
        role,
        isSoleSuperAdmin: role === 'super_admin' && superAdminCount <= 1,
      };
    }),
  );

  const ownedSnapshot = await getDocs(query(collection(db, 'contexts'), where('ownerUids', 'array-contains', uid)));
  const standaloneClassrooms = ownedSnapshot.docs
    .filter((d) => !d.data().schoolId)
    .map((d) => ({ id: d.id, name: d.data().name as string }));

  const linkedSnapshot = await getDocs(query(collection(db, 'students'), where('linkedUid', '==', uid)));
  const linkedStudentName = (linkedSnapshot.docs[0]?.data().displayName as string | undefined) ?? null;

  return { schoolMemberships, standaloneClassrooms, linkedStudentName };
}

/** Deletes the signed-in user's account: leaves every school they belong to
 * (removeMember already auto-unassigns any school classrooms they owned,
 * leaving those classrooms intact for an admin to reassign — not
 * destroyed), permanently deletes any personal (non-school) classroom they
 * solely owned along with its students (no admin could ever have taken
 * these over — firestore.rules gives standalone classrooms no admin escape
 * hatch, so leaving them behind would orphan them forever), deletes their
 * own users/{uid} profile doc, and finally deletes the Firebase Auth
 * account itself (must be last — every step above needs to still be
 * authenticated as this uid).
 *
 * Deliberately does NOT touch students/{id}.linkedUid if this user is a
 * linked student: the students update rule has no branch letting a student
 * clear their own link (only staff can, via unlinkStudentAccount) — a
 * stale linkedUid pointing at a deleted, permission-dead uid is inert, not
 * a dangling access path, and staff can already clear it manually later if
 * a replacement account needs to link. Adding a rules branch for this
 * self-service edge case wasn't judged worth the added surface.
 *
 * Deliberately does NOT delete transactions under a destroyed personal
 * classroom — matches deleteClassroom's existing accepted non-cascading
 * behavior elsewhere in this codebase. Safe: transaction reads require
 * either a live contexts doc or a live, still-linked student, both gone by
 * the time this returns.
 *
 * Call must be preceded by re-authentication — deleteUser throws
 * auth/requires-recent-login otherwise. */
export async function deleteMyAccount(user: User): Promise<void> {
  const userSnapshot = await getDoc(doc(db, 'users', user.uid));
  const schoolIds: string[] = userSnapshot.data()?.schoolIds ?? [];

  for (const schoolId of schoolIds) {
    await removeMember(schoolId, user.uid);
    await setDoc(doc(db, 'users', user.uid), { schoolIds: arrayRemove(schoolId) }, { merge: true });
  }

  const ownedSnapshot = await getDocs(
    query(collection(db, 'contexts'), where('ownerUids', 'array-contains', user.uid)),
  );
  const standaloneClassroomIds = ownedSnapshot.docs.filter((d) => !d.data().schoolId).map((d) => d.id);
  for (const contextId of standaloneClassroomIds) {
    const studentsSnapshot = await getDocs(query(collection(db, 'students'), where('contextId', '==', contextId)));
    await bulkDeleteStudents(studentsSnapshot.docs.map((d) => d.id));
    await deleteClassroom(contextId);
  }

  await deleteDoc(doc(db, 'users', user.uid));
  await deleteUser(user);
}
