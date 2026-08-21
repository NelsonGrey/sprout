import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { MyFamilyMemberViewPage } from './MyFamilyMemberViewPage';
import * as familyLib from '../../lib/family';
import * as firestoreLib from '../../lib/firestore';

vi.mock('../../lib/family', () => ({
  useLinkedFamilyMember: vi.fn(),
  useFamilyGoals: vi.fn(() => []),
}));

vi.mock('../../lib/firestore', () => ({
  useTransactions: vi.fn(() => []),
}));

const user = { uid: 'member-uid-1' } as User;

describe('MyFamilyMemberViewPage', () => {
  it('renders nothing while the linked-family-member lookup is loading', () => {
    vi.mocked(familyLib.useLinkedFamilyMember).mockReturnValue(undefined);
    const { container } = render(<MyFamilyMemberViewPage user={user} />);
    expect(container.innerHTML).toBe('');
  });

  it("explains the account isn't linked once loaded", () => {
    vi.mocked(familyLib.useLinkedFamilyMember).mockReturnValue(null);
    render(<MyFamilyMemberViewPage user={user} />);
    expect(screen.getByText("This account isn't linked to a family record.")).toBeTruthy();
  });

  it('shows the balance and history read-only — no earn/spend/goal controls anywhere', () => {
    vi.mocked(familyLib.useLinkedFamilyMember).mockReturnValue({
      id: 'member-1',
      firstName: 'Alex',
      lastName: 'Rivera',
      displayName: 'Alex Rivera',
      balanceCents: 500,
      contextId: 'ctx-1',
      ownerUids: ['manager-1'],
      createdAt: new Date(),
    });
    vi.mocked(firestoreLib.useTransactions).mockReturnValue([
      {
        id: 'tx-1',
        studentId: 'member-1',
        type: 'earn',
        amountCents: 500,
        reason: 'Helped with chores',
        createdByUid: 'manager-1',
        createdAt: new Date(),
        ownerUids: ['manager-1'],
      },
    ]);

    render(<MyFamilyMemberViewPage user={user} />);

    expect(screen.getByText('$5.00')).toBeTruthy();
    expect(screen.getByText('Helped with chores')).toBeTruthy();
    expect(screen.queryByText('Earn')).toBeNull();
    expect(screen.queryByText('Spend')).toBeNull();
    expect(screen.queryByPlaceholderText('Amount')).toBeNull();
  });
});
