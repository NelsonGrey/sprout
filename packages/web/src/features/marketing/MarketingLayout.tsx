import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { ArrowRight, Leaf, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';

const navItems = [
  { href: '/districts', label: 'Districts' },
  { href: '/schools', label: 'Schools' },
  { href: '/educators', label: 'Educators' },
  { href: '/families', label: 'Families' },
  { href: '/students', label: 'Students' },
  { href: '/curriculum', label: 'Learning library' },
  { href: '/readiness', label: 'Readiness' },
];

export function MarketingLayout({
  user,
  children,
}: {
  user: User | null;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [path] = useLocation();
  const scrollRegionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    scrollRegionRef.current?.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto',
    });
  }, [path]);

  return (
    <div className="site-shell flex h-dvh flex-col overflow-hidden bg-canvas text-ink">
      <header
        data-no-print
        className="z-50 shrink-0 border-b border-border/90 bg-canvas/95 backdrop-blur-xl"
      >
        <div className="mx-auto flex site-container items-center justify-between gap-5 py-3.5">
          <Link
            href={user ? '/welcome' : '/'}
            className="group flex items-center gap-2.5"
            aria-label="Sprout Streak marketing home"
          >
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-brand text-on-dark shadow-logo transition-transform group-hover:-rotate-3">
              <Leaf size={21} strokeWidth={2.4} aria-hidden="true" />
            </span>
            <span className="leading-none">
              <span className="block text-[17px] font-black tracking-[-0.03em]">
                Sprout Streak
              </span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-muted">
                Money habits, grown daily
              </span>
            </span>
          </Link>

          <nav
            className="hidden items-center gap-1 xl:flex"
            aria-label="Primary navigation"
          >
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                  path === item.href || path.startsWith(`${item.href}/`)
                    ? 'bg-mint text-brand-strong'
                    : 'text-ink-soft hover:bg-surface hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href={user ? '/' : '/login'}
              className="px-2 py-2 text-sm font-bold text-ink-soft hover:text-brand"
            >
              {user ? 'Dashboard' : 'Sign in'}
            </Link>
            <Link
              href="/readiness"
              className="group inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-on-dark shadow-sm transition hover:bg-deep-surface"
            >
              Pilot readiness{' '}
              <ArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(open => !open)}
            className="grid h-11 w-11 place-items-center rounded-full border border-border-strong bg-surface text-ink-soft xl:hidden"
            aria-expanded={menuOpen}
            aria-controls="marketing-mobile-menu"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>

        {menuOpen && (
          <nav
            id="marketing-mobile-menu"
            className="border-t border-border bg-canvas py-5 xl:hidden"
            aria-label="Mobile navigation"
          >
            <div className="mx-auto grid site-container gap-1 sm:grid-cols-2">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-bold hover:bg-surface"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href={user ? '/' : '/login'}
                onClick={() => setMenuOpen(false)}
                className="mt-2 rounded-xl bg-ink px-4 py-3 text-sm font-bold text-on-dark sm:col-span-2"
              >
                {user ? 'Go to dashboard' : 'Sign in to Sprout Streak'}
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main
        ref={scrollRegionRef}
        className="site-scroll-region min-h-0 flex-1 overflow-y-auto"
      >
        {children}
      </main>

      <footer
        data-no-print
        className="z-40 shrink-0 border-t border-on-dark/10 bg-ink text-on-dark"
      >
        <div className="mx-auto flex site-container flex-col items-center justify-between gap-2 py-3 text-center text-[11px] text-on-dark/60 sm:flex-row sm:text-left">
          <p>
            © 2026 Sprout Streak, a product of Nelson Grey LLC. All rights
            reserved.
          </p>
          <nav
            aria-label="Legal and support navigation"
            className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-bold text-on-dark/75 sm:justify-end"
          >
            <Link href="/privacy" className="hover:text-on-dark">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-on-dark">
              Terms
            </Link>
            <Link href="/cookies" className="hover:text-on-dark">
              Cookies
            </Link>
            <Link href="/support" className="hover:text-on-dark">
              Support
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
