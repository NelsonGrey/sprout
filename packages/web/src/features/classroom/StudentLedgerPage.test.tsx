import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { StudentLedgerPage } from './StudentLedgerPage';
import * as firestoreLib from '../../lib/firestore';

vi.mock('../../lib/firestore', () => ({
  useStudents: vi.fn(),
  useTransactions: vi.fn(),
  recordTransaction: vi.fn(),
  updateStudent: vi.fn(),
  deleteStudent: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/classrooms/ctx-1/students/student-1', navigateMock] };
});

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

  it('has a back button to the classroom', () => {
    vi.mocked(firestoreLib.useStudents).mockReturnValue([student]);
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    render(<StudentLedgerPage user={user} contextId="ctx-1" studentId="student-1" />);

    fireEvent.click(screen.getByLabelText('Back'));
    expect(navigateMock).toHaveBeenCalledWith('/classrooms/ctx-1');
  });

  it('renames the student', async () => {
    vi.mocked(firestoreLib.useStudents).mockReturnValue([student]);
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.updateStudent).mockResolvedValue(undefined);
    render(<StudentLedgerPage user={user} contextId="ctx-1" studentId="student-1" />);

    fireEvent.click(screen.getByLabelText('Rename student'));
    fireEvent.change(screen.getByDisplayValue('Alex'), { target: { value: 'Alexis' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => expect(firestoreLib.updateStudent).toHaveBeenCalledWith('student-1', { displayName: 'Alexis' }));
  });

  it('requires confirming before deleting the student', async () => {
    vi.mocked(firestoreLib.useStudents).mockReturnValue([student]);
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.deleteStudent).mockResolvedValue(undefined);
    render(<StudentLedgerPage user={user} contextId="ctx-1" studentId="student-1" />);

    fireEvent.click(screen.getByLabelText('Delete student'));
    expect(firestoreLib.deleteStudent).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(firestoreLib.deleteStudent).toHaveBeenCalledWith('student-1'));
    expect(navigateMock).toHaveBeenCalledWith('/classrooms/ctx-1');
  });
});
