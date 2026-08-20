import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { MyStudentViewPage } from './MyStudentViewPage';
import * as firestoreLib from '../../lib/firestore';

vi.mock('../../lib/firestore', () => ({
  useLinkedStudent: vi.fn(),
  useTransactions: vi.fn(() => []),
  useGoals: vi.fn(() => []),
}));

const user = { uid: 'user-1' } as User;

describe('MyStudentViewPage', () => {
  it('renders nothing while the linked-student lookup is loading', () => {
    vi.mocked(firestoreLib.useLinkedStudent).mockReturnValue(undefined);
    const { container } = render(<MyStudentViewPage user={user} />);
    expect(container.innerHTML).toBe('');
  });

  it('explains the account is not linked once loaded', () => {
    vi.mocked(firestoreLib.useLinkedStudent).mockReturnValue(null);
    render(<MyStudentViewPage user={user} />);
    expect(screen.getByText("This account isn't linked to a student record.")).toBeTruthy();
  });

  it('renders the balance view for a linked student', () => {
    vi.mocked(firestoreLib.useLinkedStudent).mockReturnValue({
      id: 'student-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      displayName: 'Ada Lovelace',
      balanceCents: 500,
      contexts: {},
      contextId: 'ctx-1',
      contextName: 'Room 12',
      ownerUids: [],
      createdAt: new Date(),
    } as never);
    render(<MyStudentViewPage user={user} />);
    expect(screen.getByText('$5.00')).toBeTruthy();
  });
});
