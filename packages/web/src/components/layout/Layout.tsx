import { useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { Header } from './Header';
import { Footer } from './Footer';
import { Sidebar } from './Sidebar';
import { LessonReturnBanner } from '../../features/learn/LessonReturnBanner';

/** App shell: a persistent left Sidebar (staff users only — see its own
 * hasAnyStaffAccess check) alongside a header/content/footer column.
 * Wraps every route, including the pre-auth login screen, so branding
 * stays consistent whether or not the user is signed in — Sidebar simply
 * doesn't render when `user` is null. */
export function Layout({ user, children }: { user: User | null; children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="site-shell flex h-dvh flex-col overflow-hidden bg-bg text-ink">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {user && (
          <Sidebar user={user} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
        )}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header user={user} onOpenMobileNav={() => setMobileNavOpen(true)} />
          {user && <LessonReturnBanner />}
          <main className="site-scroll-region min-h-0 flex-1 overflow-y-auto">
            <div className="site-container flex min-h-full flex-col">{children}</div>
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
