import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { Header } from './Header';
import { Footer } from './Footer';

/** App shell: fixed header + fixed footer framing a scrolling body,
 * wrapping every route (including the pre-auth login screen) so branding
 * stays consistent whether or not the user is signed in. */
export function Layout({ user, children }: { user: User | null; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <Header user={user} />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <Footer />
    </div>
  );
}
