import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/app/capabilities.dart';
import 'package:sprout/core/models/school.dart';

void main() {
  group('deriveCapabilities', () {
    test('grants nothing to an account with no school membership and no owned classrooms', () {
      final caps = deriveCapabilities(
        memberRole: null,
        hasSchoolMembership: false,
        ownClassroomCount: 0,
      );

      expect(caps.canManageStaff, isFalse);
      expect(caps.canManageGrades, isFalse);
      expect(caps.canViewAllSchoolStudents, isFalse);
      expect(caps.canManageRoster, isFalse);
      expect(caps.canResolveAccessRequests, isFalse);
      expect(caps.hasAnyStaffAccess, isFalse);
    });

    test('grants hasAnyStaffAccess but no admin capability to a plain teacher with an owned classroom', () {
      final caps = deriveCapabilities(
        memberRole: null,
        hasSchoolMembership: false,
        ownClassroomCount: 1,
      );

      expect(caps.hasAnyStaffAccess, isTrue);
      expect(caps.canManageStaff, isFalse);
    });

    test('grants hasAnyStaffAccess but no admin capability to a scoped teacher member', () {
      final caps = deriveCapabilities(
        memberRole: MemberRole.teacher,
        hasSchoolMembership: true,
        ownClassroomCount: 0,
      );

      expect(caps.hasAnyStaffAccess, isTrue);
      expect(caps.canManageStaff, isFalse);
      expect(caps.canManageRoster, isFalse);
    });

    test('grants every admin capability to an admin member', () {
      final caps = deriveCapabilities(
        memberRole: MemberRole.admin,
        hasSchoolMembership: true,
        ownClassroomCount: 0,
      );

      expect(caps.canManageStaff, isTrue);
      expect(caps.canManageGrades, isTrue);
      expect(caps.canViewAllSchoolStudents, isTrue);
      expect(caps.canManageRoster, isTrue);
      expect(caps.canResolveAccessRequests, isTrue);
      expect(caps.hasAnyStaffAccess, isTrue);
    });

    test('grants every admin capability to a super_admin member', () {
      final caps = deriveCapabilities(
        memberRole: MemberRole.superAdmin,
        hasSchoolMembership: true,
        ownClassroomCount: 0,
      );

      expect(caps.canManageStaff, isTrue);
      expect(caps.canManageRoster, isTrue);
    });
  });
}
