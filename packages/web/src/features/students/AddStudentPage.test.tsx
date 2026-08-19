import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { AddStudentPage } from './AddStudentPage';
import * as firestoreLib from '../../lib/firestore';
import * as schoolLib from '../../lib/school';

vi.mock('../../lib/firestore', () => ({
  useClassrooms: vi.fn(),
  useClassroomsInSchool: vi.fn(),
  addStudent: vi.fn(),
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
  useSchoolIdsForUser: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/app/students/new', navigateMock] };
});

const user = { uid: 'admin-1', displayName: 'Office Manager', email: 'admin@example.com' } as User;

const ownClassroom = {
  id: 'ctx-own',
  type: 'classroom' as const,
  name: 'My Own Class',
  ownerUids: ['admin-1'],
  createdAt: new Date(),
};
const schoolClassroom = {
  id: 'ctx-school',
  type: 'classroom' as const,
  name: '4th Grade',
  ownerUids: ['other-teacher'],
  schoolId: 'school-1',
  gradeLevel: '4',
  createdAt: new Date(),
};

describe('AddStudentPage', () => {
  it('offers every classroom in the school for an admin', () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue([schoolClassroom]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'admin-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'admin@example.com',
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    render(<AddStudentPage user={user} />);

    expect(screen.getByText('4th Grade')).toBeTruthy();
    expect(firestoreLib.useClassroomsInSchool).toHaveBeenCalledWith('school-1');
  });

  it('offers only their own schoolless classrooms for a non-admin', () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([ownClassroom, { ...schoolClassroom, ownerUids: ['admin-1'] }]);
    vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue([]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'admin-1',
      role: 'teacher',
      displayName: 'Ms. Lord',
      email: 'lord@example.com',
      scope: { type: 'own' },
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    render(<AddStudentPage user={user} />);

    expect(screen.getByText('My Own Class')).toBeTruthy();
    // Owns this one too, but it's school-affiliated — not addable by a
    // non-admin (school-staff-only, per canManageClassroom).
    expect(screen.queryByText('4th Grade')).toBeNull();
  });

  it('shows an empty state when there are no eligible classrooms', () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue([]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    render(<AddStudentPage user={user} />);

    expect(screen.getByText('No classrooms you can add a student to yet — create a classroom first.')).toBeTruthy();
  });

  it('disables Create until both a classroom and a name are set, then submits and navigates home', async () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue([schoolClassroom]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'admin-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'admin@example.com',
      addedByUid: 'super-1',
      createdAt: new Date(),
    });
    vi.mocked(firestoreLib.addStudent).mockResolvedValue(undefined);
    render(<AddStudentPage user={user} />);

    const createButton = screen.getByText('Create').closest('button') as HTMLButtonElement;
    expect(createButton.disabled).toBe(true);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ctx-school' } });
    expect(createButton.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText('Student name'), { target: { value: 'Alex Rivera' } });
    expect(createButton.disabled).toBe(false);

    fireEvent.click(createButton);

    await waitFor(() =>
      expect(firestoreLib.addStudent).toHaveBeenCalledWith({
        contextId: 'ctx-school',
        firstName: 'Alex',
        lastName: 'Rivera',
        ownerUids: ['other-teacher'],
        schoolId: 'school-1',
        gradeLevel: '4',
        contextName: '4th Grade',
      }),
    );
    expect(navigateMock).toHaveBeenCalledWith('/app');
  });

  it('has no back-arrow button — the breadcrumb trail (Home) is the way back', () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(firestoreLib.useClassroomsInSchool).mockReturnValue([]);
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue([]);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue(null);
    render(<AddStudentPage user={user} />);

    expect(screen.queryByLabelText('Back')).toBeNull();
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/app');
  });
});
