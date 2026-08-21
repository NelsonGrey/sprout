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

vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/app/me', vi.fn()] };
});

const user = { uid: 'user-1' } as User;

const gradeStudent = (gradeLevel: string | undefined) => ({
  id: 'student-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  displayName: 'Ada Lovelace',
  balanceCents: 500,
  contexts: {},
  contextId: 'ctx-1',
  contextName: 'Room 12',
  gradeLevel,
  ownerUids: [],
  createdAt: new Date(),
});

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

  it('renders Today by default for a student with a standard-band grade level', () => {
    vi.mocked(firestoreLib.useLinkedStudent).mockReturnValue(gradeStudent('4') as never);
    render(<MyStudentViewPage user={user} />);
    expect(screen.getByText('$5.00')).toBeTruthy();
    expect(screen.getByText('See all history')).toBeTruthy();
  });

  it('renders History for view="history"', () => {
    vi.mocked(firestoreLib.useLinkedStudent).mockReturnValue(gradeStudent('4') as never);
    render(<MyStudentViewPage user={user} view="history" />);
    expect(screen.getByText('No transactions yet.')).toBeTruthy();
  });

  it('renders Goals for view="goals"', () => {
    vi.mocked(firestoreLib.useLinkedStudent).mockReturnValue(gradeStudent('4') as never);
    render(<MyStudentViewPage user={user} view="goals" />);
    expect(screen.getByText('No goals yet — ask an adult to set one up with you.')).toBeTruthy();
  });

  it('always renders the collapsed early-reader Today regardless of the requested view for a Pre-K-2 grade level', () => {
    vi.mocked(firestoreLib.useLinkedStudent).mockReturnValue(gradeStudent('K') as never);
    render(<MyStudentViewPage user={user} view="goals" />);
    expect(screen.getByText('Pause · Choose · Grow')).toBeTruthy();
    expect(screen.queryByText('No goals yet — ask an adult to set one up with you.')).toBeNull();
  });
});
