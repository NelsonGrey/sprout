import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { StudentDetailPane } from './StudentDetailPane';
import * as firestoreLib from '../../lib/firestore';

vi.mock('../../lib/firestore', () => ({
  useTransactions: vi.fn(),
  useGoals: vi.fn(),
  recordTransaction: vi.fn(),
  createGoal: vi.fn(),
  deleteGoal: vi.fn(),
  updateStudent: vi.fn(),
  deleteStudent: vi.fn(),
  usePendingStudentLinkForStudent: vi.fn(),
  linkStudentAccount: vi.fn(),
  cancelStudentLink: vi.fn(),
  unlinkStudentAccount: vi.fn(),
  // Real implementation is a trivial last-whitespace split with no
  // dependency on Firebase — safe to inline here rather than
  // importOriginal (which would pull in the real ./firebase module and
  // its side-effecting FirebaseClient.initialize()).
  splitDisplayName: (name: string) => {
    const trimmed = name.trim();
    const lastSpace = trimmed.lastIndexOf(' ');
    if (lastSpace === -1) return { firstName: trimmed, lastName: '' };
    return { firstName: trimmed.slice(0, lastSpace).trim(), lastName: trimmed.slice(lastSpace + 1).trim() };
  },
}));

const user = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;
const student = {
  id: 'student-1',
  firstName: 'Alex',
  lastName: '',
  displayName: 'Alex',
  balanceCents: 500,
  contexts: {},
  contextId: 'ctx-1',
  ownerUids: ['teacher-1'],
  createdAt: new Date(),
};

const goal = {
  id: 'goal-1',
  studentId: 'student-1',
  name: 'New soccer ball',
  targetCents: 2000,
  savedCents: 800,
  createdByUid: 'teacher-1',
  createdAt: new Date(),
};

describe('StudentDetailPane', () => {
  it('shows the balance and transaction history', () => {
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

    render(
      <StudentDetailPane user={user} contextId="ctx-1" student={student} canManage={true} onDeleted={vi.fn()} />,
    );

    expect(screen.getByText('$5.00')).toBeTruthy();
    expect(screen.getByText('Homework')).toBeTruthy();
    expect(screen.getByText('+$5.00')).toBeTruthy();
  });

  it('records an earn transaction from the form', async () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);
    vi.mocked(firestoreLib.recordTransaction).mockResolvedValue(undefined);

    render(
      <StudentDetailPane user={user} contextId="ctx-1" student={student} canManage={true} onDeleted={vi.fn()} />,
    );

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

  it('records an earn transaction toward a specific goal when one is chosen', async () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([goal]);
    vi.mocked(firestoreLib.recordTransaction).mockResolvedValue(undefined);

    render(
      <StudentDetailPane user={user} contextId="ctx-1" student={student} canManage={true} onDeleted={vi.fn()} />,
    );

    fireEvent.change(screen.getByPlaceholderText('Amount'), { target: { value: '5' } });
    fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'Allowance' } });
    fireEvent.change(screen.getByLabelText('Save this earning toward'), { target: { value: 'goal-1' } });
    fireEvent.click(screen.getByText('Earn'));

    await waitFor(() =>
      expect(firestoreLib.recordTransaction).toHaveBeenCalledWith({
        contextId: 'ctx-1',
        studentId: 'student-1',
        type: 'earn',
        amountCents: 500,
        reason: 'Allowance',
        goalId: 'goal-1',
        createdByUid: 'teacher-1',
        ownerUids: ['teacher-1'],
      }),
    );
  });

  it('drops the save-as choice when recording a spend, even if one was selected', async () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);
    vi.mocked(firestoreLib.recordTransaction).mockResolvedValue(undefined);

    render(
      <StudentDetailPane user={user} contextId="ctx-1" student={student} canManage={true} onDeleted={vi.fn()} />,
    );

    fireEvent.change(screen.getByPlaceholderText('Amount'), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'Store' } });
    fireEvent.change(screen.getByLabelText('Save this earning toward'), { target: { value: 'just_in_case' } });
    fireEvent.click(screen.getByText('Spend'));

    await waitFor(() =>
      expect(firestoreLib.recordTransaction).toHaveBeenCalledWith({
        contextId: 'ctx-1',
        studentId: 'student-1',
        type: 'spend',
        amountCents: 200,
        reason: 'Store',
        createdByUid: 'teacher-1',
        ownerUids: ['teacher-1'],
      }),
    );
  });

  it('shows a savings-label badge on a labeled transaction in the history', () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([
      {
        id: 'tx-1',
        studentId: 'student-1',
        type: 'earn',
        amountCents: 500,
        reason: 'Allowance',
        savingsLabel: 'goal',
        goalId: 'goal-1',
        createdByUid: 'teacher-1',
        createdAt: new Date(),
        ownerUids: ['teacher-1'],
      },
    ]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);

    render(
      <StudentDetailPane user={user} contextId="ctx-1" student={student} canManage={true} onDeleted={vi.fn()} />,
    );

    expect(screen.getByText('Goal')).toBeTruthy();
  });

  it('shows a progress card for each of the student\'s goals', () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([goal]);

    render(
      <StudentDetailPane user={user} contextId="ctx-1" student={student} canManage={true} onDeleted={vi.fn()} />,
    );

    expect(screen.getByText('New soccer ball')).toBeTruthy();
    expect(screen.getByText('$8.00 of $20.00 saved')).toBeTruthy();
  });

  it('lets a teacher add a new goal', async () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);
    vi.mocked(firestoreLib.createGoal).mockResolvedValue(undefined);

    render(
      <StudentDetailPane user={user} contextId="ctx-1" student={student} canManage={true} onDeleted={vi.fn()} />,
    );

    fireEvent.click(screen.getByText('New goal'));
    fireEvent.change(screen.getByPlaceholderText('Goal name'), { target: { value: 'Book set' } });
    fireEvent.change(screen.getByPlaceholderText('Target amount'), { target: { value: '10' } });
    fireEvent.click(screen.getByText('Add goal'));

    await waitFor(() =>
      expect(firestoreLib.createGoal).toHaveBeenCalledWith({
        studentId: 'student-1',
        name: 'Book set',
        targetCents: 1000,
        createdByUid: 'teacher-1',
      }),
    );
  });

  it('deletes a goal', () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([goal]);
    vi.mocked(firestoreLib.deleteGoal).mockResolvedValue(undefined);

    render(
      <StudentDetailPane user={user} contextId="ctx-1" student={student} canManage={true} onDeleted={vi.fn()} />,
    );

    fireEvent.click(screen.getByLabelText('Delete goal New soccer ball'));
    expect(firestoreLib.deleteGoal).toHaveBeenCalledWith('student-1', 'goal-1');
  });

  it('renames the student', async () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);
    vi.mocked(firestoreLib.updateStudent).mockResolvedValue(undefined);
    render(
      <StudentDetailPane user={user} contextId="ctx-1" student={student} canManage={true} onDeleted={vi.fn()} />,
    );

    fireEvent.click(screen.getByLabelText('Rename student'));
    fireEvent.change(screen.getByDisplayValue('Alex'), { target: { value: 'Alexis' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(firestoreLib.updateStudent).toHaveBeenCalledWith('student-1', { firstName: 'Alexis', lastName: '' }),
    );
  });

  it('requires confirming before deleting the student, then calls onDeleted', async () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);
    vi.mocked(firestoreLib.deleteStudent).mockResolvedValue(undefined);
    const onDeleted = vi.fn();
    render(
      <StudentDetailPane user={user} contextId="ctx-1" student={student} canManage={true} onDeleted={onDeleted} />,
    );

    fireEvent.click(screen.getByLabelText('Delete student'));
    expect(firestoreLib.deleteStudent).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => expect(firestoreLib.deleteStudent).toHaveBeenCalledWith('student-1'));
    expect(onDeleted).toHaveBeenCalled();
  });

  it('hides rename/delete for a viewer with only award-level access', () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);
    render(
      <StudentDetailPane user={user} contextId="ctx-1" student={student} canManage={false} onDeleted={vi.fn()} />,
    );

    expect(screen.queryByLabelText('Rename student')).toBeNull();
    expect(screen.queryByLabelText('Delete student')).toBeNull();
    // Award-level access still gets the earn/spend form.
    expect(screen.getByText('Earn')).toBeTruthy();
  });

  it('shows rename/delete for a teacher with an explicit manage-level classroom grant', () => {
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([]);
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);
    render(
      <StudentDetailPane user={user} contextId="ctx-1" student={student} canManage={true} onDeleted={vi.fn()} />,
    );

    expect(screen.getByLabelText('Rename student')).toBeTruthy();
    expect(screen.getByLabelText('Delete student')).toBeTruthy();
  });
});
