import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { ClassroomsPage } from './ClassroomsPage';
import * as firestoreLib from '../../lib/firestore';
import * as schoolLib from '../../lib/school';

vi.mock('../../lib/firestore', () => ({
  useClassrooms: vi.fn(),
  useClassroomsInSchool: vi.fn(),
}));

vi.mock('../../lib/school', () => ({
  useSchoolIdsForUser: vi.fn(),
  useMyMembership: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', navigateMock],
}));

const user = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;

describe('ClassroomsPage', () => {
  it('shows empty state with no classrooms', () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue([]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    render(<ClassroomsPage user={user} />);
    expect(screen.getByText('No classrooms yet — add one above.')).toBeTruthy();
  });

  it("the Add Classroom button navigates to the create-classroom page", () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue([]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    render(<ClassroomsPage user={user} />);

    fireEvent.click(screen.getByText('Add Classroom'));
    expect(navigateMock).toHaveBeenCalledWith('/classrooms/new');
  });

  it('merges owned classrooms with school-scoped classrooms', () => {
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

    render(<ClassroomsPage user={user} />);

    expect(screen.getByText('My Own Class')).toBeTruthy();
    expect(screen.getByText("Coach's 5th Grade")).toBeTruthy();
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

    render(<ClassroomsPage user={user} />);

    expect(firestoreLib.useClassroomsInSchool).toHaveBeenCalledWith('school-1', undefined);
    expect(screen.getByText('3rd Grade')).toBeTruthy();
  });

  it('gives a plain admin whole-school visibility despite having no scope field', () => {
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

    render(<ClassroomsPage user={user} />);

    expect(firestoreLib.useClassroomsInSchool).toHaveBeenCalledWith('school-1', undefined);
    expect(screen.getByText('4th Grade')).toBeTruthy();
  });
});
