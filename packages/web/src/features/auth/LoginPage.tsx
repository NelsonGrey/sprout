import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { firebaseClient } from '../../lib/firebase';

// Google-only on web — matches the mobile app's one-provider-per-platform
// design (Google/Android, Apple/iOS); web defaults to Google rather than
// standing up Apple's separate web JS SDK for a first cut.
export function LoginPage() {
  const signIn = async () => {
    await signInWithPopup(firebaseClient.auth, new GoogleAuthProvider());
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-8 text-center text-white">
      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-green-600 text-4xl">
        🌱
      </div>
      <div>
        <h1 className="text-3xl font-bold">Sprout</h1>
        <p className="mt-1 text-white/60">Grow good habits together</p>
      </div>
      <button
        type="button"
        onClick={signIn}
        className="w-full max-w-xs rounded-lg bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700"
      >
        Sign in with Google
      </button>
    </main>
  );
}
