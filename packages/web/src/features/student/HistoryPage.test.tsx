import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HistoryPage } from './HistoryPage';
import * as firestoreLib from '../../lib/firestore';

vi.mock('../../lib/firestore', () => ({
  useTransactions: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/app/me/history', navigateMock] };
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
  createdAt: new Date(),
};

describe('HistoryPage', () => {
  it('has a back link to Today', () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    render(<HistoryPage student={student} />);
    expect(screen.getByLabelText('Back')).toBeTruthy();
  });

  it('shows every transaction, and expands a discussion-only reflection prompt on tap — nothing stored', () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([
      {
        id: 'tx-1',
        studentId: 'student-1',
        type: 'spend',
        amountCents: 300,
        reason: 'New cleats',
        createdByUid: 'teacher-1',
        createdAt: new Date('2026-01-15'),
        ownerUids: ['teacher-1'],
      },
    ]);

    render(<HistoryPage student={student} />);

    expect(screen.getByText('New cleats')).toBeTruthy();
    expect(screen.queryByText('What happened?')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /New cleats/ }));

    expect(screen.getByText(/What happened\?/)).toBeTruthy();
    expect(screen.getByText(/What would you try next time\?/)).toBeTruthy();
    expect(screen.getByText('Discuss aloud with an adult — nothing typed here is saved.')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('shows an empty state with no transactions', () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    render(<HistoryPage student={student} />);
    expect(screen.getByText('No transactions yet.')).toBeTruthy();
  });
});
