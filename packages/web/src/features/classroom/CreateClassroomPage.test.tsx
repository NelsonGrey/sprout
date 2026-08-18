import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { CreateClassroomPage } from './CreateClassroomPage';
import * as firestoreLib from '../../lib/firestore';
import * as schoolLib from '../../lib/school';

vi.mock('../../lib/firestore', () => ({
  createClassroom: vi.fn(),
}));

vi.mock('../../lib/school', () => ({
  useSchoolIdsForUser: vi.fn(),
  useMyMembership: vi.fn(),
  getSchool: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/classrooms/new', navigateMock] };
});

const user = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;

describe('CreateClassroomPage', () => {
  beforeEach(() => {
    vi.mocked(schoolLib.getSchool).mockResolvedValue(null);
  });

  it('calls createClassroom with the entered name, then navigates to My Classrooms', async () => {
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    vi.mocked(firestoreLib.createClassroom).mockResolvedValue(undefined);
    render(<CreateClassroomPage user={user} />);

    fireEvent.change(screen.getByPlaceholderText('Classroom name'), {
      target: { value: "Mrs. Lord's 4th Grade" },
    });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() =>
      expect(firestoreLib.createClassroom).toHaveBeenCalledWith({
        name: "Mrs. Lord's 4th Grade",
        ownerUid: 'teacher-1',
        ownerDisplayName: 'Ms. Lord',
        ownerEmail: 'lord@example.com',
        schoolId: undefined,
        gradeLevel: undefined,
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith('/');
  });

  it('lets an admin create a school-affiliated classroom with a grade', async () => {
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'admin@example.com',
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    vi.mocked(firestoreLib.createClassroom).mockResolvedValue(undefined);
    render(<CreateClassroomPage user={user} />);

    expect(screen.getByText('Add to school roster')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Classroom name'), { target: { value: 'Homeroom A' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '4' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() =>
      expect(firestoreLib.createClassroom).toHaveBeenCalledWith({
        name: 'Homeroom A',
        ownerUid: 'teacher-1',
        ownerDisplayName: 'Ms. Lord',
        ownerEmail: 'lord@example.com',
        schoolId: 'school-1',
        gradeLevel: '4',
      }),
    );
  });

  it('omits schoolId/gradeLevel when an admin unchecks "Add to school roster"', async () => {
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'admin@example.com',
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    vi.mocked(firestoreLib.createClassroom).mockResolvedValue(undefined);
    render(<CreateClassroomPage user={user} />);

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByPlaceholderText('Classroom name'), { target: { value: 'Personal Class' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() =>
      expect(firestoreLib.createClassroom).toHaveBeenCalledWith({
        name: 'Personal Class',
        ownerUid: 'teacher-1',
        ownerDisplayName: 'Ms. Lord',
        ownerEmail: 'lord@example.com',
        schoolId: undefined,
        gradeLevel: undefined,
      }),
    );
  });

  it("limits the grade select to the school's enabled grades", async () => {
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'teacher-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'admin@example.com',
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.getSchool).mockResolvedValue({
      id: 'school-1',
      name: 'Riverside Elementary',
      createdAt: new Date(),
      enabledGrades: ['PK', 'K', '1', '2', '3', '4', '5'],
    });
    render(<CreateClassroomPage user={user} />);

    await waitFor(() => expect(screen.getByRole('option', { name: '5' })).toBeTruthy());
    expect(screen.queryByRole('option', { name: '6' })).toBeNull();
  });

  it('has a back button to My Classrooms', () => {
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    render(<CreateClassroomPage user={user} />);

    fireEvent.click(screen.getByLabelText('Back'));
    expect(navigateMock).toHaveBeenCalledWith('/');
  });
});
