import type { User } from 'firebase/auth';
import { Link, useLocation } from 'wouter';
import { BookOpen, House, School as SchoolIcon, Sprout, Users, X } from 'lucide-react';
import { useCapabilities } from '../../app/roleContext';
import { isFeatureEnabled } from '../../app/featureFlags';

/** Persistent left navigation — role-aware via the shared capability
 * resolver (see app/roleContext.tsx), not a locally re-derived role check.
 * Renders nothing for a linked-student-only account (mirrors LandingRouter's
 * own hasAnyStaffAccess check) — preserves the deliberate "no navigation
 * elsewhere" constraint from BR-1.3.3/1.4.1. */
export function Sidebar({
  user,
  mobileOpen,
  onCloseMobile,
}: {
  user: User;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const [path] = useLocation();
  const { hasAnyStaffAccess, canViewAllSchoolStudents, canManageStaff } = useCapabilities(user);

  if (!hasAnyStaffAccess) return null;

  const navItems = [
    {
      href: '/app',
      label: 'Home',
      icon: House,
      active: path === '/app' || path.startsWith('/app/classrooms'),
    },
    ...(isFeatureEnabled('authenticatedLearning')
      ? [
          {
            href: '/app/learn',
            label: 'Learn',
            icon: BookOpen,
            active: path.startsWith('/app/learn'),
          },
        ]
      : []),
    ...(canViewAllSchoolStudents
      ? [
          {
            href: '/app/students',
            label: 'Students',
            icon: Users,
            active: path.startsWith('/app/students'),
          },
        ]
      : []),
    ...(canManageStaff
      ? [
          {
            href: '/app/school',
            label: 'School',
            icon: SchoolIcon,
            active: path.startsWith('/app/school'),
          },
        ]
      : []),
  ];

  const content = (
    <>
      <Link
        href="/app"
        onClick={onCloseMobile}
        className="flex items-center gap-2 px-5 py-5 text-lg font-extrabold tracking-tight text-ink"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-on-dark">
          <Sprout size={16} />
        </span>
        <span>
          Sprout <span className="text-brand">Streak</span>
        </span>
      </Link>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              aria-current={item.active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                item.active ? 'bg-mint text-brand' : 'text-ink-muted hover:bg-bg hover:text-ink'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      <div className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface lg:flex">{content}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 flex lg:hidden">
          {/* Mouse-only dismiss — the X button below is the sole
           * accessible "close" control, so this scrim stays out of the
           * a11y tree rather than duplicating its label. */}
          <div aria-hidden="true" onClick={onCloseMobile} className="absolute inset-0 bg-ink/40" />
          <div className="relative flex w-64 flex-col bg-surface pb-4 shadow-panel">
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation"
              className="absolute right-3 top-4 grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-bg"
            >
              <X size={18} />
            </button>
            {content}
          </div>
        </div>
      )}
    </>
  );
}
