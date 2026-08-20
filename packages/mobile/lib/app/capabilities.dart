import 'package:sprout/core/models/school.dart';

/// Named, presentation-only capabilities derived from current school
/// membership — Dart mirror of packages/web/src/app/capabilities.ts. See
/// docs/detailed-design/01_EXPERIENCE_FOUNDATIONS.md §3. Firestore rules
/// remain the actual authorization boundary; this only decides what the UI
/// shows, mirroring (not replacing) the repeated `isAtLeastAdmin` check
/// found across classrooms_screen.dart, students_screen.dart,
/// school_admin_screen.dart, etc. The design doc's capability list is more
/// granular than current admin/super_admin behavior actually differentiates
/// in the UI today — each of these collapses to the same admin-or-above
/// gate until a slice needs finer distinction.
class Capabilities {
  const Capabilities({
    required this.canManageStaff,
    required this.canManageGrades,
    required this.canViewAllSchoolStudents,
    required this.canManageRoster,
    required this.canResolveAccessRequests,
    required this.hasAnyStaffAccess,
  });

  final bool canManageStaff;
  final bool canManageGrades;
  final bool canViewAllSchoolStudents;
  final bool canManageRoster;
  final bool canResolveAccessRequests;

  /// Whether this account has any staff-side access at all (school
  /// membership or an owned classroom) — governs whether adult navigation
  /// renders at all.
  final bool hasAnyStaffAccess;
}

Capabilities deriveCapabilities({
  required MemberRole? memberRole,
  required bool hasSchoolMembership,
  required int ownClassroomCount,
}) {
  final isAtLeastAdmin = memberRole == MemberRole.admin || memberRole == MemberRole.superAdmin;

  return Capabilities(
    canManageStaff: isAtLeastAdmin,
    canManageGrades: isAtLeastAdmin,
    canViewAllSchoolStudents: isAtLeastAdmin,
    canManageRoster: isAtLeastAdmin,
    canResolveAccessRequests: isAtLeastAdmin,
    hasAnyStaffAccess: hasSchoolMembership || ownClassroomCount > 0,
  );
}
