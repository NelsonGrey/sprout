import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { ClassroomsPage } from './ClassroomsPage';
import * as firestoreLib from '../../lib/firestore';

vi.mock('../../lib/firestore', () => ({
  useClassrooms: vi.fn(),
  createClassroom: vi.fn(),
}));

vi.mock('../../lib/firebase', () => ({
  firebaseClient: { auth: { signOut: vi.fn() } },
}));

const user = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;

describe('ClassroomsPage', () => {
  it('shows empty state with no classrooms', () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    render(<ClassroomsPage user={user} />);
    expect(screen.getByText('No classrooms yet — add one below.')).toBeTruthy();
  });

  it('calls createClassroom with the entered name', async () => {
    vi.mocked(firestoreLib.useClassrooms).mockReturnValue([]);
    vi.mocked(firestoreLib.createClassroom).mockResolvedValue(undefined);
    render(<ClassroomsPage user={user} />);

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
      }),
    );
  });
});
