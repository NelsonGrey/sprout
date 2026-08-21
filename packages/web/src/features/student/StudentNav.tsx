import { BookOpen, Clock, Sprout, Target } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { isFeatureEnabled } from '../../app/featureFlags';

/** The student-only four-destination nav — 01_EXPERIENCE_FOUNDATIONS.md
 * §5.2: "Student-only accounts receive at most four primary destinations:
 * Today, History, Goals, Learn." Deliberately its own small component, not
 * a reuse or extension of the staff Sidebar — Sidebar is scoped to staff
 * navigation and "students never receive school, roster, staff, peer, or
 * global analytics navigation" (same section). Learn links to the same
 * role-aware /app/learn built in Slice 3 rather than a separate /app/me/
 * learn route — that page already renders the correct student-only
 * experience per lesson, so a second implementation would just be
 * duplication. */
export function StudentNav() {
  const [path] = useLocation();
  const items = [
    { href: '/app/me', label: 'Today', icon: Sprout, active: path === '/app/me' },
    { href: '/app/me/history', label: 'History', icon: Clock, active: path === '/app/me/history' },
    { href: '/app/me/goals', label: 'Goals', icon: Target, active: path === '/app/me/goals' },
    ...(isFeatureEnabled('authenticatedLearning')
      ? [{ href: '/app/learn', label: 'Learn', icon: BookOpen, active: path.startsWith('/app/learn') }]
      : []),
  ];

  return (
    <nav aria-label="My account" className="flex border-t border-border bg-surface">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-bold ${
              item.active ? 'text-brand' : 'text-ink-muted'
            }`}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
