import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { CreateFamilyPage } from './CreateFamilyPage';
import * as familyLib from '../../lib/family';

vi.mock('../../lib/family', () => ({
  createFamilyContext: vi.fn(),
  useEnabledFamilyPolicyProfiles: vi.fn(),
}));

const navigateMock = vi.fn();
vi.mock('wouter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wouter')>();
  return { ...actual, useLocation: () => ['/app/family/new', navigateMock] };
});

const user = { uid: 'manager-1', displayName: 'Jordan Rivera', email: 'jordan@example.com' } as User;

describe('CreateFamilyPage', () => {
  it('fails closed: shows no form and offers no create action with zero enabled profiles', () => {
    vi.mocked(familyLib.useEnabledFamilyPolicyProfiles).mockReturnValue([]);
    render(<CreateFamilyPage user={user} />);

    expect(screen.getByText("Family creation isn't available yet — no policy has been configured.")).toBeTruthy();
    expect(screen.queryByPlaceholderText('Family name')).toBeNull();
  });

  it('requires an affirmative consent acknowledgment before Create is enabled, when the profile requires it', () => {
    vi.mocked(familyLib.useEnabledFamilyPolicyProfiles).mockReturnValue([
      {
        id: 'profile-1',
        label: 'Default',
        enabled: true,
        isPlatformDefault: true,
        consentRequired: true,
        consentStatement: 'I confirm I am this child\'s parent or guardian.',
        retentionDays: null,
        createdByUid: 'admin-1',
        updatedByUid: 'admin-1',
        updatedAt: new Date(),
      },
    ]);
    render(<CreateFamilyPage user={user} />);

    fireEvent.change(screen.getByPlaceholderText('Family name'), { target: { value: 'The Rivera Family' } });
    expect((screen.getByText('Create').closest('button') as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('checkbox'));
    expect((screen.getByText('Create').closest('button') as HTMLButtonElement).disabled).toBe(false);
  });

  it('creates the family and navigates to its home once consent is satisfied', async () => {
    vi.mocked(familyLib.useEnabledFamilyPolicyProfiles).mockReturnValue([
      {
        id: 'profile-1',
        label: 'Default',
        enabled: true,
        isPlatformDefault: true,
        consentRequired: false,
        consentStatement: '',
        retentionDays: null,
        createdByUid: 'admin-1',
        updatedByUid: 'admin-1',
        updatedAt: new Date(),
      },
    ]);
    vi.mocked(familyLib.createFamilyContext).mockResolvedValue('ctx-1');
    render(<CreateFamilyPage user={user} />);

    fireEvent.change(screen.getByPlaceholderText('Family name'), { target: { value: 'The Rivera Family' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => expect(familyLib.createFamilyContext).toHaveBeenCalledWith({
      name: 'The Rivera Family',
      ownerUid: 'manager-1',
      policyProfileId: 'profile-1',
    }));
    expect(navigateMock).toHaveBeenCalledWith('/app/family/ctx-1');
  });
});
