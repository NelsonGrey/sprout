import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { firebaseClient } from '../../lib/firebase';
import { ThemeToggle } from './ThemeToggle';

/** Persistent site chrome — logo/home link, account menu, sign-out.
 * Deliberately minimal nav this pass (no role-aware links like "School")
 * to avoid duplicating LandingRouter's staff/student detection logic here
 * too; existing contextual links (e.g. ClassroomsPage's "School" button)
 * stay where they are. */
export function Header({ user }: { user: User | null }) {
  const [, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-header-bg px-6 py-3">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="text-lg font-extrabold tracking-tight text-ink"
      >
        Sprout <span className="text-brand">Streak</span>
      </button>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        {user && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white"
              aria-label="Account menu"
            >
              {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-surface p-2 shadow-lg">
                <p className="truncate px-2 py-1 text-sm font-medium text-ink">
                  {user.displayName || 'Signed in'}
                </p>
                <p className="truncate px-2 pb-2 text-xs text-ink-muted">{user.email}</p>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    firebaseClient.auth.signOut();
                  }}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-ink hover:bg-bg"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
