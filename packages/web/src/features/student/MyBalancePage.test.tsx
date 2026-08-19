import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MyBalancePage } from './MyBalancePage';
import * as firestoreLib from '../../lib/firestore';

vi.mock('../../lib/firestore', () => ({
  useTransactions: vi.fn(),
  useGoals: vi.fn(),
}));

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

describe('MyBalancePage', () => {
  it('shows the balance, classroom name, and transaction history — read only', () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([
      {
        id: 'tx-1',
        studentId: 'student-1',
        type: 'earn',
        amountCents: 500,
        reason: 'Homework',
        createdByUid: 'teacher-1',
        createdAt: new Date(),
        ownerUids: ['teacher-1'],
      },
    ]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);

    render(<MyBalancePage student={student} />);

    expect(screen.getByText('4th Grade')).toBeTruthy();
    expect(screen.getByText('$8.50')).toBeTruthy();
    expect(screen.getByText('Homework')).toBeTruthy();
    expect(screen.getByText('+$5.00')).toBeTruthy();

    // No earn/spend controls anywhere on this read-only view.
    expect(screen.queryByText('Earn')).toBeNull();
    expect(screen.queryByText('Spend')).toBeNull();
    expect(screen.queryByPlaceholderText('Amount')).toBeNull();
  });

  it('shows a savings-label badge on a labeled transaction', () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([
      {
        id: 'tx-1',
        studentId: 'student-1',
        type: 'earn',
        amountCents: 500,
        reason: 'Allowance',
        savingsLabel: 'just_in_case',
        createdByUid: 'teacher-1',
        createdAt: new Date(),
        ownerUids: ['teacher-1'],
      },
    ]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);

    render(<MyBalancePage student={student} />);

    expect(screen.getByText('Just in case')).toBeTruthy();
  });

  it('shows a spend-category badge on a categorized transaction', () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([
      {
        id: 'tx-1',
        studentId: 'student-1',
        type: 'spend',
        amountCents: 300,
        reason: 'New cleats',
        spendCategory: 'need',
        createdByUid: 'teacher-1',
        createdAt: new Date(),
        ownerUids: ['teacher-1'],
      },
    ]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);

    render(<MyBalancePage student={student} />);

    expect(screen.getByText('Need')).toBeTruthy();
  });

  it('shows read-only progress for each of the student\'s goals, with no delete control', () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([
      {
        id: 'goal-1',
        studentId: 'student-1',
        name: 'New soccer ball',
        targetCents: 2000,
        savedCents: 800,
        createdByUid: 'teacher-1',
        createdAt: new Date(),
      },
    ]);

    render(<MyBalancePage student={student} />);

    expect(screen.getByText('New soccer ball')).toBeTruthy();
    expect(screen.getByText('$8.00 of $20.00 saved')).toBeTruthy();
    expect(screen.queryByLabelText('Delete goal New soccer ball')).toBeNull();
  });

  it('shows an empty state with no transactions', () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);

    render(<MyBalancePage student={student} />);

    expect(screen.getByText('No transactions yet.')).toBeTruthy();
  });
});
