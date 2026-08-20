import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionComposer } from './TransactionComposer';
import * as firestoreLib from '../../../../lib/firestore';

vi.mock('../../../../lib/firestore', () => ({
  recordTransaction: vi.fn(),
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

const goal = {
  id: 'goal-1',
  studentId: 'student-1',
  name: 'New soccer ball',
  targetCents: 5000,
  savedCents: 1000,
  createdByUid: 'teacher-1',
  createdAt: new Date(),
};

function renderComposer(overrides: Partial<Parameters<typeof TransactionComposer>[0]> = {}) {
  render(
    <TransactionComposer
      contextId="ctx-1"
      studentId="student-1"
      ownerUids={['teacher-1']}
      createdByUid="teacher-1"
      goals={[]}
      storeItems={[]}
      {...overrides}
    />,
  );
}

describe('TransactionComposer', () => {
  it('records an earn with the entered amount/reason', async () => {
    renderComposer();

    fireEvent.change(screen.getByPlaceholderText('Amount'), { target: { value: '5' } });
    fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'Homework' } });
    fireEvent.click(screen.getByText('Earn'));

    expect(firestoreLib.recordTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        contextId: 'ctx-1',
        studentId: 'student-1',
        type: 'earn',
        amountCents: 500,
        reason: 'Homework',
        createdByUid: 'teacher-1',
        ownerUids: ['teacher-1'],
      }),
    );
  });

  it('does nothing when amount or reason is missing', () => {
    renderComposer();

    fireEvent.click(screen.getByText('Earn'));

    expect(firestoreLib.recordTransaction).not.toHaveBeenCalled();
  });

  it('tags an earn with a selected goal, implying savingsLabel: goal', () => {
    renderComposer({ goals: [goal] });

    fireEvent.change(screen.getByPlaceholderText('Amount'), { target: { value: '5' } });
    fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'Allowance' } });
    fireEvent.change(screen.getByLabelText('Save this earning toward'), { target: { value: 'goal-1' } });
    fireEvent.click(screen.getByText('Earn'));

    expect(firestoreLib.recordTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'earn', goalId: 'goal-1' }),
    );
  });

  it('tags a spend with the selected category', () => {
    renderComposer();

    fireEvent.change(screen.getByPlaceholderText('Amount'), { target: { value: '3' } });
    fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'New cleats' } });
    fireEvent.change(screen.getByLabelText('This purchase is a'), { target: { value: 'need' } });
    fireEvent.click(screen.getByText('Spend'));

    expect(firestoreLib.recordTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'spend', spendCategory: 'need' }),
    );
  });

  it('shows an opportunity-cost reminder only once an amount is entered and an unfinished goal exists', () => {
    renderComposer({ goals: [goal] });

    expect(screen.queryByText(/Spending this now means less goes toward/)).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('Amount'), { target: { value: '2' } });

    expect(screen.getByText(/Spending this now means less goes toward: New soccer ball/)).toBeTruthy();
  });

  it('tapping a store item chip prefills amount and reason', () => {
    renderComposer({
      storeItems: [
        {
          id: 'item-1',
          contextId: 'ctx-1',
          name: 'Pencil pouch',
          priceCents: 250,
          createdByUid: 'teacher-1',
          createdAt: new Date(),
        },
      ],
    });

    fireEvent.click(screen.getByText('Pencil pouch — $2.50'));

    expect((screen.getByPlaceholderText('Amount') as HTMLInputElement).value).toBe('2.50');
    expect((screen.getByPlaceholderText('Reason') as HTMLInputElement).value).toBe('Pencil pouch');
  });

  it('clears the draft after a successful record', async () => {
    renderComposer();

    fireEvent.change(screen.getByPlaceholderText('Amount'), { target: { value: '5' } });
    fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'Homework' } });
    fireEvent.click(screen.getByText('Earn'));

    await waitFor(() => expect((screen.getByPlaceholderText('Amount') as HTMLInputElement).value).toBe(''));
    expect((screen.getByPlaceholderText('Reason') as HTMLInputElement).value).toBe('');
  });

  describe('offline', () => {
    it('disables Earn/Spend and shows a reconnect notice while offline', () => {
      setOnline(false);
      renderComposer();

      fireEvent.change(screen.getByPlaceholderText('Amount'), { target: { value: '5' } });
      fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'Homework' } });

      expect(screen.getByText(/Reconnect to record this transaction/)).toBeTruthy();
      expect((screen.getByText('Earn').closest('button') as HTMLButtonElement).disabled).toBe(true);
      expect((screen.getByText('Spend').closest('button') as HTMLButtonElement).disabled).toBe(true);

      fireEvent.click(screen.getByText('Earn'));
      expect(firestoreLib.recordTransaction).not.toHaveBeenCalled();
    });

    it('re-enables submission once back online, with no offline notice', () => {
      setOnline(false);
      renderComposer();
      expect(screen.getByText(/Reconnect to record this transaction/)).toBeTruthy();

      setOnline(true);

      expect(screen.queryByText(/Reconnect to record this transaction/)).toBeNull();
      fireEvent.change(screen.getByPlaceholderText('Amount'), { target: { value: '5' } });
      fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'Homework' } });
      fireEvent.click(screen.getByText('Earn'));

      expect(firestoreLib.recordTransaction).toHaveBeenCalled();
    });
  });
});
