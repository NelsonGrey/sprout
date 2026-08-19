import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { AccessRequestsPage } from './AccessRequestsPage';
import * as schoolLib from '../../lib/school';

vi.mock('wouter', () => ({
  useLocation: () => ['/app/school/requests', vi.fn()],
}));

vi.mock('../../lib/school', () => ({
  useSchoolIdsForUser: vi.fn(),
  useMyMembership: vi.fn(),
  usePendingAccessRequestsForSchool: vi.fn(),
  approveAccessRequest: vi.fn(),
  declineAccessRequest: vi.fn(),
}));

const delegate = { uid: 'delegate-1', displayName: 'Office Manager', email: 'om@example.com' } as User;

describe('AccessRequestsPage', () => {
  it('lets an admin approve or decline a pending access request', async () => {
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'delegate-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'om@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });
    const request = {
      id: 'req-1',
      schoolId: 'school-1',
      contextId: 'ctx-1',
      contextName: '4th Grade',
      requestedByUid: 'owner-1',
      requestedByDisplayName: 'Ms. Owner',
      targetUid: 'target-1',
      targetDisplayName: 'Mr. Target',
      level: 'manage' as const,
      status: 'pending' as const,
      createdAt: new Date(),
    };
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([request]);
    vi.mocked(schoolLib.approveAccessRequest).mockResolvedValue(undefined);
    vi.mocked(schoolLib.declineAccessRequest).mockResolvedValue(undefined);

    render(<AccessRequestsPage user={delegate} />);

    expect(screen.getByText(/Ms\. Owner wants Mr\. Target to have manage access to 4th Grade/)).toBeTruthy();

    fireEvent.click(screen.getByText('Approve'));
    await waitFor(() => expect(schoolLib.approveAccessRequest).toHaveBeenCalledWith(request, 'delegate-1'));

    fireEvent.click(screen.getByText('Decline'));
    await waitFor(() => expect(schoolLib.declineAccessRequest).toHaveBeenCalledWith('req-1', 'delegate-1'));
  });

  it('shows an empty state with no pending requests', () => {
    vi.mocked(schoolLib.useSchoolIdsForUser).mockReturnValue(['school-1']);
    vi.mocked(schoolLib.useMyMembership).mockReturnValue({
      uid: 'delegate-1',
      role: 'admin',
      displayName: 'Office Manager',
      email: 'om@example.com',
      addedByUid: 'super-admin-1',
      createdAt: new Date(),
    });
    vi.mocked(schoolLib.usePendingAccessRequestsForSchool).mockReturnValue([]);

    render(<AccessRequestsPage user={delegate} />);

    expect(screen.getByText('No pending access requests.')).toBeTruthy();
  });
});
