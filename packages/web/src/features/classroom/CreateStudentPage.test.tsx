import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { CreateStudentPage } from './CreateStudentPage';
import * as firestoreLib from '../../lib/firestore';

vi.mock('../../lib/firestore', () => ({
  useClassroom: vi.fn(),
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

const navigateMock = vi.fn();
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/app/classrooms/ctx-1/students/new', navigateMock] };
});

const user = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;
const classroom = { id: 'ctx-1', type: 'classroom' as const, name: '4th Grade', ownerUids: ['teacher-1'], createdAt: new Date() };

describe('CreateStudentPage', () => {
  it('calls addStudent with the classroom owners, then navigates back to the classroom', async () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.addStudent).mockResolvedValue(undefined);
    render(<CreateStudentPage user={user} contextId="ctx-1" />);

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
    expect(navigateMock).toHaveBeenCalledWith('/app/classrooms/ctx-1/roster');
  });

  it('scopes a newly added student to the classroom school/grade when set', async () => {
    const scopedClassroom = { ...classroom, ownerUids: ['other-teacher'], schoolId: 'school-1', gradeLevel: '4' };
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(scopedClassroom);
    vi.mocked(firestoreLib.addStudent).mockResolvedValue(undefined);
    render(<CreateStudentPage user={user} contextId="ctx-1" />);

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

  it('has no back-arrow button — the breadcrumb trail (Home > classroom > Roster) is the way back', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    render(<CreateStudentPage user={user} contextId="ctx-1" />);

    expect(screen.queryByLabelText('Back')).toBeNull();
    expect(screen.getByRole('link', { name: 'Roster' }).getAttribute('href')).toBe('/app/classrooms/ctx-1/roster');
  });

  it('disables Create until a name is entered', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    render(<CreateStudentPage user={user} contextId="ctx-1" />);

    expect((screen.getByText('Create').closest('button') as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText('Student name'), { target: { value: 'Alex' } });
    expect((screen.getByText('Create').closest('button') as HTMLButtonElement).disabled).toBe(false);
  });
});
