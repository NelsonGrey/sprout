import { describe, expect, it } from 'vitest';
import { deriveCapabilities } from './capabilities';

describe('deriveCapabilities', () => {
  it('grants nothing to an account with no school membership and no owned classrooms', () => {
    const caps = deriveCapabilities({ memberRole: undefined, hasSchoolMembership: false, ownClassroomCount: 0 });
    expect(caps).toEqual({
      canManageStaff: false,
      canManageGrades: false,
      canViewAllSchoolStudents: false,
      canManageRoster: false,
      canResolveAccessRequests: false,
      hasAnyStaffAccess: false,
    });
  });

  it('grants hasAnyStaffAccess but no admin capability to a plain teacher with an owned classroom', () => {
    const caps = deriveCapabilities({ memberRole: undefined, hasSchoolMembership: false, ownClassroomCount: 1 });
    expect(caps.hasAnyStaffAccess).toBe(true);
    expect(caps.canManageStaff).toBe(false);
  });

  it('grants hasAnyStaffAccess but no admin capability to a scoped teacher member', () => {
    const caps = deriveCapabilities({ memberRole: 'teacher', hasSchoolMembership: true, ownClassroomCount: 0 });
    expect(caps.hasAnyStaffAccess).toBe(true);
    expect(caps.canManageStaff).toBe(false);
    expect(caps.canManageRoster).toBe(false);
  });

  it('grants every admin capability to an admin member', () => {
    const caps = deriveCapabilities({ memberRole: 'admin', hasSchoolMembership: true, ownClassroomCount: 0 });
    expect(caps.canManageStaff).toBe(true);
    expect(caps.canManageGrades).toBe(true);
    expect(caps.canViewAllSchoolStudents).toBe(true);
    expect(caps.canManageRoster).toBe(true);
    expect(caps.canResolveAccessRequests).toBe(true);
    expect(caps.hasAnyStaffAccess).toBe(true);
  });

  it('grants every admin capability to a super_admin member', () => {
    const caps = deriveCapabilities({ memberRole: 'super_admin', hasSchoolMembership: true, ownClassroomCount: 0 });
    expect(caps.canManageStaff).toBe(true);
    expect(caps.canManageRoster).toBe(true);
  });
});
