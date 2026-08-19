import { useEffect, useState, type ReactNode } from 'react';
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

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [path]);

  return (
    <div className="min-h-screen bg-[#f8fbf5] text-[#102a26]">
      <header
        data-no-print
        className="sticky top-0 z-50 border-b border-[#dfe9dd]/90 bg-[#f8fbf5]/95 backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-5 px-5 py-3.5 sm:px-8 lg:px-12">
          <Link
            href={user ? '/welcome' : '/'}
            className="group flex items-center gap-2.5"
            aria-label="Sprout Streak marketing home"
          >
            <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#166b4f] text-white shadow-[0_8px_22px_rgba(22,107,79,0.18)] transition-transform group-hover:-rotate-3">
              <Leaf size={21} strokeWidth={2.4} aria-hidden="true" />
            </span>
            <span className="leading-none">
              <span className="block text-[17px] font-black tracking-[-0.03em]">
                Sprout Streak
              </span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-[#58766d]">
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
                    ? 'bg-[#dff3e7] text-[#14563f]'
                    : 'text-[#405f56] hover:bg-white hover:text-[#102a26]'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Link
              href={user ? '/' : '/login'}
              className="px-2 py-2 text-sm font-bold text-[#27483f] hover:text-[#166b4f]"
            >
              {user ? 'Dashboard' : 'Sign in'}
            </Link>
            <Link
              href="/readiness"
              className="group inline-flex items-center gap-2 rounded-full bg-[#102a26] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1a4038]"
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
            className="grid h-11 w-11 place-items-center rounded-full border border-[#cfddd2] bg-white text-[#173b32] xl:hidden"
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
            className="border-t border-[#dfe9dd] bg-[#f8fbf5] px-5 py-5 xl:hidden"
            aria-label="Mobile navigation"
          >
            <div className="mx-auto grid max-w-[1480px] gap-1 sm:grid-cols-2">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-bold hover:bg-white"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href={user ? '/' : '/login'}
                onClick={() => setMenuOpen(false)}
                className="mt-2 rounded-xl bg-[#102a26] px-4 py-3 text-sm font-bold text-white sm:col-span-2"
              >
                {user ? 'Go to dashboard' : 'Sign in to Sprout Streak'}
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main>{children}</main>

      <footer data-no-print className="bg-[#102a26] text-white">
        <div className="mx-auto grid max-w-[1480px] gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr] lg:px-12">
          <div>
            <div className="flex items-center gap-2 text-lg font-black">
              <Leaf size={20} /> Sprout Streak
            </div>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/65">
              A pre-launch financial-learning platform growing toward connected
              classroom, school, district, and family practice.
            </p>
            <p className="mt-5 inline-flex rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-[#b8e8c9]">
              Pre-K–6 curriculum foundation
            </p>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#92cda8]">
              Explore
            </p>
            <div className="mt-4 grid gap-2 text-sm text-white/70">
              <Link href="/districts" className="hover:text-white">
                Districts & schools
              </Link>
              <Link href="/educators" className="hover:text-white">
                Educators
              </Link>
              <Link href="/families" className="hover:text-white">
                Families
              </Link>
              <Link href="/students" className="hover:text-white">
                Students
              </Link>
              <Link href="/curriculum" className="hover:text-white">
                Learning library
              </Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#92cda8]">
              Build with trust
            </p>
            <div className="mt-4 grid gap-2 text-sm text-white/70">
              <Link href="/readiness" className="hover:text-white">
                Readiness center
              </Link>
              <span>Pilot intake not yet open</span>
            </div>
            <p className="mt-6 text-xs leading-5 text-white/45">
              No ads. No sale of student data. Procurement and privacy materials
              are still in development.
            </p>
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-white/45">
          © 2026 Sprout Streak. Learning materials are an original pre-launch
          foundation.
        </div>
      </footer>
    </div>
  );
}
