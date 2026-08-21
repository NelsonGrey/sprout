import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { FamilyPolicyProfilesAdminPage } from './FamilyPolicyProfilesAdminPage';
import * as familyLib from '../../lib/family';

vi.mock('../../lib/family', () => ({
  saveFamilyPolicyProfile: vi.fn(),
  useAllFamilyPolicyProfiles: vi.fn(() => []),
  usePlatformAdmin: vi.fn(),
}));

const user = { uid: 'someone-1', displayName: 'Someone', email: 'someone@example.com' } as User;

describe('FamilyPolicyProfilesAdminPage', () => {
  it('denies a non-platform-admin, showing no editing controls', () => {
    vi.mocked(familyLib.usePlatformAdmin).mockReturnValue(false);
    render(<FamilyPolicyProfilesAdminPage user={user} />);

    expect(screen.getByText('Only a platform administrator can manage this.')).toBeTruthy();
    expect(screen.queryByText('New profile')).toBeNull();
  });

  it('renders nothing while the claim is still loading', () => {
    vi.mocked(familyLib.usePlatformAdmin).mockReturnValue(undefined);
    const { container } = render(<FamilyPolicyProfilesAdminPage user={user} />);
    expect(container.innerHTML).toBe('');
  });

  it('lets a platform admin see the New profile action', () => {
    vi.mocked(familyLib.usePlatformAdmin).mockReturnValue(true);
    render(<FamilyPolicyProfilesAdminPage user={user} />);

    expect(screen.getByText('New profile')).toBeTruthy();
  });
});
