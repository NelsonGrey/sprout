import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { SchoolAdminPage } from './SchoolAdminPage';
import * as schoolLib from '../../lib/school';

const navigateMock = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/school', navigateMock],
}));

vi.mock('../../lib/school', () => ({
  getSchool: vi.fn(),
  inviteMember: vi.fn(),
  cancelInvite: vi.fn(),
  removeMember: vi.fn(),
  updateMemberScope: vi.fn(),
  updateSchool: vi.fn(),
  useMyMembership: vi.fn(),
  useMembersOfSchool: vi.fn(),
  usePendingInvitesForSchool: vi.fn(),
  usePendingAccessRequestsForSchool: vi.fn(),
  approveAccessRequest: vi.fn(),
  declineAccessRequest: vi.fn(),
  revokeClassroomGrant: vi.fn(),
}));

const superAdmin = { uid: 'super-admin-1', displayName: 'Principal Lee', email: 'lee@example.com' } as User;
const delegate = { uid: 'delegate-1', displayName: 'Office Manager', email: 'om@example.com' } as User;
const teacher = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;

describe('SchoolAdminPage', () => {
  it('shows a plain teacher their own role and scope, with no admin tooling', () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({
      id: 'school-1',
      name: 'Riverside Elementary',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      scope: { type: 'grades', grades: ['3', '4'] },
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);

    render(<SchoolAdminPage user={teacher} schoolId="school-1" />);

    expect(screen.getByText(/Teacher — Grades: 3, 4/)).toBeTruthy();
    expect(screen.queryByText('Invite a teacher')).toBeNull();
    expect(screen.queryByText('Delegate admin access')).toBeNull();
  });

  it('lets a delegate admin invite a teacher but not another admin', async () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({
      id: 'school-1',
      name: 'Riverside Elementary',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'delegate-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'om@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);
    vi.mocked(schoolLib.inviteMember).mockResolvedValue(undefined);

    render(<SchoolAdminPage user={delegate} schoolId="school-1" />);

    expect(screen.getByText('Invite a teacher')).toBeTruthy();
    // A regular admin never sees the super-admin-only delegation section.
    expect(screen.queryByText('Delegate admin access')).toBeNull();

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

  it('lets a super admin delegate admin or super admin access', async () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({
      id: 'school-1',
      name: 'Riverside Elementary',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'super-admin-1',
      role: 'super_admin',
      displayName: 'Principal Lee',
      email: 'lee@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);
    vi.mocked(schoolLib.inviteMember).mockResolvedValue(undefined);

    render(<SchoolAdminPage user={superAdmin} schoolId="school-1" />);
    await waitFor(() => expect(screen.getByText('Delegate admin access')).toBeTruthy());

    const adminEmailInputs = screen.getAllByPlaceholderText('Email');
    fireEvent.change(adminEmailInputs[adminEmailInputs.length - 1], {
      target: { value: 'newadmin@example.com' },
    });
    // Two "Send Invite" buttons now (teacher section + admin-delegation
    // section) — the second is the one under "Delegate admin access".
    // Default role selection is "Admin" — send without touching the radio.
    fireEvent.click(screen.getAllByText('Send Invite')[1]);

    await waitFor(() =>
      expect(schoolLib.inviteMember).toHaveBeenCalledWith({
        schoolId: 'school-1',
        email: 'newadmin@example.com',
        role: 'admin',
        invitedByUid: 'super-admin-1',
      }),
    );
  });

  it('lets an admin cancel a pending invite', async () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({
      id: 'school-1',
      name: 'Riverside Elementary',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'super-admin-1',
      role: 'super_admin',
      displayName: 'Principal Lee',
      email: 'lee@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([
      { email: 'pending@example.com', schoolId: 'school-1', role: 'teacher', scope: { type: 'own' }, invitedByUid: 'super-admin-1', createdAt: new Date() },
    ]);
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);

    render(<SchoolAdminPage user={superAdmin} schoolId="school-1" />);
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => expect(schoolLib.cancelInvite).toHaveBeenCalledWith('pending@example.com'));
  });

  it('hides the remove button for the sole remaining super admin', () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({
      id: 'school-1',
      name: 'Riverside Elementary',
      createdAt: new Date(),
    });
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
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);

    render(<SchoolAdminPage user={superAdmin} schoolId="school-1" />);

    // Only one Remove button — for the admin, not the sole super admin
    // (including the current user, who also can't remove themselves).
    expect(screen.getAllByText('Remove')).toHaveLength(1);
  });

  it('has a back button to the classroom list', async () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({ id: 'school-1', name: 'Riverside Elementary', createdAt: new Date() });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);

    render(<SchoolAdminPage user={teacher} schoolId="school-1" />);
    await waitFor(() => expect(screen.getByText('Riverside Elementary')).toBeTruthy());

    fireEvent.click(screen.getByLabelText('Back'));
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('lets a super admin rename the school', async () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({ id: 'school-1', name: 'Riverside Elementary', createdAt: new Date() });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'super-admin-1',
      role: 'super_admin',
      displayName: 'Principal Lee',
      email: 'lee@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);
    vi.mocked(schoolLib.updateSchool).mockResolvedValue(undefined);

    render(<SchoolAdminPage user={superAdmin} schoolId="school-1" />);
    await waitFor(() => expect(screen.getByLabelText('Rename school')).toBeTruthy());

    fireEvent.click(screen.getByLabelText('Rename school'));
    fireEvent.change(screen.getByDisplayValue('Riverside Elementary'), { target: { value: 'Lakeside Elementary' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(schoolLib.updateSchool).toHaveBeenCalledWith('school-1', { name: 'Lakeside Elementary' }));
  });

  it('does not let a plain admin rename the school', async () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({ id: 'school-1', name: 'Riverside Elementary', createdAt: new Date() });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'delegate-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'om@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);

    render(<SchoolAdminPage user={delegate} schoolId="school-1" />);
    await waitFor(() => expect(screen.getByText('Riverside Elementary')).toBeTruthy());

    expect(screen.queryByLabelText('Rename school')).toBeNull();
  });

  it('shows Promote Students for an admin and navigates to /students/promote', async () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({ id: 'school-1', name: 'Riverside Elementary', createdAt: new Date() });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'delegate-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'om@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);

    render(<SchoolAdminPage user={delegate} schoolId="school-1" />);
    await waitFor(() => expect(screen.getByText('Riverside Elementary')).toBeTruthy());

    fireEvent.click(screen.getByText('Promote Students'));
    expect(navigateMock).toHaveBeenCalledWith('/students/promote');
  });

  it('shows Archive Students for an admin and navigates to /students/archive', async () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({ id: 'school-1', name: 'Riverside Elementary', createdAt: new Date() });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'delegate-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'om@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);

    render(<SchoolAdminPage user={delegate} schoolId="school-1" />);
    await waitFor(() => expect(screen.getByText('Riverside Elementary')).toBeTruthy());

    fireEvent.click(screen.getByText('Archive Students'));
    expect(navigateMock).toHaveBeenCalledWith('/students/archive');
  });

  it('lets a delegate admin edit a teacher scope', async () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({ id: 'school-1', name: 'Riverside Elementary', createdAt: new Date() });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'delegate-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'om@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });
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
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);
    vi.mocked(schoolLib.updateMemberScope).mockResolvedValue(undefined);

    render(<SchoolAdminPage user={delegate} schoolId="school-1" />);

    fireEvent.click(screen.getByLabelText('Edit scope'));
    // Two ScopePickers render at once (the Staff row editor + the Invite
    // section) — the first is the one we just opened.
    fireEvent.click(screen.getAllByText('Whole school (PE, art, music, etc.)')[0]);
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(schoolLib.updateMemberScope).toHaveBeenCalledWith('school-1', 'teacher-1', { type: 'school' }),
    );
  });

  it('lets an admin approve or decline a pending access request', async () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({
      id: 'school-1',
      name: 'Riverside Elementary',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'delegate-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'om@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([]);
    const request = {
      id: 'req-1',
      schoolId: 'school-1',
      contextId: 'ctx-1',
      contextName: '4th Grade',
      requestedByUid: 'owner-1',
      requestedByDisplayName: 'Ms. Owner',
      targetUid: 'target-1',
      targetDisplayName: 'Mr. Target',
      level: 'manage' as const,
      status: 'pending' as const,
      createdAt: new Date(),
    };
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([request]);
    vi.mocked(schoolLib.approveAccessRequest).mockResolvedValue(undefined);
    vi.mocked(schoolLib.declineAccessRequest).mockResolvedValue(undefined);

    render(<SchoolAdminPage user={delegate} schoolId="school-1" />);

    expect(screen.getByText(/Ms\. Owner wants Mr\. Target to have manage access to 4th Grade/)).toBeTruthy();

    fireEvent.click(screen.getByText('Approve'));
    await waitFor(() => expect(schoolLib.approveAccessRequest).toHaveBeenCalledWith(request, 'delegate-1'));

    fireEvent.click(screen.getByText('Decline'));
    await waitFor(() => expect(schoolLib.declineAccessRequest).toHaveBeenCalledWith('req-1', 'delegate-1'));
  });

  it("lets an admin revoke a teacher's classroom grant", () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({
      id: 'school-1',
      name: 'Riverside Elementary',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'delegate-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'om@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([
      {
        uid: 'teacher-1',
        role: 'teacher',
        displayName: 'Ms. Lord',
        email: 'lord@example.com',
        scope: { type: 'own' },
        classroomGrants: { 'ctx-1': 'manage' },
        addedByUid: 'delegate-1',
        createdAt: new Date(),
      },
    ]);
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);

    render(<SchoolAdminPage user={delegate} schoolId="school-1" />);

    fireEvent.click(screen.getByLabelText('Revoke access to classroom ctx-1'));
    expect(schoolLib.revokeClassroomGrant).toHaveBeenCalledWith('school-1', 'teacher-1', 'ctx-1');
  });
});
