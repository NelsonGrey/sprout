import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { DashboardPage } from './DashboardPage';
import * as firestoreLib from '../../lib/firestore';
import * as schoolLib from '../../lib/school';

vi.mock('../../lib/firestore', () => ({
  useClassrooms: vi.fn(),
  useClassroomsInSchool: vi.fn(),
}));

vi.mock('../../lib/school', () => ({
  useSchoolIdsForUser: vi.fn(),
  useMyMembership: vi.fn(),
  usePendingAccessRequestsForSchool: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/app', navigateMock],
}));

const user = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;

describe('DashboardPage', () => {
  it('greets the user by first name', () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue([]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);

    render(<DashboardPage user={user} />);

    expect(screen.getByText('Welcome back, Ms.')).toBeTruthy();
  });

  it('shows an empty state with no classrooms', () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue([]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);

    render(<DashboardPage user={user} />);

    expect(screen.getByText('No classrooms yet')).toBeTruthy();
  });

  it('the Add Classroom button navigates to the create-classroom page', () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue([]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);

    render(<DashboardPage user={user} />);

    fireEvent.click(screen.getByText('Add Classroom'));
    expect(navigateMock).toHaveBeenCalledWith('/app/classrooms/new');
  });

  it('the School button navigates to /app/school for a schoolless (non-admin) user', () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue([]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);

    render(<DashboardPage user={user} />);

    fireEvent.click(screen.getByText('School'));
    expect(navigateMock).toHaveBeenCalledWith('/app/school');
  });

  it('hides the School button for an admin — already in the sidebar', () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue([]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'admin',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);

    render(<DashboardPage user={user} />);

    expect(screen.queryByText('School')).toBeNull();
  });

  it('shows the classroom count stat and merges owned classrooms with school-scoped classrooms', () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([
      { id: 'ctx-own', type: 'classroom', name: 'My Own Class', ownerUids: ['teacher-1'], createdAt: new Date() },
    ]);
    vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue([
      { id: 'ctx-scoped', type: 'classroom', name: "Coach's 5th Grade", ownerUids: ['other-teacher'], schoolId: 'school-1', gradeLevel: '5', createdAt: new Date() },
    ]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      scope: { type: 'school' },
      addedByUid: 'principal-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);

    render(<DashboardPage user={user} />);

    expect(screen.getByText('My Own Class')).toBeTruthy();
    expect(screen.getByText("Coach's 5th Grade")).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('Classrooms')).toBeTruthy();
  });

  it('gives a super_admin whole-school visibility despite having no scope field', () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue([
      { id: 'ctx-1', type: 'classroom', name: "3rd Grade", ownerUids: ['other-teacher'], schoolId: 'school-1', gradeLevel: '3', createdAt: new Date() },
    ]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'super_admin',
      displayName: 'Super Admin',
      email: 'super@example.com',
      // No `scope` field — admins/super_admins never have one.
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);

    render(<DashboardPage user={user} />);

    expect(firestoreLib.useClassroomsInSchool).toHaveBeenCalledWith('school-1', undefined);
    expect(screen.getByText('3rd Grade')).toBeTruthy();
  });

  it('gives a plain admin whole-school visibility and shows a pending-requests stat', () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue([
      { id: 'ctx-1', type: 'classroom', name: "4th Grade", ownerUids: ['other-teacher'], schoolId: 'school-1', gradeLevel: '4', createdAt: new Date() },
    ]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'admin@example.com',
      addedByUid: 'super-1',
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

    render(<DashboardPage user={user} />);

    expect(firestoreLib.useClassroomsInSchool).toHaveBeenCalledWith('school-1', undefined);
    expect(screen.getByText('4th Grade')).toBeTruthy();
    expect(screen.getByText('Pending request')).toBeTruthy();

    fireEvent.click(screen.getByText('Pending request').closest('button')!);
    expect(navigateMock).toHaveBeenCalledWith('/app/school');
  });

  it('hides the pending-requests stat for a non-admin teacher', () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue([]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      scope: { type: 'own' },
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);

    render(<DashboardPage user={user} />);

    expect(schoolLib.usePendingAccessRequestsForSchool).toHaveBeenCalledWith(undefined);
    expect(screen.queryByText(/Pending request/)).toBeNull();
  });
});
