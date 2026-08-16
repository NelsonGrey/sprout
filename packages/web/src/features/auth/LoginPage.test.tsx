import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as firebaseAuth from 'firebase/auth';
import { LoginPage } from './LoginPage';

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  OAuthProvider: vi.fn().mockImplementation(() => ({ addScope: vi.fn() })),
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('../../lib/firebase', () => ({
  firebaseClient: { auth: {} },
}));

describe('LoginPage', () => {
  it('shows Google, Apple, and email/password options', () => {
    render(<LoginPage />);
    expect(screen.getByText('Sign in with Google')).toBeTruthy();
    expect(screen.getByText('Sign in with Apple')).toBeTruthy();
    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
  });

  it('calls signInWithPopup with a Google provider', async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByText('Sign in with Google'));
    await waitFor(() => expect(firebaseAuth.signInWithPopup).toHaveBeenCalled());
    expect(firebaseAuth.GoogleAuthProvider).toHaveBeenCalled();
  });

  it('calls signInWithPopup with an Apple provider', async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByText('Sign in with Apple'));
    await waitFor(() => expect(firebaseAuth.OAuthProvider).toHaveBeenCalledWith('apple.com'));
  });

  it('toggles between sign-in and sign-up mode', () => {
    render(<LoginPage />);
    expect(screen.getByText('Sign In')).toBeTruthy();
    fireEvent.click(screen.getByText('Create an account'));
    expect(screen.getByText('Create Account')).toBeTruthy();
  });

  it('submits email/password sign-in', async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret1' } });
    fireEvent.click(screen.getByText('Sign In'));

    await waitFor(() =>
      expect(firebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'a@b.com',
        'secret1',
      ),
    );
  });

  it('requires an email before sending a password reset', () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByText('Forgot password?'));
    expect(screen.getByRole('alert').textContent).toMatch(/enter your email/i);
    expect(firebaseAuth.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('sends a password reset email once an email is entered', async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.click(screen.getByText('Forgot password?'));

    await waitFor(() =>
      expect(firebaseAuth.sendPasswordResetEmail).toHaveBeenCalledWith(expect.anything(), 'a@b.com'),
    );
    expect(screen.getByText(/reset email sent/i)).toBeTruthy();
  });
});
