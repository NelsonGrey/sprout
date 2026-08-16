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
export function LoginPage() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-8 text-center text-white">
      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-green-600 text-4xl">
        🌱
      </div>
      <div>
        <h1 className="text-3xl font-bold">Sprout Streak</h1>
        <p className="mt-1 text-white/60">Grow good habits together</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={busy}
          className="w-full rounded-lg bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Sign in with Google
        </button>
        <button
          type="button"
          onClick={signInWithApple}
          disabled={busy}
          className="w-full rounded-lg border border-white/20 px-4 py-3 font-medium text-white hover:bg-white/10 disabled:opacity-50"
        >
          Sign in with Apple
        </button>

        <div className="my-1 flex items-center gap-3 text-xs text-white/40">
          <div className="h-px flex-1 bg-white/10" />
          or
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="rounded-lg border border-white/20 bg-transparent px-3 py-2 text-left"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="rounded-lg border border-white/20 bg-transparent px-3 py-2 text-left"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg border border-white/20 px-4 py-3 font-medium text-white hover:bg-white/10 disabled:opacity-50"
          >
            {mode === 'sign-in' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="flex justify-between text-xs text-white/60">
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
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        {info && <p className="text-sm text-green-400">{info}</p>}
      </div>
    </main>
  );
}
