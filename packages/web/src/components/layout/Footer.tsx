import { Link } from 'wouter';

export function Footer() {
  return (
    <footer className="z-20 shrink-0 border-t border-border bg-footer-bg text-on-dark/70">
      <div className="site-container flex flex-col items-center justify-between gap-2 py-3 text-center text-[11px] sm:flex-row sm:text-left">
        <span>
          © 2026 Sprout Streak, a product of Nelson Grey LLC. All rights reserved.
        </span>
        <nav
          aria-label="Legal and support navigation"
          className="flex items-center gap-4 font-semibold"
        >
          <Link href="/privacy" className="hover:text-on-dark">Privacy</Link>
          <Link href="/terms" className="hover:text-on-dark">Terms</Link>
          <Link href="/cookies" className="hover:text-on-dark">Cookies</Link>
          <Link href="/support" className="hover:text-on-dark">Support</Link>
        </nav>
      </div>
    </footer>
  );
}
