import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GroupTransactionComposer } from './GroupTransactionComposer';
import * as apiLib from '../../../../lib/api';

vi.mock('../../../../lib/api', () => ({
  recordBulkTransaction: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  setOnline(true);
});

function setOnline(online: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { value: online, configurable: true });
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'));
  });
}

const students = [
  {
    id: 'student-1',
    firstName: 'Alex',
    lastName: '',
    displayName: 'Alex',
    balanceCents: 500,
    contexts: {},
    contextId: 'ctx-1',
    ownerUids: ['teacher-1'],
    createdAt: new Date(),
  },
  {
    id: 'student-2',
    firstName: 'Sam',
    lastName: '',
    displayName: 'Sam',
    balanceCents: 1000,
    contexts: {},
    contextId: 'ctx-1',
    ownerUids: ['teacher-1'],
    createdAt: new Date(),
  },
];

describe('GroupTransactionComposer', () => {
  it('shows an effect preview per recipient once a valid amount is entered', () => {
    render(<GroupTransactionComposer contextId="ctx-1" students={students} onDone={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Amount for each student'), { target: { value: '2' } });

    expect(screen.getByText('$5.00 → $7.00')).toBeTruthy();
    expect(screen.getByText('$10.00 → $12.00')).toBeTruthy();
  });

  it('shows a lower effect preview for Spend', () => {
    render(<GroupTransactionComposer contextId="ctx-1" students={students} onDone={vi.fn()} />);

    fireEvent.click(screen.getByText('Spend'));
    fireEvent.change(screen.getByPlaceholderText('Amount for each student'), { target: { value: '2' } });

    expect(screen.getByText('$5.00 → $3.00')).toBeTruthy();
  });

  it('disables submit until amount and reason are both present', () => {
    render(<GroupTransactionComposer contextId="ctx-1" students={students} onDone={vi.fn()} />);

    const submitButton = () => screen.getByText('Record 2 transactions').closest('button') as HTMLButtonElement;
    expect(submitButton().disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText('Amount for each student'), { target: { value: '2' } });
    expect(submitButton().disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'Field trip' } });
    expect(submitButton().disabled).toBe(false);
  });

  it('calls recordBulkTransaction with a stable idempotencyKey and every recipient', async () => {
    vi.mocked(apiLib.recordBulkTransaction).mockResolvedValue({ succeeded: ['student-1', 'student-2'], failed: [] });
    render(<GroupTransactionComposer contextId="ctx-1" students={students} onDone={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Amount for each student'), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'Field trip' } });
    fireEvent.click(screen.getByText('Record 2 transactions'));

    await waitFor(() => expect(apiLib.recordBulkTransaction).toHaveBeenCalled());
    const call = vi.mocked(apiLib.recordBulkTransaction).mock.calls[0][0];
    expect(call.recipientStudentIds).toEqual(['student-1', 'student-2']);
    expect(typeof call.idempotencyKey).toBe('string');
    expect(call.idempotencyKey.length).toBeGreaterThan(0);
  });

  it('retrying failed-only reuses the same idempotencyKey and narrows recipients', async () => {
    vi.mocked(apiLib.recordBulkTransaction).mockResolvedValueOnce({
      succeeded: ['student-1'],
      failed: [{ studentId: 'student-2', error: 'Student is archived' }],
    });
    render(<GroupTransactionComposer contextId="ctx-1" students={students} onDone={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Amount for each student'), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'Field trip' } });
    fireEvent.click(screen.getByText('Record 2 transactions'));

    await waitFor(() => expect(screen.getByText('Retry failed only')).toBeTruthy());
    const firstCall = vi.mocked(apiLib.recordBulkTransaction).mock.calls[0][0];

    vi.mocked(apiLib.recordBulkTransaction).mockResolvedValueOnce({ succeeded: ['student-2'], failed: [] });
    fireEvent.click(screen.getByText('Retry failed only'));

    await waitFor(() => expect(screen.getByText('2 of 2 recorded.')).toBeTruthy());
    const secondCall = vi.mocked(apiLib.recordBulkTransaction).mock.calls[1][0];
    expect(secondCall.idempotencyKey).toBe(firstCall.idempotencyKey);
    expect(secondCall.recipientStudentIds).toEqual(['student-2']);
  });

  it('surfaces a network error without crashing, and lets the user retry', async () => {
    vi.mocked(apiLib.recordBulkTransaction).mockRejectedValueOnce(new Error('Network request failed'));
    render(<GroupTransactionComposer contextId="ctx-1" students={students} onDone={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Amount for each student'), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'Field trip' } });
    fireEvent.click(screen.getByText('Record 2 transactions'));

    await waitFor(() => expect(screen.getByText('Network request failed')).toBeTruthy());
    expect(screen.getByText('Record 2 transactions')).toBeTruthy();
  });

  it('calls onDone when Cancel or Return to classroom is clicked', async () => {
    const onDone = vi.fn();
    vi.mocked(apiLib.recordBulkTransaction).mockResolvedValue({ succeeded: ['student-1', 'student-2'], failed: [] });
    render(<GroupTransactionComposer contextId="ctx-1" students={students} onDone={onDone} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onDone).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByPlaceholderText('Amount for each student'), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'Field trip' } });
    fireEvent.click(screen.getByText('Record 2 transactions'));
    await waitFor(() => expect(screen.getByText('Return to classroom')).toBeTruthy());

    fireEvent.click(screen.getByText('Return to classroom'));
    expect(onDone).toHaveBeenCalledTimes(2);
  });

  it('never says every recipient succeeded when any failed', async () => {
    vi.mocked(apiLib.recordBulkTransaction).mockResolvedValue({
      succeeded: ['student-1'],
      failed: [{ studentId: 'student-2', error: 'Student is archived' }],
    });
    render(<GroupTransactionComposer contextId="ctx-1" students={students} onDone={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Amount for each student'), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'Field trip' } });
    fireEvent.click(screen.getByText('Record 2 transactions'));

    await waitFor(() => expect(screen.getByText('1 of 2 recorded, 1 failed.')).toBeTruthy());
  });

  describe('offline', () => {
    it('disables the group submit and shows a reconnect notice while offline', () => {
      setOnline(false);
      render(<GroupTransactionComposer contextId="ctx-1" students={students} onDone={vi.fn()} />);

      fireEvent.change(screen.getByPlaceholderText('Amount for each student'), { target: { value: '2' } });
      fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'Field trip' } });

      expect(screen.getByText(/Reconnect to record this transaction/)).toBeTruthy();
      const submit = screen.getByText('Record 2 transactions').closest('button') as HTMLButtonElement;
      expect(submit.disabled).toBe(true);

      fireEvent.click(submit);
      expect(apiLib.recordBulkTransaction).not.toHaveBeenCalled();
    });

    it('disables "Retry failed only" while offline', async () => {
      vi.mocked(apiLib.recordBulkTransaction).mockResolvedValue({
        succeeded: ['student-1'],
        failed: [{ studentId: 'student-2', error: 'Student is archived' }],
      });
      render(<GroupTransactionComposer contextId="ctx-1" students={students} onDone={vi.fn()} />);

      fireEvent.change(screen.getByPlaceholderText('Amount for each student'), { target: { value: '2' } });
      fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'Field trip' } });
      fireEvent.click(screen.getByText('Record 2 transactions'));
      await waitFor(() => expect(screen.getByText('Retry failed only')).toBeTruthy());

      setOnline(false);

      expect(screen.getByText(/Reconnect to record this transaction/)).toBeTruthy();
      const retry = screen.getByText('Retry failed only').closest('button') as HTMLButtonElement;
      expect(retry.disabled).toBe(true);
    });
  });
});
