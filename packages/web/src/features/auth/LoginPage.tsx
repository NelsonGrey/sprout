import { useState } from 'react';
import {
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { firebaseClient } from '../../lib/firebase';

type Mode = 'sign-in' | 'sign-up';

function friendlyAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account already exists with that email — try signing in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

/**
 * Google + Apple + email/password, all via Firebase Auth's client SDK
 * directly (no separate Apple JS SDK needed — signInWithPopup handles it
 * the same way as Google). Apple and email/password only work once their
 * providers are enabled for this project in the Firebase console; Apple
 * additionally needs a Sign in with Apple Services ID configured in the
 * Apple Developer portal with this site's domains as return URLs.
 */
function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        minLength={6}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 pr-16 text-left text-ink"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-muted hover:underline"
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await action();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = () =>
    run(async () => {
      await signInWithPopup(firebaseClient.auth, new GoogleAuthProvider());
    });

  const signInWithApple = () =>
    run(async () => {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      await signInWithPopup(firebaseClient.auth, provider);
    });

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'sign-up' && password !== confirmPassword) {
      setError('Passwords do not match.');
      setInfo('');
      return;
    }
    return run(async () => {
      if (mode === 'sign-in') {
        await signInWithEmailAndPassword(firebaseClient.auth, email, password);
      } else {
        await createUserWithEmailAndPassword(firebaseClient.auth, email, password);
      }
    });
  };

  const handleForgotPassword = () => {
    if (!email) {
      setError('Enter your email above first, then tap "Forgot password?"');
      return;
    }
    return run(async () => {
      await sendPasswordResetEmail(firebaseClient.auth, email);
      setInfo('Password reset email sent — check your inbox.');
    });
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-6 px-8 py-16 text-center text-ink">
      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-brand text-4xl">
        🌱
      </div>
      <div>
        <h1 className="text-3xl font-bold">Sprout Streak</h1>
        <p className="mt-1 text-ink-muted">Grow good habits together</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={busy}
          className="w-full rounded-lg bg-brand px-4 py-3 font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          Sign in with Google
        </button>
        <button
          type="button"
          onClick={signInWithApple}
          disabled={busy}
          className="w-full rounded-lg border border-border px-4 py-3 font-medium text-ink hover:bg-bg disabled:opacity-50"
        >
          Sign in with Apple
        </button>

        <div className="my-1 flex items-center gap-3 text-xs text-ink-muted">
          <div className="h-px flex-1 bg-border" />
          or
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="rounded-lg border border-border bg-surface px-3 py-2 text-left text-ink"
          />
          <PasswordInput value={password} onChange={setPassword} placeholder="Password" />
          {mode === 'sign-up' && (
            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm password"
            />
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg border border-border px-4 py-3 font-medium text-ink hover:bg-bg disabled:opacity-50"
          >
            {mode === 'sign-in' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="flex justify-between text-xs text-ink-muted">
          <button
            type="button"
            onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
            className="hover:underline"
          >
            {mode === 'sign-in' ? 'Create an account' : 'Already have an account?'}
          </button>
          <button type="button" onClick={handleForgotPassword} className="hover:underline">
            Forgot password?
          </button>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}
        {info && <p className="text-sm text-brand">{info}</p>}
      </div>
    </div>
  );
}
