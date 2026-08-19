import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { ClassroomRosterPage } from './ClassroomRosterPage';
import * as firestoreLib from '../../lib/firestore';
import * as schoolLib from '../../lib/school';

vi.mock('../../lib/firestore', () => ({
  useClassroom: vi.fn(),
  useStudents: vi.fn(),
  bulkArchiveStudents: vi.fn(),
  bulkDeleteStudents: vi.fn(),
}));

vi.mock('../../lib/school', () => ({
  useMyMembership: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/app/classrooms/ctx-1/roster', navigateMock] };
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

describe('ClassroomRosterPage', () => {
  it('denies a viewer with only award-level access', () => {
    const scopedClassroom = { ...classroom, ownerUids: ['other-teacher'], schoolId: 'school-1' };
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(scopedClassroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([student]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      scope: { type: 'school' },
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    render(<ClassroomRosterPage user={user} contextId="ctx-1" />);

    expect(screen.getByText('Only school staff can edit the roster.')).toBeTruthy();
    expect(screen.queryByText('Add Student')).toBeNull();
  });

  it('denies the owner of a school-affiliated classroom who is not an admin — ownership alone no longer suffices', () => {
    const scopedClassroom = { ...classroom, ownerUids: ['teacher-1'], schoolId: 'school-1' };
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(scopedClassroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([student]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      scope: { type: 'own' },
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    render(<ClassroomRosterPage user={user} contextId="ctx-1" />);

    expect(screen.getByText('Only school staff can edit the roster.')).toBeTruthy();
  });

  it('allows an admin to edit the roster of a school-affiliated classroom they do not own', () => {
    const scopedClassroom = { ...classroom, ownerUids: ['other-teacher'], schoolId: 'school-1' };
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
    render(<ClassroomRosterPage user={user} contextId="ctx-1" />);

    expect(screen.getByText('Add Student')).toBeTruthy();
  });

  it('allows the owner of a schoolless classroom, since they are its only possible manager', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    render(<ClassroomRosterPage user={user} contextId="ctx-1" />);

    expect(screen.getByText('Add Student')).toBeTruthy();
  });

  it('has no back-arrow button — the breadcrumb trail is the way back', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    render(<ClassroomRosterPage user={user} contextId="ctx-1" />);

    expect(screen.queryByLabelText('Back')).toBeNull();
    expect(screen.getByRole('link', { name: '4th Grade' }).getAttribute('href')).toBe('/app/classrooms/ctx-1');
  });

  it("the Add Student button navigates to that classroom's create-student page", () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    render(<ClassroomRosterPage user={user} contextId="ctx-1" />);

    fireEvent.click(screen.getByText('Add Student'));
    expect(navigateMock).toHaveBeenCalledWith('/app/classrooms/ctx-1/students/new');
  });

  it('checking a box reveals the bulk-action bar and archives directly (no confirm)', async () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([student]);
    vi.mocked(firestoreLib.bulkArchiveStudents).mockResolvedValue(undefined);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    render(<ClassroomRosterPage user={user} contextId="ctx-1" />);

    expect(screen.queryByText('Archive selected')).toBeNull();
    fireEvent.click(screen.getByLabelText('Select Alex'));

    expect(screen.getByText('1 selected')).toBeTruthy();
    fireEvent.click(screen.getByText('Archive selected'));

    await waitFor(() => expect(firestoreLib.bulkArchiveStudents).toHaveBeenCalledWith(['student-1']));
  });

  it('bulk-deletes checked students only after confirming', async () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([student]);
    vi.mocked(firestoreLib.bulkDeleteStudents).mockResolvedValue(undefined);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    render(<ClassroomRosterPage user={user} contextId="ctx-1" />);

    fireEvent.click(screen.getByLabelText('Select Alex'));
    fireEvent.click(screen.getByText('Delete selected'));
    expect(firestoreLib.bulkDeleteStudents).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(firestoreLib.bulkDeleteStudents).toHaveBeenCalledWith(['student-1']));
  });
});
