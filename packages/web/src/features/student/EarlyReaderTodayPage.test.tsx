import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EarlyReaderTodayPage } from './EarlyReaderTodayPage';
import * as firestoreLib from '../../lib/firestore';

vi.mock('../../lib/firestore', () => ({
  useTransactions: vi.fn(),
  useGoals: vi.fn(),
}));

const student = {
  id: 'student-1',
  firstName: 'Sam',
  lastName: 'Lee',
  displayName: 'Sam Lee',
  balanceCents: 500,
  contexts: {},
  contextId: 'ctx-1',
  ownerUids: ['teacher-1'],
  gradeLevel: 'K',
  contextName: 'Room 4',
  createdAt: new Date(),
};

describe('EarlyReaderTodayPage', () => {
  it('shows a plain-language balance sentence rather than a dense $ figure alone', () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);

    render(<EarlyReaderTodayPage student={student} />);

    expect(screen.getByText('You have 5.00 dollars.')).toBeTruthy();
  });

  it('shows only the single most recent change, not a table', () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([
      {
        id: 'tx-1',
        studentId: 'student-1',
        type: 'earn',
        amountCents: 100,
        reason: 'Helping clean up',
        createdByUid: 'teacher-1',
        createdAt: new Date(),
        ownerUids: ['teacher-1'],
      },
      {
        id: 'tx-2',
        studentId: 'student-1',
        type: 'spend',
        amountCents: 50,
        reason: 'Sticker',
        createdByUid: 'teacher-1',
        createdAt: new Date(),
        ownerUids: ['teacher-1'],
      },
    ]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);

    render(<EarlyReaderTodayPage student={student} />);

    expect(screen.getByText('You earned 1.00 dollars for Helping clean up.')).toBeTruthy();
    expect(screen.queryByText(/Sticker/)).toBeNull();
  });

  it('shows a Pause · Choose · Grow prompt for an adult, not a text field', () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);

    render(<EarlyReaderTodayPage student={student} />);

    expect(screen.getByText('Pause · Choose · Grow')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
