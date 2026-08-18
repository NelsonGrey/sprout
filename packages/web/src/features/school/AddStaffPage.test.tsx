import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { AddStaffPage } from './AddStaffPage';
import * as schoolLib from '../../lib/school';

vi.mock('wouter', () => ({
  useLocation: () => ['/school/staff/new', vi.fn()],
}));

vi.mock('../../lib/school', () => ({
  getSchool: vi.fn(),
  useSchoolIdsForUser: vi.fn(),
  useMyMembership: vi.fn(),
  usePendingInvitesForSchool: vi.fn(),
  inviteMember: vi.fn(),
  cancelInvite: vi.fn(),
}));

const delegate = { uid: 'delegate-1', displayName: 'Office Manager', email: 'om@example.com' } as User;
const superAdmin = { uid: 'super-admin-1', displayName: 'Principal Lee', email: 'lee@example.com' } as User;

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

function mockSuperAdmin() {
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
}

describe('AddStaffPage', () => {
  it('lets a delegate admin invite a teacher with a scope', async () => {
    mockDelegateAdmin();
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([]);
    vi.mocked(schoolLib.inviteMember).mockResolvedValue(undefined);

    render(<AddStaffPage user={delegate} />);

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'new@example.com' } });
    fireEvent.click(screen.getByText('Specific grades'));
    fireEvent.click(screen.getByText('4'));
    fireEvent.click(screen.getByText('Send Invite'));

    await waitFor(() =>
      expect(schoolLib.inviteMember).toHaveBeenCalledWith({
        schoolId: 'school-1',
        email: 'new@example.com',
        role: 'teacher',
        scope: { type: 'grades', grades: ['4'] },
        invitedByUid: 'delegate-1',
      }),
    );
  });

  it('does not show a role picker to a plain admin — only teachers can be invited', () => {
    mockDelegateAdmin();
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([]);

    render(<AddStaffPage user={delegate} />);

    expect(screen.queryByText('Admin')).toBeNull();
    expect(screen.queryByText('Super Admin')).toBeNull();
    // Teacher-only form still shows the scope picker.
    expect(screen.getByText('Own classrooms only')).toBeTruthy();
  });

  it('lets a super admin invite an admin', async () => {
    mockSuperAdmin();
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([]);
    vi.mocked(schoolLib.inviteMember).mockResolvedValue(undefined);

    render(<AddStaffPage user={superAdmin} />);

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'newadmin@example.com' } });
    fireEvent.click(screen.getByText('Admin'));
    fireEvent.click(screen.getByText('Send Invite'));

    await waitFor(() =>
      expect(schoolLib.inviteMember).toHaveBeenCalledWith({
        schoolId: 'school-1',
        email: 'newadmin@example.com',
        role: 'admin',
        invitedByUid: 'super-admin-1',
      }),
    );
  });

  it('hides the scope picker once an admin role is selected', () => {
    mockSuperAdmin();
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([]);

    render(<AddStaffPage user={superAdmin} />);

    fireEvent.click(screen.getByText('Super Admin'));
    expect(screen.queryByText('Own classrooms only')).toBeNull();
  });

  it('lets an admin cancel a pending invite', async () => {
    mockDelegateAdmin();
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([
      { email: 'pending@example.com', schoolId: 'school-1', role: 'teacher', scope: { type: 'own' }, invitedByUid: 'delegate-1', createdAt: new Date() },
    ]);

    render(<AddStaffPage user={delegate} />);
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => expect(schoolLib.cancelInvite).toHaveBeenCalledWith('pending@example.com'));
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
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([]);

    render(<AddStaffPage user={{ uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User} />);

    expect(screen.getByText('Only school admins can invite staff.')).toBeTruthy();
  });
});
