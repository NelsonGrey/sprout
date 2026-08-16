import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { SchoolAdminPage } from './SchoolAdminPage';
import * as schoolLib from '../../lib/school';

vi.mock('wouter', () => ({
  useLocation: () => ['/school', vi.fn()],
}));

vi.mock('../../lib/school', () => ({
  getSchool: vi.fn(),
  inviteMember: vi.fn(),
  cancelInvite: vi.fn(),
  removeMember: vi.fn(),
  useMyMembership: vi.fn(),
  useMembersOfSchool: vi.fn(),
  usePendingInvitesForSchool: vi.fn(),
}));

const principal = { uid: 'principal-1', displayName: 'Principal Lee', email: 'lee@example.com' } as User;
const delegate = { uid: 'delegate-1', displayName: 'Office Manager', email: 'om@example.com' } as User;
const teacher = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;

describe('SchoolAdminPage', () => {
  it("shows a plain teacher their own role and scope, with no admin tooling", () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({
      id: 'school-1',
      name: 'Riverside Elementary',
      principalUid: 'principal-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      scope: { type: 'grades', grades: ['3', '4'] },
      addedByUid: 'principal-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([]);

    render(<SchoolAdminPage user={teacher} schoolId="school-1" />);

    expect(screen.getByText(/Teacher — Grades: 3, 4/)).toBeTruthy();
    expect(screen.queryByText('Invite a teacher')).toBeNull();
    expect(screen.queryByText('Delegate admin access')).toBeNull();
  });

  it('lets a delegate admin invite a teacher but not another admin', async () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({
      id: 'school-1',
      name: 'Riverside Elementary',
      principalUid: 'principal-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'delegate-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'om@example.com',
      addedByUid: 'principal-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([]);
    vi.mocked(schoolLib.inviteMember).mockResolvedValue(undefined);

    render(<SchoolAdminPage user={delegate} schoolId="school-1" />);

    expect(screen.getByText('Invite a teacher')).toBeTruthy();
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

  it('lets the principal delegate admin access', async () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({
      id: 'school-1',
      name: 'Riverside Elementary',
      principalUid: 'principal-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'principal-1',
      role: 'admin',
      displayName: 'Principal Lee',
      email: 'lee@example.com',
      addedByUid: 'principal-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([]);
    vi.mocked(schoolLib.inviteMember).mockResolvedValue(undefined);

    render(<SchoolAdminPage user={principal} schoolId="school-1" />);
    await waitFor(() => expect(screen.getByText('Delegate admin access')).toBeTruthy());

    const adminEmailInputs = screen.getAllByPlaceholderText('Email');
    fireEvent.change(adminEmailInputs[adminEmailInputs.length - 1], {
      target: { value: 'newadmin@example.com' },
    });
    fireEvent.click(screen.getByText('Invite Admin'));

    await waitFor(() =>
      expect(schoolLib.inviteMember).toHaveBeenCalledWith({
        schoolId: 'school-1',
        email: 'newadmin@example.com',
        role: 'admin',
        invitedByUid: 'principal-1',
      }),
    );
  });

  it('lets an admin cancel a pending invite', async () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({
      id: 'school-1',
      name: 'Riverside Elementary',
      principalUid: 'principal-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'principal-1',
      role: 'admin',
      displayName: 'Principal Lee',
      email: 'lee@example.com',
      addedByUid: 'principal-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
    vi.mocked(schoolLib.usePendingInvitesForSchool).mockReturnValue([
      { email: 'pending@example.com', schoolId: 'school-1', role: 'teacher', scope: { type: 'own' }, invitedByUid: 'principal-1', createdAt: new Date() },
    ]);

    render(<SchoolAdminPage user={principal} schoolId="school-1" />);
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => expect(schoolLib.cancelInvite).toHaveBeenCalledWith('pending@example.com'));
  });
});
