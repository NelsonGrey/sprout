import type { MemberRole } from '@sprout/shared';

/** Named, presentation-only capabilities derived from current school
 * membership — see docs/detailed-design/01_EXPERIENCE_FOUNDATIONS.md §3.
 * Firestore rules remain the actual authorization boundary; this only
 * decides what the UI shows, mirroring (not replacing) the rules'
 * isAtLeastAdmin check. The design doc's capability list is more granular
 * than current admin/super_admin behavior actually differentiates in the
 * UI today (StaffPage enforces the super_admin/admin hierarchy itself, on
 * top of this) — each of these collapses to the same admin-or-above gate
 * until a slice needs finer distinction. */
export interface Capabilities {
  canManageStaff: boolean;
  canManageGrades: boolean;
  canViewAllSchoolStudents: boolean;
  canManageRoster: boolean;
  canResolveAccessRequests: boolean;
  /** Whether this account has any staff-side access at all (school
   * membership or an owned classroom) — governs whether adult navigation
   * (Sidebar) renders at all, matching the pre-existing hasAnyStaffAccess
   * check in Sidebar/LandingRouter. */
  hasAnyStaffAccess: boolean;
}

export function deriveCapabilities({
  memberRole,
  hasSchoolMembership,
  ownClassroomCount,
}: {
  memberRole: MemberRole | undefined;
  hasSchoolMembership: boolean;
  ownClassroomCount: number;
}): Capabilities {
  const isAtLeastAdmin = memberRole === 'admin' || memberRole === 'super_admin';

  return {
    canManageStaff: isAtLeastAdmin,
    canManageGrades: isAtLeastAdmin,
    canViewAllSchoolStudents: isAtLeastAdmin,
    canManageRoster: isAtLeastAdmin,
    canResolveAccessRequests: isAtLeastAdmin,
    hasAnyStaffAccess: hasSchoolMembership || ownClassroomCount > 0,
  };
}
