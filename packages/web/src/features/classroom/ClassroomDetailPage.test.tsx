import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { ClassroomDetailPage } from './ClassroomDetailPage';
import * as firestoreLib from '../../lib/firestore';
import * as schoolLib from '../../lib/school';
import * as apiLib from '../../lib/api';

vi.mock('../../lib/api', () => ({
  recordBulkTransaction: vi.fn(),
}));

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
  useMembersOfSchool: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/app/classrooms/ctx-1', navigateMock] };
});

const user = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;
// Schoolless classroom (no schoolId) — the owner remains its only
// possible manager, unaffected by the school-staff-only restriction.
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

function mockNoMembership() {
  vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
  vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
}

describe('ClassroomDetailPage', () => {
  it('shows empty state with no students', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    mockNoMembership();
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    expect(screen.getByRole('heading', { name: '4th Grade' })).toBeTruthy();
    expect(screen.getByText('No students yet.')).toBeTruthy();
  });

  it('has no back-arrow button — the breadcrumb trail is the way back, and Home is one link in it', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    mockNoMembership();
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    expect(screen.queryByLabelText('Back')).toBeNull();
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/app');
  });

  it('shows Roster/Settings icons for a schoolless classroom, since its owner is the only possible manager', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    mockNoMembership();
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    fireEvent.click(screen.getByLabelText('Roster'));
    expect(navigateMock).toHaveBeenCalledWith('/app/classrooms/ctx-1/roster');

    fireEvent.click(screen.getByLabelText('Classroom settings'));
    expect(navigateMock).toHaveBeenCalledWith('/app/classrooms/ctx-1/settings');
  });

  it('hides Roster/Settings icons for a school-affiliated classroom owner who is not an admin', () => {
    const scopedClassroom = { ...classroom, ownerUids: ['teacher-1'], schoolId: 'school-1', gradeLevel: '4' };
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(scopedClassroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      scope: { type: 'own' },
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    expect(screen.queryByLabelText('Roster')).toBeNull();
    expect(screen.queryByLabelText('Classroom settings')).toBeNull();
  });

  it('shows Roster/Settings icons for an admin on a school-affiliated classroom they do not own', () => {
    const scopedClassroom = { ...classroom, ownerUids: ['other-teacher'], schoolId: 'school-1', gradeLevel: '4' };
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(scopedClassroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'admin',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    fireEvent.click(screen.getByLabelText('Roster'));
    expect(navigateMock).toHaveBeenCalledWith('/app/classrooms/ctx-1/roster');
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
    mockNoMembership();
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    expect(screen.queryByText('Request access for a colleague')).toBeNull();
  });

  it('clicking a student shows their detail pane and updates the URL', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([student]);
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);
    vi.mocked(firestoreLib.useStoreItems).mockReturnValue([]);
    mockNoMembership();
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    expect(screen.getByText('Select a student to view details.')).toBeTruthy();

    fireEvent.click(screen.getByText('Alex'));

    expect(navigateMock).toHaveBeenCalledWith('/app/classrooms/ctx-1/students/student-1');
    // StudentDetailPane content is now showing (the earn/spend form is
    // unique to the detail pane — the balance text also appears in the
    // list row, so it's not a reliable marker on its own).
    expect(screen.getByText('Earn')).toBeTruthy();
  });

  it('clicking the mobile "Students" back link clears the selection and returns to the roster', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([student]);
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);
    vi.mocked(firestoreLib.useStoreItems).mockReturnValue([]);
    mockNoMembership();
    render(<ClassroomDetailPage user={user} contextId="ctx-1" studentId="student-1" />);

    expect(screen.getByText('Earn')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Students' }));

    expect(navigateMock).toHaveBeenCalledWith('/app/classrooms/ctx-1');
    expect(screen.getByText('Select a student to view details.')).toBeTruthy();
  });

  it('seeds the selected student from the studentId prop', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([student]);
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);
    vi.mocked(firestoreLib.useStoreItems).mockReturnValue([]);
    mockNoMembership();
    render(<ClassroomDetailPage user={user} contextId="ctx-1" studentId="student-1" />);

    expect(screen.getByText('Earn')).toBeTruthy();
  });

  describe('group selection mode', () => {
    beforeEach(() => {
      // navigateMock accumulates calls across the whole file — this
      // block's "did not navigate" assertions need a clean slate.
      navigateMock.mockClear();
    });

    const secondStudent = {
      id: 'student-2',
      firstName: 'Sam',
      lastName: '',
      displayName: 'Sam',
      balanceCents: 1000,
      contexts: {},
      contextId: 'ctx-1',
      ownerUids: ['teacher-1'],
      createdAt: new Date(),
    };

    function renderWithTwoStudents() {
      vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
      vi.mocked(firestoreLib.useStudents).mockReturnValue([student, secondStudent]);
      mockNoMembership();
      render(<ClassroomDetailPage user={user} contextId="ctx-1" />);
    }

    it('entering select mode does not navigate on row click, and shows checkboxes', () => {
      renderWithTwoStudents();

      fireEvent.click(screen.getByText('Select'));
      fireEvent.click(screen.getByLabelText('Select Alex'));

      expect(navigateMock).not.toHaveBeenCalledWith('/app/classrooms/ctx-1/students/student-1');
      expect(screen.getByLabelText('Select Alex')).toHaveProperty('checked', true);
    });

    it('selecting two students shows the group composer with both recipients', () => {
      renderWithTwoStudents();

      fireEvent.click(screen.getByText('Select'));
      fireEvent.click(screen.getByLabelText('Select Alex'));
      fireEvent.click(screen.getByLabelText('Select Sam'));

      expect(screen.getByText('2 students selected')).toBeTruthy();
      expect(screen.getByText('Record 2 transactions')).toBeTruthy();
    });

    it('"Select all visible" selects every student, and toggles to "Deselect all"', () => {
      renderWithTwoStudents();

      fireEvent.click(screen.getByText('Select'));
      fireEvent.click(screen.getByText('Select all visible'));

      expect(screen.getByText('2 students selected')).toBeTruthy();
      expect(screen.getByLabelText('Select Alex')).toHaveProperty('checked', true);
      expect(screen.getByLabelText('Select Sam')).toHaveProperty('checked', true);
      expect(screen.getByText('Deselect all')).toBeTruthy();
    });

    it('submits a group transaction via recordBulkTransaction, not recordTransaction', async () => {
      vi.mocked(apiLib.recordBulkTransaction).mockResolvedValue({ succeeded: ['student-1', 'student-2'], failed: [] });
      renderWithTwoStudents();

      fireEvent.click(screen.getByText('Select'));
      fireEvent.click(screen.getByText('Select all visible'));

      fireEvent.change(screen.getByPlaceholderText('Amount for each student'), { target: { value: '2' } });
      fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'Field trip' } });
      fireEvent.click(screen.getByText('Record 2 transactions'));

      await waitFor(() => expect(screen.getByText('2 of 2 recorded.')).toBeTruthy());
      expect(apiLib.recordBulkTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          contextId: 'ctx-1',
          type: 'earn',
          amountCentsEach: 200,
          reason: 'Field trip',
          recipientStudentIds: expect.arrayContaining(['student-1', 'student-2']),
        }),
      );
      expect(firestoreLib.recordTransaction).not.toHaveBeenCalled();
    });

    it('shows per-recipient failures and offers to retry failed only', async () => {
      vi.mocked(apiLib.recordBulkTransaction).mockResolvedValue({
        succeeded: ['student-1'],
        failed: [{ studentId: 'student-2', error: 'Student is archived' }],
      });
      renderWithTwoStudents();

      fireEvent.click(screen.getByText('Select'));
      fireEvent.click(screen.getByText('Select all visible'));
      fireEvent.change(screen.getByPlaceholderText('Amount for each student'), { target: { value: '2' } });
      fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'Field trip' } });
      fireEvent.click(screen.getByText('Record 2 transactions'));

      await waitFor(() => expect(screen.getByText('1 of 2 recorded, 1 failed.')).toBeTruthy());
      expect(screen.getByText('Sam: Student is archived')).toBeTruthy();
      expect(screen.getByText('Retry failed only')).toBeTruthy();
    });

    it('canceling select mode clears the selection and returns to the plain roster', () => {
      renderWithTwoStudents();

      fireEvent.click(screen.getByText('Select'));
      fireEvent.click(screen.getByLabelText('Select Alex'));
      fireEvent.click(screen.getByText('Cancel select'));

      expect(screen.getByText('Select')).toBeTruthy();
      expect(screen.queryByLabelText('Select Alex')).toBeNull();
    });
  });
});
