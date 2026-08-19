import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { GraduationCap, Inbox, Pencil, Users } from 'lucide-react';
import { getSchool, updateSchool, useMyMembership, usePendingAccessRequestsForSchool } from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { IconButton } from '../../components/ui/icon-button';
import { Input } from '../../components/ui/input';
import { roleLabel, scopeSummary } from './shared';

/** Shown at /app/school to a member of a school — the "School" sidebar
 * destination for admins, and a lightweight "your access" view for a
 * plain teacher who has no admin nav item pointing here at all (they
 * reach it only via DashboardPage's always-visible School button — the
 * one path a schoolless user has to found a school in the first place,
 * see CreateSchoolPage). Admin actions (Staff/Access Requests/Grades
 * Offered) render as a card grid rather than a plain link list, with a
 * live pending-request count so it doesn't have to be discovered by
 * clicking in. */
export function SchoolAdminPage({ user, schoolId }: { user: User; schoolId: string }) {
  const [, navigate] = useLocation();
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const membership = useMyMembership(schoolId, user.uid);

  const [renamingSchool, setRenamingSchool] = useState(false);
  const [schoolNameDraft, setSchoolNameDraft] = useState('');

  useEffect(() => {
    getSchool(schoolId).then((school) => setSchoolName(school?.name ?? null));
  }, [schoolId]);

  const isAtLeastAdmin = membership?.role === 'admin' || membership?.role === 'super_admin';
  const isSuperAdmin = membership?.role === 'super_admin';

  const pendingRequests = usePendingAccessRequestsForSchool(isAtLeastAdmin ? schoolId : undefined);

  const startRenamingSchool = () => {
    setSchoolNameDraft(schoolName ?? '');
    setRenamingSchool(true);
  };

  const saveSchoolName = async () => {
    const trimmed = schoolNameDraft.trim();
    if (trimmed) {
      await updateSchool(schoolId, { name: trimmed });
      setSchoolName(trimmed);
    }
    setRenamingSchool(false);
  };

  const hubCards = [
    { label: 'Staff', to: '/app/school/staff', icon: Users, badge: null },
    { label: 'Access Requests', to: '/app/school/requests', icon: Inbox, badge: pendingRequests.length || null },
    { label: 'Grades Offered', to: '/app/school/grades', icon: GraduationCap, badge: null },
  ];

  return (
    <div className="flex min-h-full flex-col text-ink">
      {renamingSchool ? (
        <header className="flex items-center gap-3 border-b border-border px-6 py-4">
          <Input
            value={schoolNameDraft}
            onChange={(e) => setSchoolNameDraft(e.target.value)}
            autoFocus
            className="flex-1"
          />
          <Button size="sm" onClick={saveSchoolName}>
            Save
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setRenamingSchool(false)}>
            Cancel
          </Button>
        </header>
      ) : (
        <PageHeader
          title={schoolName ?? 'School'}
          breadcrumbs={[{ label: 'Home', href: '/app' }, { label: 'School', href: '/app/school' }]}
          actions={
            <>
              {/* No "Manage Students" shortcut here — Students is already
               * a top-level sidebar item for every admin who can see this
               * page. */}
              {isAtLeastAdmin && (
                <Button variant="secondary" size="sm" onClick={() => navigate('/app/students/promote')}>
                  Promote Students
                </Button>
              )}
              {isAtLeastAdmin && (
                <Button variant="secondary" size="sm" onClick={() => navigate('/app/students/archive')}>
                  Archive Students
                </Button>
              )}
              {isSuperAdmin && (
                <IconButton label="Rename school" variant="secondary" onClick={startRenamingSchool}>
                  <Pencil size={16} />
                </IconButton>
              )}
            </>
          }
        />
      )}

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
        <section className="rounded-2xl border border-border-strong bg-surface p-4 shadow-card">
          <h2 className="text-sm font-semibold text-ink-muted">Your access</h2>
          <p className="mt-1">
            {membership && roleLabel(membership.role)}
            {membership?.role === 'teacher' && ` — ${scopeSummary(membership.scope)}`}
          </p>
        </section>

        {isAtLeastAdmin && (
          <div className="grid gap-3 sm:grid-cols-3">
            {hubCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.to}
                  type="button"
                  onClick={() => navigate(card.to)}
                  className="relative flex flex-col items-start gap-3 rounded-2xl border border-border-strong bg-surface p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-brand"
                >
                  {card.badge !== null && (
                    <span className="absolute right-3 top-3 grid h-6 min-w-6 place-items-center rounded-full bg-warning-soft px-1.5 text-xs font-bold text-warning">
                      {card.badge}
                    </span>
                  )}
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-brand">
                    <Icon size={18} />
                  </span>
                  <span className="font-bold">{card.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
