import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GoalsPage } from './GoalsPage';
import * as firestoreLib from '../../lib/firestore';

vi.mock('../../lib/firestore', () => ({
  useGoals: vi.fn(),
}));

vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/app/me/goals', vi.fn()] };
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

describe('GoalsPage', () => {
  it('shows every goal, read-only, with no delete control', () => {
    vi.mocked(firestoreLib.useGoals).mockReturnValue([
      { id: 'goal-1', studentId: 'student-1', name: 'New soccer ball', targetCents: 2000, savedCents: 800, createdByUid: 'teacher-1', createdAt: new Date() },
      { id: 'goal-2', studentId: 'student-1', name: 'Bike', targetCents: 5000, savedCents: 5000, createdByUid: 'teacher-1', createdAt: new Date() },
    ]);

    render(<GoalsPage student={student} />);

    expect(screen.getByText('New soccer ball')).toBeTruthy();
    expect(screen.getByText('Bike')).toBeTruthy();
    expect(screen.queryByLabelText('Delete goal New soccer ball')).toBeNull();
  });

  it('offers a spend-detour preview for an unfinished goal that never writes anywhere', () => {
    vi.mocked(firestoreLib.useGoals).mockReturnValue([
      { id: 'goal-1', studentId: 'student-1', name: 'New soccer ball', targetCents: 2000, savedCents: 800, createdByUid: 'teacher-1', createdAt: new Date() },
    ]);

    render(<GoalsPage student={student} />);

    const input = screen.getByLabelText('Preview a spend against New soccer ball');
    fireEvent.change(input, { target: { value: '3' } });

    // saved 800, spend 300 -> saved drops to 500, so 2000 - 500 = 1500 still needed.
    expect(screen.getByText("You'd still need $15.00 more toward New soccer ball.")).toBeTruthy();
  });

  it('does not offer a spend-detour preview for an already-achieved goal', () => {
    vi.mocked(firestoreLib.useGoals).mockReturnValue([
      { id: 'goal-1', studentId: 'student-1', name: 'Bike', targetCents: 5000, savedCents: 5000, createdByUid: 'teacher-1', createdAt: new Date() },
    ]);

    render(<GoalsPage student={student} />);

    expect(screen.queryByLabelText('Preview a spend against Bike')).toBeNull();
  });

  it('shows an empty state with no goals', () => {
    vi.mocked(firestoreLib.useGoals).mockReturnValue([]);
    render(<GoalsPage student={student} />);
    expect(screen.getByText('No goals yet — ask an adult to set one up with you.')).toBeTruthy();
  });
});
