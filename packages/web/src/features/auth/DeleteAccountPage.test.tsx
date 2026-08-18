import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { DeleteAccountPage } from './DeleteAccountPage';
import * as accountLib from '../../lib/account';

const navigateMock = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/account/delete', navigateMock],
}));

vi.mock('../../lib/account', () => ({
  getAccountDeletionSummary: vi.fn(),
  deleteMyAccount: vi.fn(),
}));

const reauthenticateWithPopupMock = vi.fn();
const reauthenticateWithCredentialMock = vi.fn();
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  OAuthProvider: vi.fn().mockImplementation(() => ({ addScope: vi.fn() })),
  EmailAuthProvider: { credential: vi.fn().mockReturnValue('fake-credential') },
  reauthenticateWithPopup: (...args: unknown[]) => reauthenticateWithPopupMock(...args),
  reauthenticateWithCredential: (...args: unknown[]) => reauthenticateWithCredentialMock(...args),
}));

function googleUser(): User {
  return {
    uid: 'teacher-1',
    email: 'lord@example.com',
    providerData: [{ providerId: 'google.com' }],
  } as unknown as User;
}

function passwordUser(): User {
  return {
    uid: 'teacher-1',
    email: 'lord@example.com',
    providerData: [{ providerId: 'password' }],
  } as unknown as User;
}

describe('DeleteAccountPage', () => {
  it('hard-blocks deletion when the user is the sole super admin of a school', async () => {
    vi.mocked(accountLib.getAccountDeletionSummary).mockResolvedValue({
      schoolMemberships: [
        { schoolId: 'school-1', schoolName: 'Riverside Elementary', role: 'super_admin', isSoleSuperAdmin: true },
      ],
      standaloneClassrooms: [],
      linkedStudentName: null,
    });

    render(<DeleteAccountPage user={googleUser()} />);

    await waitFor(() => expect(screen.getByText("You can't delete your account yet")).toBeTruthy());
    expect(screen.queryByText('Delete My Account')).toBeNull();

    fireEvent.click(screen.getByText('Go to Staff — Riverside Elementary'));
    expect(navigateMock).toHaveBeenCalledWith('/school/staff');
  });

  it('requires acknowledgement before deleting when standalone classrooms will be destroyed', async () => {
    vi.mocked(accountLib.getAccountDeletionSummary).mockResolvedValue({
      schoolMemberships: [],
      standaloneClassrooms: [{ id: 'ctx-1', name: 'My Classroom' }],
      linkedStudentName: null,
    });

    render(<DeleteAccountPage user={googleUser()} />);
    await waitFor(() => expect(screen.getByText(/My Classroom/)).toBeTruthy());

    const deleteButton = screen.getByText('Delete My Account').closest('button') as HTMLButtonElement;
    expect(deleteButton.disabled).toBe(true);

    fireEvent.click(screen.getByRole('checkbox'));
    expect(deleteButton.disabled).toBe(false);
  });

  it('reauthenticates via Google popup then deletes the account', async () => {
    vi.mocked(accountLib.getAccountDeletionSummary).mockResolvedValue({
      schoolMemberships: [],
      standaloneClassrooms: [],
      linkedStudentName: null,
    });
    reauthenticateWithPopupMock.mockResolvedValue(undefined);
    vi.mocked(accountLib.deleteMyAccount).mockResolvedValue(undefined);

    const user = googleUser();
    render(<DeleteAccountPage user={user} />);
    await waitFor(() => expect(screen.getByText('Delete My Account')).toBeTruthy());

    fireEvent.click(screen.getByText('Delete My Account'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));

    await waitFor(() => expect(reauthenticateWithPopupMock).toHaveBeenCalled());
    await waitFor(() => expect(accountLib.deleteMyAccount).toHaveBeenCalledWith(user));
  });

  it('requires a password for password-provider users and shows a friendly error on failure', async () => {
    vi.mocked(accountLib.getAccountDeletionSummary).mockResolvedValue({
      schoolMemberships: [],
      standaloneClassrooms: [],
      linkedStudentName: null,
    });
    reauthenticateWithCredentialMock.mockRejectedValue({ code: 'auth/wrong-password' });
    vi.mocked(accountLib.deleteMyAccount).mockClear();

    render(<DeleteAccountPage user={passwordUser()} />);
    await waitFor(() => expect(screen.getByText('Delete My Account')).toBeTruthy());

    fireEvent.click(screen.getByText('Delete My Account'));
    const confirmButton = screen.getByRole('button', { name: 'Delete Account' }).closest('button') as HTMLButtonElement;
    expect(confirmButton.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText('Confirm your password'), { target: { value: 'hunter2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete Account' }));

    await waitFor(() => expect(screen.getByText('Incorrect password.')).toBeTruthy());
    expect(accountLib.deleteMyAccount).not.toHaveBeenCalled();
  });

  it('shows a note when the account is linked to a student, without blocking deletion', async () => {
    vi.mocked(accountLib.getAccountDeletionSummary).mockResolvedValue({
      schoolMemberships: [],
      standaloneClassrooms: [],
      linkedStudentName: 'Jamie Chen',
    });

    render(<DeleteAccountPage user={googleUser()} />);

    await waitFor(() => expect(screen.getByText(/Jamie Chen/)).toBeTruthy());
    expect((screen.getByText('Delete My Account').closest('button') as HTMLButtonElement).disabled).toBe(false);
  });
});
