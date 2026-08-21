import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TodayPage } from './TodayPage';
import * as firestoreLib from '../../lib/firestore';

vi.mock('../../lib/firestore', () => ({
  useTransactions: vi.fn(),
  useGoals: vi.fn(),
}));

vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/app/me', vi.fn()] };
});

const student = {
  id: 'student-1',
  firstName: 'Alex',
  lastName: 'Rivera',
  displayName: 'Alex Rivera',
  balanceCents: 850,
  contexts: {},
  contextId: 'ctx-1',
  ownerUids: ['teacher-1'],
  schoolId: 'school-1',
  gradeLevel: '4',
  contextName: '4th Grade',
  linkedUid: 'student-uid',
  createdAt: new Date(),
};

function tx(overrides: { id: string; reason: string }) {
  return {
    id: overrides.id,
    studentId: 'student-1',
    type: 'earn' as const,
    amountCents: 500,
    reason: overrides.reason,
    createdByUid: 'teacher-1',
    createdAt: new Date('2026-01-15'),
    ownerUids: ['teacher-1'],
  };
}

describe('TodayPage', () => {
  it('shows the balance, at most the three most recent transactions, and a link to full history — read only', () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([
      tx({ id: 'tx-1', reason: 'Homework' }),
      tx({ id: 'tx-2', reason: 'Chores' }),
      tx({ id: 'tx-3', reason: 'Reading' }),
      tx({ id: 'tx-4', reason: 'Extra credit' }),
    ]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);

    render(<TodayPage student={student} />);

    expect(screen.getByText('$8.50')).toBeTruthy();
    expect(screen.getByText('Homework')).toBeTruthy();
    expect(screen.getByText('Chores')).toBeTruthy();
    expect(screen.getByText('Reading')).toBeTruthy();
    expect(screen.queryByText('Extra credit')).toBeNull();
    expect(screen.getByText('See all history')).toBeTruthy();

    expect(screen.queryByText('Earn')).toBeNull();
    expect(screen.queryByText('Spend')).toBeNull();
    expect(screen.queryByPlaceholderText('Amount')).toBeNull();
  });

  it('shows only the first (current) goal, read-only', () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([
      { id: 'goal-1', studentId: 'student-1', name: 'New soccer ball', targetCents: 2000, savedCents: 800, createdByUid: 'teacher-1', createdAt: new Date() },
      { id: 'goal-2', studentId: 'student-1', name: 'Bike', targetCents: 5000, savedCents: 100, createdByUid: 'teacher-1', createdAt: new Date() },
    ]);

    render(<TodayPage student={student} />);

    expect(screen.getByText('New soccer ball')).toBeTruthy();
    expect(screen.queryByText('Bike')).toBeNull();
    expect(screen.queryByLabelText('Delete goal New soccer ball')).toBeNull();
  });

  it('offers a discussion-only reflection prompt with no text input', () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);

    render(<TodayPage student={student} />);

    const prompt = screen.getByText('What would you try next?');
    fireEvent.click(prompt);
    expect(screen.getByText('Discuss aloud with an adult — nothing typed here is saved.')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
