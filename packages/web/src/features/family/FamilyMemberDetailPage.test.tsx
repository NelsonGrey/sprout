import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { FamilyMemberDetailPage } from './FamilyMemberDetailPage';
import * as familyLib from '../../lib/family';

vi.mock('../../lib/family', () => ({
  useFamilyMembers: vi.fn(),
  useFamilyGoals: vi.fn(() => []),
  createFamilyGoal: vi.fn(),
  deleteFamilyGoal: vi.fn(),
  linkFamilyMemberAccount: vi.fn(),
  unlinkFamilyMemberAccount: vi.fn(),
  recordFamilyTransaction: vi.fn(),
}));

vi.mock('../../lib/firestore', () => ({
  useTransactions: vi.fn(() => []),
}));

const user = { uid: 'manager-1', displayName: 'Jordan Rivera', email: 'jordan@example.com' } as User;

const member = {
  id: 'member-1',
  firstName: 'Alex',
  lastName: 'Rivera',
  displayName: 'Alex Rivera',
  balanceCents: 500,
  contextId: 'ctx-1',
  ownerUids: ['manager-1'],
  createdAt: new Date(),
};

describe('FamilyMemberDetailPage', () => {
  it('records an earn via recordFamilyTransaction — never the classroom recordTransaction', () => {
    vi.mocked(familyLib.useFamilyMembers).mockReturnValue([member]);

    render(<FamilyMemberDetailPage user={user} contextId="ctx-1" familyMemberId="member-1" />);

    fireEvent.change(screen.getByPlaceholderText('Amount'), { target: { value: '5' } });
    fireEvent.change(screen.getByPlaceholderText('Reason'), { target: { value: 'Helped with chores' } });
    fireEvent.click(screen.getByText('Earn'));

    expect(familyLib.recordFamilyTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        contextId: 'ctx-1',
        studentId: 'member-1',
        type: 'earn',
        amountCents: 500,
        reason: 'Helped with chores',
        createdByUid: 'manager-1',
      }),
    );
  });

  it('offers a link-invite section for connecting the family member\'s own account', () => {
    vi.mocked(familyLib.useFamilyMembers).mockReturnValue([member]);
    render(<FamilyMemberDetailPage user={user} contextId="ctx-1" familyMemberId="member-1" />);

    expect(screen.getByText('Family account')).toBeTruthy();
    expect(screen.getByPlaceholderText("Their email")).toBeTruthy();
  });
});
