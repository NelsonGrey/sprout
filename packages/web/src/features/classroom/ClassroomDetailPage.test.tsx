import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { ClassroomDetailPage } from './ClassroomDetailPage';
import * as firestoreLib from '../../lib/firestore';
import * as schoolLib from '../../lib/school';

vi.mock('../../lib/firestore', () => ({
  useClassroom: vi.fn(),
  useStudents: vi.fn(),
  updateClassroom: vi.fn(),
  deleteClassroom: vi.fn(),
  bulkArchiveStudents: vi.fn(),
  bulkDeleteStudents: vi.fn(),
  // Transitively used by StudentDetailPane, rendered whenever a student is
  // selected in the right pane.
  updateStudent: vi.fn(),
  deleteStudent: vi.fn(),
  useTransactions: vi.fn(),
  useGoals: vi.fn(),
  recordTransaction: vi.fn(),
  createGoal: vi.fn(),
  deleteGoal: vi.fn(),
  usePendingStudentLinkForStudent: vi.fn(),
  linkStudentAccount: vi.fn(),
  cancelStudentLink: vi.fn(),
  unlinkStudentAccount: vi.fn(),
  // Real implementation is a trivial last-whitespace split with no
  // dependency on Firebase — safe to inline here rather than
  // importOriginal (which would pull in the real ./firebase module and
  // its side-effecting FirebaseClient.initialize()).
  splitDisplayName: (name: string) => {
    const trimmed = name.trim();
    const lastSpace = trimmed.lastIndexOf(' ');
    if (lastSpace === -1) return { firstName: trimmed, lastName: '' };
    return { firstName: trimmed.slice(0, lastSpace).trim(), lastName: trimmed.slice(lastSpace + 1).trim() };
  },
}));

vi.mock('../../lib/school', () => ({
  useMyMembership: vi.fn(),
  useMembersOfSchool: vi.fn(),
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

function mockOwnerDefaults() {
  vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
  vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
}

describe('ClassroomDetailPage', () => {
  it('shows empty state with no students', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    mockOwnerDefaults();
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    expect(screen.getByText('4th Grade')).toBeTruthy();
    expect(screen.getByText('No students yet — create one below.')).toBeTruthy();
  });

  it('has a back button to the classroom list', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    mockOwnerDefaults();
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    fireEvent.click(screen.getByLabelText('Back'));
    expect(navigateMock).toHaveBeenCalledWith('/app');
  });

  it('renames the classroom', async () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    vi.mocked(firestoreLib.updateClassroom).mockResolvedValue(undefined);
    mockOwnerDefaults();
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    fireEvent.click(screen.getByLabelText('Rename classroom'));
    const input = screen.getByDisplayValue('4th Grade');
    fireEvent.change(input, { target: { value: '5th Grade' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(firestoreLib.updateClassroom).toHaveBeenCalledWith('ctx-1', { name: '5th Grade' }));
  });

  it('requires confirming before deleting the classroom', async () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    vi.mocked(firestoreLib.deleteClassroom).mockResolvedValue(undefined);
    mockOwnerDefaults();
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    fireEvent.click(screen.getByLabelText('Delete classroom'));
    expect(firestoreLib.deleteClassroom).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(firestoreLib.deleteClassroom).toHaveBeenCalledWith('ctx-1'));
    expect(navigateMock).toHaveBeenCalledWith('/app');
  });

  it("the Add Student button navigates to that classroom's create-student page", () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    mockOwnerDefaults();
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    fireEvent.click(screen.getByText('Add Student'));
    expect(navigateMock).toHaveBeenCalledWith('/app/classrooms/ctx-1/students/new');
  });

  it('hides rename/delete/Add Student for a viewer with only award-level access', () => {
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
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    expect(screen.queryByLabelText('Rename classroom')).toBeNull();
    expect(screen.queryByLabelText('Delete classroom')).toBeNull();
    expect(screen.queryByText('Add Student')).toBeNull();
  });

  it('shows rename/delete/Add Student for a teacher with an explicit manage-level classroom grant', () => {
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
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    expect(screen.getByLabelText('Rename classroom')).toBeTruthy();
    expect(screen.getByText('Add Student')).toBeTruthy();
  });

  it("the owner sees a 'Request access for a colleague' button that navigates to the request-access page", () => {
    const schoolClassroom = { ...classroom, schoolId: 'school-1' };
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(schoolClassroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([
      {
        uid: 'colleague-1',
        role: 'teacher',
        displayName: 'Mr. Colleague',
        email: 'colleague@example.com',
        addedByUid: 'super-1',
        createdAt: new Date(),
      },
    ]);
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    fireEvent.click(screen.getByText('Request access for a colleague'));
    expect(navigateMock).toHaveBeenCalledWith('/app/classrooms/ctx-1/request-access');
  });

  it('hides the request-access button when the school has no other teachers', () => {
    const schoolClassroom = { ...classroom, schoolId: 'school-1' };
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(schoolClassroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    mockOwnerDefaults();
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    expect(screen.queryByText('Request access for a colleague')).toBeNull();
  });

  it('clicking a student shows their detail pane and updates the URL', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([student]);
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);
    mockOwnerDefaults();
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
    mockOwnerDefaults();
    render(<ClassroomDetailPage user={user} contextId="ctx-1" studentId="student-1" />);

    expect(screen.getByText('Earn')).toBeTruthy();
  });

  it('shows a checkbox per student only for a canManage viewer', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([student]);
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);
    mockOwnerDefaults();
    const { rerender } = render(<ClassroomDetailPage user={user} contextId="ctx-1" />);
    expect(screen.getByLabelText('Select Alex')).toBeTruthy();

    const scopedClassroom = { ...classroom, ownerUids: ['other-teacher'], schoolId: 'school-1' };
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(scopedClassroom);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      scope: { type: 'school' },
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    rerender(<ClassroomDetailPage user={user} contextId="ctx-1" />);
    expect(screen.queryByLabelText('Select Alex')).toBeNull();
  });

  it('checking a box swaps the right pane to the bulk-action bar', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([student]);
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);
    mockOwnerDefaults();
    render(<ClassroomDetailPage user={user} contextId="ctx-1" studentId="student-1" />);

    expect(screen.getByText('Earn')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Select Alex'));

    expect(screen.getByText('1 selected')).toBeTruthy();
    expect(screen.getByText('Archive selected')).toBeTruthy();
    expect(screen.queryByText('Earn')).toBeNull();
  });

  it('bulk-archives checked students', async () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([student]);
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);
    vi.mocked(firestoreLib.bulkArchiveStudents).mockResolvedValue(undefined);
    mockOwnerDefaults();
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    fireEvent.click(screen.getByLabelText('Select Alex'));
    fireEvent.click(screen.getByText('Archive selected'));

    await waitFor(() => expect(firestoreLib.bulkArchiveStudents).toHaveBeenCalledWith(['student-1']));
  });

  it('bulk-deletes checked students after confirming', async () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([student]);
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);
    vi.mocked(firestoreLib.bulkDeleteStudents).mockResolvedValue(undefined);
    mockOwnerDefaults();
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    fireEvent.click(screen.getByLabelText('Select Alex'));
    fireEvent.click(screen.getByText('Delete selected'));
    expect(firestoreLib.bulkDeleteStudents).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(firestoreLib.bulkDeleteStudents).toHaveBeenCalledWith(['student-1']));
  });
});
