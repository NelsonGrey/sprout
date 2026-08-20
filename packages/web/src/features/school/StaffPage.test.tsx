import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { StaffPage } from './StaffPage';
import * as schoolLib from '../../lib/school';

const navigateMock = vi.fn();
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/app/school/staff', navigateMock] };
});

vi.mock('../../lib/school', () => ({
  getSchool: vi.fn(),
  useSchoolIdsForUser: vi.fn(),
  useMyMembership: vi.fn(),
  useMembersOfSchool: vi.fn(),
  updateMemberScope: vi.fn(),
  removeMember: vi.fn(),
  revokeClassroomGrant: vi.fn(),
}));

vi.mock('../../lib/firestore', () => ({
  useClassroomsInSchool: vi.fn(() => []),
  assignClassroomOwner: vi.fn(),
}));

const superAdmin = { uid: 'super-admin-1', displayName: 'Principal Lee', email: 'lee@example.com' } as User;
const delegate = { uid: 'delegate-1', displayName: 'Office Manager', email: 'om@example.com' } as User;

function mockDelegateAdmin() {
  vi.mocked(schoolLib.getSchool).mockResolvedValue({ id: 'school-1', name: 'Riverside Elementary', createdAt: new Date() });
  vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
  vi.mocked(schoolLib.useMyMembership).mockReturnValue({
    uid: 'delegate-1',
    role: 'admin',
    displayName: 'Office Manager',
    email: 'om@example.com',
    addedByUid: 'super-admin-1',
    createdAt: new Date(),
  });
}

describe('StaffPage', () => {
  it('hides the remove button for the sole remaining super admin', () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({ id: 'school-1', name: 'Riverside Elementary', createdAt: new Date() });
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'super-admin-1',
      role: 'super_admin',
      displayName: 'Principal Lee',
      email: 'lee@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([
      {
        uid: 'super-admin-1',
        role: 'super_admin',
        displayName: 'Principal Lee',
        email: 'lee@example.com',
        addedByUid: 'super-admin-1',
        createdAt: new Date(),
      },
      {
        uid: 'delegate-1',
        role: 'admin',
        displayName: 'Office Manager',
        email: 'om@example.com',
        addedByUid: 'super-admin-1',
        createdAt: new Date(),
      },
    ]);

    render(<StaffPage user={superAdmin} />);

    // Select the sole super_admin (self) — no Remove button.
    fireEvent.click(screen.getByText('Principal Lee'));
    expect(screen.queryByText('Remove')).toBeNull();

    // Select the admin — Remove is available to a super_admin.
    fireEvent.click(screen.getByText('Office Manager'));
    expect(screen.getByText('Remove')).toBeTruthy();
  });

  it('lets a delegate admin edit a teacher scope', async () => {
    mockDelegateAdmin();
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([
      {
        uid: 'teacher-1',
        role: 'teacher',
        displayName: 'Ms. Lord',
        email: 'lord@example.com',
        scope: { type: 'own' },
        addedByUid: 'delegate-1',
        createdAt: new Date(),
      },
    ]);
    vi.mocked(schoolLib.updateMemberScope).mockResolvedValue(undefined);

    render(<StaffPage user={delegate} />);

    fireEvent.click(screen.getByText('Ms. Lord'));
    fireEvent.click(screen.getByText('Edit scope'));
    fireEvent.click(screen.getByText('Whole school (PE, art, music, etc.)'));
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(schoolLib.updateMemberScope).toHaveBeenCalledWith('school-1', 'teacher-1', { type: 'school' }),
    );
  });

  it("lets an admin revoke a teacher's classroom grant", () => {
    mockDelegateAdmin();
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([
      {
        uid: 'teacher-1',
        role: 'teacher',
        displayName: 'Ms. Lord',
        email: 'lord@example.com',
        scope: { type: 'own' },
        classroomGrants: { 'ctx-1': 'award' },
        addedByUid: 'delegate-1',
        createdAt: new Date(),
      },
    ]);

    render(<StaffPage user={delegate} selectedUid="teacher-1" />);

    fireEvent.click(screen.getByLabelText('Revoke access to classroom ctx-1'));
    expect(schoolLib.revokeClassroomGrant).toHaveBeenCalledWith('school-1', 'teacher-1', 'ctx-1');
  });

  it('clicking the mobile "Staff" back link clears the selection and returns to the list', () => {
    mockDelegateAdmin();
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([
      {
        uid: 'teacher-1',
        role: 'teacher',
        displayName: 'Ms. Lord',
        email: 'lord@example.com',
        scope: { type: 'own' },
        addedByUid: 'delegate-1',
        createdAt: new Date(),
      },
    ]);

    render(<StaffPage user={delegate} selectedUid="teacher-1" />);

    expect(screen.getByText('Edit scope')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Staff' }));

    expect(navigateMock).toHaveBeenCalledWith('/app/school/staff');
    expect(screen.getByText('Select a staff member to view details.')).toBeTruthy();
  });

  it('seeds the selected member from the selectedUid prop', () => {
    mockDelegateAdmin();
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([
      {
        uid: 'teacher-1',
        role: 'teacher',
        displayName: 'Ms. Lord',
        email: 'lord@example.com',
        scope: { type: 'own' },
        addedByUid: 'delegate-1',
        createdAt: new Date(),
      },
    ]);

    render(<StaffPage user={delegate} selectedUid="teacher-1" />);

    expect(screen.getByText('Edit scope')).toBeTruthy();
  });

  it('has an Add Staff button that navigates to /app/school/staff/new', () => {
    mockDelegateAdmin();
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);

    render(<StaffPage user={delegate} />);

    fireEvent.click(screen.getByText('Add Staff'));
    expect(navigateMock).toHaveBeenCalledWith('/app/school/staff/new');
  });

  it('shows a not-authorized message for a plain teacher', () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({ id: 'school-1', name: 'Riverside Elementary', createdAt: new Date() });
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);

    render(<StaffPage user={{ uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User} />);

    expect(screen.getByText('Only school admins can manage staff.')).toBeTruthy();
  });
});
