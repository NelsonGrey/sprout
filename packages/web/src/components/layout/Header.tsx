import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { Menu } from 'lucide-react';
import { firebaseClient } from '../../lib/firebase';
import { useIsLinkedFamilyMember, useIsLinkedStudent } from '../../app/roleContext';

/** Persistent top bar — account menu, sign-out, and (mobile only) the
 * hamburger that opens Sidebar's drawer plus the logo, since Sidebar
 * carries the brand mark on desktop instead. Signed-out (login page)
 * shows just the logo, unchanged from before Sidebar existed. */
export function Header({
  user,
  onOpenMobileNav,
}: {
  user: User | null;
  onOpenMobileNav?: () => void;
}) {
  const [, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  // Dual-role switcher entry (§2.1) — called unconditionally (Rules of
  // Hooks); useIsLinkedStudent itself tolerates a null user.
  const isLinkedStudent = useIsLinkedStudent(user);
  const isLinkedFamilyMember = useIsLinkedFamilyMember(user);

  return (
    <header className="z-20 shrink-0 border-b border-border bg-header-bg">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        <div className="flex items-center gap-2">
          {user && (
            <button
              type="button"
              onClick={onOpenMobileNav}
              aria-label="Open navigation"
              className="grid h-9 w-9 place-items-center rounded-lg border border-border text-ink-soft lg:hidden"
            >
              <Menu size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(user ? '/app' : '/')}
            className={`text-lg font-extrabold tracking-tight text-ink ${user ? 'lg:hidden' : ''}`}
          >
            Sprout <span className="text-brand">Streak</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-on-dark"
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
                  {isLinkedStudent && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/app/me');
                      }}
                      className="w-full rounded-md px-2 py-1.5 text-left text-sm text-ink hover:bg-bg"
                    >
                      My student view
                    </button>
                  )}
                  {isLinkedFamilyMember && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/app/family/me');
                      }}
                      className="w-full rounded-md px-2 py-1.5 text-left text-sm text-ink hover:bg-bg"
                    >
                      My family view
                    </button>
                  )}
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
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/app/account/delete');
                    }}
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm text-danger hover:bg-bg"
                  >
                    Delete account
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
