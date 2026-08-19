import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { ClassroomDetailPage } from './ClassroomDetailPage';
import * as firestoreLib from '../../lib/firestore';
import * as schoolLib from '../../lib/school';

vi.mock('../../lib/firestore', () => ({
  useClassroom: vi.fn(),
  useStudents: vi.fn(),
  // Transitively used by StudentDetailPane, rendered whenever a student is
  // selected in the right pane.
  updateStudent: vi.fn(),
  deleteStudent: vi.fn(),
  useTransactions: vi.fn(),
  useGoals: vi.fn(),
  useStoreItems: vi.fn(),
  recordTransaction: vi.fn(),
  createGoal: vi.fn(),
  deleteGoal: vi.fn(),
  usePendingStudentLinkForStudent: vi.fn(),
  linkStudentAccount: vi.fn(),
  cancelStudentLink: vi.fn(),
  unlinkStudentAccount: vi.fn(),
}));

vi.mock('../../lib/school', () => ({
  useMyMembership: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/app/classrooms/ctx-1', navigateMock] };
});

const user = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;
const classroom = { id: 'ctx-1', type: 'classroom' as const, name: '4th Grade', ownerUids: ['teacher-1'], createdAt: new Date() };
const student = {
  id: 'student-1',
  firstName: 'Alex',
  lastName: '',
  displayName: 'Alex',
  balanceCents: 500,
  contexts: {},
  contextId: 'ctx-1',
  ownerUids: ['teacher-1'],
  createdAt: new Date(),
};

describe('ClassroomDetailPage', () => {
  it('shows empty state with no students', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    expect(screen.getByRole('heading', { name: '4th Grade' })).toBeTruthy();
    expect(screen.getByText('No students yet.')).toBeTruthy();
  });

  it('has no back-arrow button — the breadcrumb trail is the way back, and Home is one link in it', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    expect(screen.queryByLabelText('Back')).toBeNull();
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/app');
  });

  it('always shows the Settings icon, since some settings sections (e.g. the store) have no manage gate', () => {
    const scopedClassroom = { ...classroom, ownerUids: ['other-teacher'], schoolId: 'school-1', gradeLevel: '4' };
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(scopedClassroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      scope: { type: 'school' },
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    fireEvent.click(screen.getByLabelText('Classroom settings'));
    expect(navigateMock).toHaveBeenCalledWith('/app/classrooms/ctx-1/settings');
  });

  it('hides the Roster icon for a viewer with only award-level access', () => {
    const scopedClassroom = { ...classroom, ownerUids: ['other-teacher'], schoolId: 'school-1', gradeLevel: '4' };
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(scopedClassroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      scope: { type: 'school' },
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    expect(screen.queryByLabelText('Roster')).toBeNull();
  });

  it('shows the Roster icon for a teacher with an explicit manage-level classroom grant, and it navigates to /roster', () => {
    const scopedClassroom = { ...classroom, ownerUids: ['other-teacher'], schoolId: 'school-1', gradeLevel: '4' };
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(scopedClassroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      scope: { type: 'own' },
      classroomGrants: { 'ctx-1': 'manage' },
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    fireEvent.click(screen.getByLabelText('Roster'));
    expect(navigateMock).toHaveBeenCalledWith('/app/classrooms/ctx-1/roster');
  });

  it('clicking a student shows their detail pane and updates the URL', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([student]);
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);
    vi.mocked(firestoreLib.useStoreItems).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    expect(screen.getByText('Select a student to view details.')).toBeTruthy();

    fireEvent.click(screen.getByText('Alex'));

    expect(navigateMock).toHaveBeenCalledWith('/app/classrooms/ctx-1/students/student-1');
    // StudentDetailPane content is now showing (the earn/spend form is
    // unique to the detail pane — the balance text also appears in the
    // list row, so it's not a reliable marker on its own).
    expect(screen.getByText('Earn')).toBeTruthy();
  });

  it('seeds the selected student from the studentId prop', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([student]);
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);
    vi.mocked(firestoreLib.useStoreItems).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    render(<ClassroomDetailPage user={user} contextId="ctx-1" studentId="student-1" />);

    expect(screen.getByText('Earn')).toBeTruthy();
  });
});
