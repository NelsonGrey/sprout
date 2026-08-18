import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { Header } from './Header';

const signOutMock = vi.fn();
vi.mock('../../lib/firebase', () => ({
  firebaseClient: { auth: { signOut: () => signOutMock() } },
}));

const navigateMock = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', navigateMock],
}));

const user = { uid: 'teacher-1', displayName: 'Ms. Lord', email: 'lord@example.com' } as User;

describe('Header', () => {
  it('shows the logo but no account menu when signed out', () => {
    render(<Header user={null} />);

    expect(screen.getByText('Streak')).toBeTruthy();
    expect(screen.queryByLabelText('Account menu')).toBeNull();
  });

  it('shows an account menu with sign-out when signed in', () => {
    render(<Header user={user} />);

    fireEvent.click(screen.getByLabelText('Account menu'));
    expect(screen.getByText('Ms. Lord')).toBeTruthy();
    expect(screen.getByText('lord@example.com')).toBeTruthy();

    fireEvent.click(screen.getByText('Sign out'));
    expect(signOutMock).toHaveBeenCalled();
  });

  it('navigates to the delete-account page when Delete account is clicked', () => {
    render(<Header user={user} />);

    fireEvent.click(screen.getByLabelText('Account menu'));
    fireEvent.click(screen.getByText('Delete account'));
    expect(navigateMock).toHaveBeenCalledWith('/account/delete');
  });

  it('navigates home when the logo is clicked', () => {
    render(<Header user={user} />);

    fireEvent.click(screen.getByText('Streak'));
    expect(navigateMock).toHaveBeenCalledWith('/');
  });
});
