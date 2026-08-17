import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { ClassroomDetailPage } from './ClassroomDetailPage';
import * as firestoreLib from '../../lib/firestore';

vi.mock('../../lib/firestore', () => ({
  useClassroom: vi.fn(),
  useStudents: vi.fn(),
  addStudent: vi.fn(),
}));

const user = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;
const classroom = { id: 'ctx-1', type: 'classroom' as const, name: '4th Grade', ownerUids: ['teacher-1'], createdAt: new Date() };

describe('ClassroomDetailPage', () => {
  it('shows empty state with no students', () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    expect(screen.getByText('4th Grade')).toBeTruthy();
    expect(screen.getByText('No students yet — add one below.')).toBeTruthy();
  });

  it('calls addStudent with the classroom owners', async () => {
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(classroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    vi.mocked(firestoreLib.addStudent).mockResolvedValue(undefined);
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    fireEvent.change(screen.getByPlaceholderText('Student name'), { target: { value: 'Alex' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() =>
      expect(firestoreLib.addStudent).toHaveBeenCalledWith({
        contextId: 'ctx-1',
        displayName: 'Alex',
        ownerUids: ['teacher-1'],
        schoolId: undefined,
        gradeLevel: undefined,
      }),
    );
  });

  it('scopes a newly added student to the classroom school/grade when set', async () => {
    const scopedClassroom = { ...classroom, ownerUids: ['other-teacher'], schoolId: 'school-1', gradeLevel: '4' };
    vi.mocked(firestoreLib.useClassroom).mockReturnValue(scopedClassroom);
    vi.mocked(firestoreLib.useStudents).mockReturnValue([]);
    vi.mocked(firestoreLib.addStudent).mockResolvedValue(undefined);
    render(<ClassroomDetailPage user={user} contextId="ctx-1" />);

    fireEvent.change(screen.getByPlaceholderText('Student name'), { target: { value: 'Alex' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() =>
      expect(firestoreLib.addStudent).toHaveBeenCalledWith({
        contextId: 'ctx-1',
        displayName: 'Alex',
        ownerUids: ['other-teacher'],
        schoolId: 'school-1',
        gradeLevel: '4',
      }),
    );
  });
});
