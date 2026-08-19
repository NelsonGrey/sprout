import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { SchoolAdminPage } from './SchoolAdminPage';
import * as schoolLib from '../../lib/school';

const navigateMock = vi.fn();
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/app/school', navigateMock] };
});

vi.mock('../../lib/school', () => ({
  getSchool: vi.fn(),
  updateSchool: vi.fn(),
  useMyMembership: vi.fn(),
  usePendingAccessRequestsForSchool: vi.fn(),
}));

const superAdmin = { uid: 'super-admin-1', displayName: 'Principal Lee', email: 'lee@example.com' } as User;
const delegate = { uid: 'delegate-1', displayName: 'Office Manager', email: 'om@example.com' } as User;
const teacher = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;

describe('SchoolAdminPage', () => {
  it('shows a plain teacher their own role and scope, with no admin nav links', () => {
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

    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);
    render(<SchoolAdminPage user={teacher} schoolId="school-1" />);

    expect(screen.getByText(/Teacher — Grades: 3, 4/)).toBeTruthy();
    expect(screen.queryByText('Staff')).toBeNull();
  });

  it('shows every admin nav link for a delegate admin', () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({ id: 'school-1', name: 'Riverside Elementary', createdAt: new Date() });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'delegate-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'om@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });

    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);
    render(<SchoolAdminPage user={delegate} schoolId="school-1" />);

    for (const label of ['Staff', 'Access Requests', 'Grades Offered']) {
      fireEvent.click(screen.getByText(label));
    }
    expect(navigateMock).toHaveBeenCalledWith('/app/school/staff');
    expect(navigateMock).toHaveBeenCalledWith('/app/school/requests');
    expect(navigateMock).toHaveBeenCalledWith('/app/school/grades');
  });

  it('shows a pending-request count badge on the Access Requests card', () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({ id: 'school-1', name: 'Riverside Elementary', createdAt: new Date() });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'delegate-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'om@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([
      {
        id: 'req-1',
        schoolId: 'school-1',
        contextId: 'ctx-1',
        contextName: '4th Grade',
        requestedByUid: 'other-teacher',
        requestedByDisplayName: 'Coach',
        targetUid: 'teacher-2',
        targetDisplayName: 'Ms. Lord',
        level: 'award',
        status: 'pending',
        createdAt: new Date(),
      },
    ]);

    render(<SchoolAdminPage user={delegate} schoolId="school-1" />);

    expect(screen.getByText('1')).toBeTruthy();
    expect(schoolLib.usePendingAccessRequestsForSchool).toHaveBeenCalledWith('school-1');
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

    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);
    render(<SchoolAdminPage user={teacher} schoolId="school-1" />);
    await waitFor(() => expect(screen.getByText('Riverside Elementary')).toBeTruthy());

    fireEvent.click(screen.getByLabelText('Back'));
    expect(navigateMock).toHaveBeenCalledWith('/app');
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
    vi.mocked(schoolLib.updateSchool).mockResolvedValue(undefined);

    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);
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

    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);
    render(<SchoolAdminPage user={delegate} schoolId="school-1" />);
    await waitFor(() => expect(screen.getByText('Riverside Elementary')).toBeTruthy());

    expect(screen.queryByLabelText('Rename school')).toBeNull();
  });

  it('shows Promote Students for an admin and navigates to /app/students/promote', async () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({ id: 'school-1', name: 'Riverside Elementary', createdAt: new Date() });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'delegate-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'om@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });

    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);
    render(<SchoolAdminPage user={delegate} schoolId="school-1" />);
    await waitFor(() => expect(screen.getByText('Riverside Elementary')).toBeTruthy());

    fireEvent.click(screen.getByText('Promote Students'));
    expect(navigateMock).toHaveBeenCalledWith('/app/students/promote');
  });

  it('shows Archive Students for an admin and navigates to /app/students/archive', async () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({ id: 'school-1', name: 'Riverside Elementary', createdAt: new Date() });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'delegate-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'om@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });

    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);
    render(<SchoolAdminPage user={delegate} schoolId="school-1" />);
    await waitFor(() => expect(screen.getByText('Riverside Elementary')).toBeTruthy());

    fireEvent.click(screen.getByText('Archive Students'));
    expect(navigateMock).toHaveBeenCalledWith('/app/students/archive');
  });

  it('shows Manage Students for an admin and navigates to /app/students', async () => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue({ id: 'school-1', name: 'Riverside Elementary', createdAt: new Date() });
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'delegate-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'om@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });

    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);
    render(<SchoolAdminPage user={delegate} schoolId="school-1" />);
    await waitFor(() => expect(screen.getByText('Riverside Elementary')).toBeTruthy());

    fireEvent.click(screen.getByText('Manage Students'));
    expect(navigateMock).toHaveBeenCalledWith('/app/students');
  });
});
