import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { ClassroomDetailPage } from './ClassroomDetailPage';
import * as firestoreLib from '../../lib/firestore';
import * as schoolLib from '../../lib/school';

vi.mock('../../lib/firestore', () => ({
  useClassroom: vi.fn(),
  useStudents: vi.fn(),
  addStudent: vi.fn(),
  updateClassroom: vi.fn(),
  deleteClassroom: vi.fn(),
  updateStudent: vi.fn(),
  deleteStudent: vi.fn(),
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
  useAccessRequestsForContext: vi.fn(),
  createAccessRequest: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/classrooms/ctx-1', navigateMock] };
});

const user = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;
const classroom = { id: 'ctx-1', type: 'classroom' as const, name: '4th Grade', ownerUids: ['teacher-1'], createdAt: new Date() };

function mockOwnerDefaults() {
  vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
  vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
  vi.mocked(schoolLib.useAccessRequestsForContext).mockReturnValue([]);
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

  it('calls addStudent with the classroom owners', async () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    vi.mocked(firestoreLib.addStudent).mockResolvedValue(undefined);
    mockOwnerDefaults();
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    fireEvent.change(screen.getByPlaceholderText('Student name'), { target: { value: 'Alex' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() =>
      expect(firestoreLib.addStudent).toHaveBeenCalledWith({
        contextId: 'ctx-1',
        firstName: 'Alex',
        lastName: '',
        ownerUids: ['teacher-1'],
        schoolId: undefined,
        gradeLevel: undefined,
        contextName: '4th Grade',
      }),
    );
  });

  it('scopes a newly added student to the classroom school/grade when set', async () => {
    const scopedClassroom = { ...classroom, ownerUids: ['other-teacher'], schoolId: 'school-1', gradeLevel: '4' };
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(scopedClassroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    vi.mocked(firestoreLib.addStudent).mockResolvedValue(undefined);
    // Non-owner, but an admin — manage rights come from role, not scope,
    // matching the narrowed hasManageAccess rule.
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'admin',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.useMembersOfSchool).mockReturnValue([]);
    vi.mocked(schoolLib.useAccessRequestsForContext).mockReturnValue([]);
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    fireEvent.change(screen.getByPlaceholderText('Student name'), { target: { value: 'Alex' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() =>
      expect(firestoreLib.addStudent).toHaveBeenCalledWith({
        contextId: 'ctx-1',
        firstName: 'Alex',
        lastName: '',
        ownerUids: ['other-teacher'],
        schoolId: 'school-1',
        gradeLevel: '4',
        contextName: '4th Grade',
      }),
    );
  });

  it('has a back button to the classroom list', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    mockOwnerDefaults();
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    fireEvent.click(screen.getByLabelText('Back'));
    expect(navigateMock).toHaveBeenCalledWith('/');
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
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('hides rename/delete/create for a viewer with only award-level access', () => {
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
    vi.mocked(schoolLib.useAccessRequestsForContext).mockReturnValue([]);
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    expect(screen.queryByLabelText('Rename classroom')).toBeNull();
    expect(screen.queryByLabelText('Delete classroom')).toBeNull();
    expect(screen.queryByPlaceholderText('Student name')).toBeNull();
  });

  it('shows rename/delete/create for a teacher with an explicit manage-level classroom grant', () => {
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
    vi.mocked(schoolLib.useAccessRequestsForContext).mockReturnValue([]);
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    expect(screen.getByLabelText('Rename classroom')).toBeTruthy();
    expect(screen.getByPlaceholderText('Student name')).toBeTruthy();
  });

  it('lets the owner submit a request-access form for a colleague', async () => {
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
    vi.mocked(schoolLib.useAccessRequestsForContext).mockReturnValue([]);
    vi.mocked(schoolLib.createAccessRequest).mockResolvedValue(undefined);
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    fireEvent.change(screen.getByDisplayValue('Choose a teacher…'), { target: { value: 'colleague-1' } });
    fireEvent.click(screen.getByText('Full manage (rename/delete/roster)'));
    fireEvent.click(screen.getByText('Request Access'));

    await waitFor(() =>
      expect(schoolLib.createAccessRequest).toHaveBeenCalledWith({
        schoolId: 'school-1',
        contextId: 'ctx-1',
        contextName: '4th Grade',
        requestedByUid: 'teacher-1',
        requestedByDisplayName: 'Ms. Lord',
        targetUid: 'colleague-1',
        targetDisplayName: 'Mr. Colleague',
        level: 'manage',
      }),
    );
  });
});
