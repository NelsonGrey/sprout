import type { User } from 'firebase/auth';
import { firebaseClient } from '../../lib/firebase';

/** Placeholder landing page shown once a user is signed in. */
export function HomePage({ user }: { user: User }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 text-white">
      <p>Signed in as {user.displayName ?? user.email ?? user.uid}</p>
      <button
        type="button"
        onClick={() => firebaseClient.auth.signOut()}
        className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
      >
        Sign out
      </button>
    </main>
  );
}
