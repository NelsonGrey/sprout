import type { User } from 'firebase/auth';
import { useClassrooms, useLinkedStudent } from '../lib/firestore';
import { useLinkedFamilyMember } from '../lib/family';
import { useMyMembership, useSchoolIdsForUser } from '../lib/school';
import { deriveCapabilities, type Capabilities } from './capabilities';

/** The single place that turns raw membership/classroom data into named
 * capabilities — see capabilities.ts. Every component that previously
 * re-derived `isAtLeastAdmin` from useMyMembership itself should call this
 * instead. Multi-school membership/switching is deferred — uses the first
 * schoolId, matching every pre-existing call site (DashboardPage, Sidebar,
 * StudentsPage, SchoolAdminPage). */
export function useCapabilities(user: User): Capabilities & { schoolId: string | undefined } {
  const schoolIds = useSchoolIdsForUser(user.uid);
  const schoolId = schoolIds[0];
  const membership = useMyMembership(schoolId, user.uid);
  const ownClassrooms = useClassrooms(user.uid);

  const capabilities = deriveCapabilities({
    memberRole: membership?.role,
    hasSchoolMembership: schoolIds.length > 0,
    ownClassroomCount: ownClassrooms.length,
  });

  return { ...capabilities, schoolId };
}

/** Dual-role support (§2.1): whether this account is also linked to a
 * student roster record, independent of whatever staff access it has.
 * Undefined while loading or signed out. Used by the account menu to offer
 * "My student view" without changing which experience a dual-role user
 * lands on by default (LandingRouter still prefers the staff dashboard).
 * Accepts `User | null` (rather than requiring the caller to skip the hook
 * conditionally, which would violate the Rules of Hooks) so Header can call
 * it unconditionally whether or not a user is signed in. */
export function useIsLinkedStudent(user: User | null): boolean | undefined {
  const linkedStudent = useLinkedStudent(user?.uid ?? '');
  if (!user || linkedStudent === undefined) return undefined;
  return linkedStudent !== null;
}

/** Family-mode mirror of useIsLinkedStudent — whether this account is also
 * linked to a familyMembers record, independent of any staff/student
 * access. Used by the account menu to offer "My family view" (Slice 5). */
export function useIsLinkedFamilyMember(user: User | null): boolean | undefined {
  const linkedFamilyMember = useLinkedFamilyMember(user?.uid ?? '');
  if (!user || linkedFamilyMember === undefined) return undefined;
  return linkedFamilyMember !== null;
}
