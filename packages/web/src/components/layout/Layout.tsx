import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { Header } from './Header';
import { Footer } from './Footer';

/** App shell: fixed header + fixed footer framing a scrolling body,
 * wrapping every route (including the pre-auth login screen) so branding
 * stays consistent whether or not the user is signed in. */
export function Layout({ user, children }: { user: User | null; children: ReactNode }) {
  return (
    <div className="site-shell flex h-dvh flex-col overflow-hidden bg-bg text-ink">
      <Header user={user} />
      <main className="site-scroll-region min-h-0 flex-1 overflow-y-auto">
        <div className="site-container flex min-h-full flex-col">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
