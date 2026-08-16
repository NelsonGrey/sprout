import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { StudentLedgerPage } from './StudentLedgerPage';
import * as firestoreLib from '../../lib/firestore';

vi.mock('../../lib/firestore', () => ({
  useStudents: vi.fn(),
  useTransactions: vi.fn(),
  recordTransaction: vi.fn(),
}));

const user = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;
const student = {
  id: 'student-1',
  displayName: 'Alex',
  balanceCents: 500,
  contexts: {},
  contextIds: ['ctx-1'],
  ownerUids: ['teacher-1'],
  createdAt: new Date(),
};

describe('StudentLedgerPage', () => {
  it('shows the balance and transaction history', () => {
    vi.mocked(firestoreLib.useStudents).mockReturnValue([student]);
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

    render(<StudentLedgerPage user={user} contextId="ctx-1" studentId="student-1" />);

    expect(screen.getByText('$5.00')).toBeTruthy();
    expect(screen.getByText('Homework')).toBeTruthy();
    expect(screen.getByText('+$5.00')).toBeTruthy();
  });

  it('records an earn transaction from the form', async () => {
    vi.mocked(firestoreLib.useStudents).mockReturnValue([student]);
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.recordTransaction).mockResolvedValue(undefined);

    render(<StudentLedgerPage user={user} contextId="ctx-1" studentId="student-1" />);

    fireEvent.change(screen.getByPlaceholderText('Amount'), { target: { value: '3' } });
    fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'Store' } });
    fireEvent.click(screen.getByText('Earn'));

    await waitFor(() =>
      expect(firestoreLib.recordTransaction).toHaveBeenCalledWith({
        contextId: 'ctx-1',
        studentId: 'student-1',
        type: 'earn',
        amountCents: 300,
        reason: 'Store',
        createdByUid: 'teacher-1',
        ownerUids: ['teacher-1'],
      }),
    );
  });
});
