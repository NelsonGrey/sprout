import { useMemo } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { GraduationCap, Inbox, Sprout, Users } from 'lucide-react';
import { useClassrooms, useClassroomsInSchool } from '../../lib/firestore';
import { useMyMembership, usePendingAccessRequestsForSchool, useSchoolIdsForUser } from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';

/** Post-login landing page — replaces the old bare classroom list
 * (formerly ClassroomsPage) with a real dashboard: a greeting, quick
 * stats, and a classroom card grid. Same underlying data (owned classrooms
 * merged with any school-wide/grade-scoped visibility, BR-1.3.11/1.3.12)
 * — this is a visual/IA evolution of that page, not new data logic. */
export function DashboardPage({ user }: { user: User }) {
  const schoolIds = useSchoolIdsForUser(user.uid);
  // Multi-school membership/switching is deferred — use the first one.
  const schoolId = schoolIds[0];
  const membership = useMyMembership(schoolId, user.uid);
  const isAtLeastAdmin = membership?.role === 'admin' || membership?.role === 'super_admin';
  const scope = membership?.scope;
  // Admins/super_admins always have full-school visibility (no `scope`
  // field exists on their member doc — that's teacher-only data), mirroring
  // firestore.rules' hasScopedAccess isAtLeastAdmin shortcut.
  const seesWholeOrScopedSchool = isAtLeastAdmin || (scope && scope.type !== 'own');

  const ownClassrooms = useClassrooms(user.uid);
  const scopedClassrooms = useClassroomsInSchool(
    seesWholeOrScopedSchool ? schoolId : undefined,
    !isAtLeastAdmin && scope?.type === 'grades' ? scope.grades : undefined,
  );
  const classrooms = useMemo(() => {
    const merged = new Map(ownClassrooms.map((c) => [c.id, c]));
    for (const c of scopedClassrooms) merged.set(c.id, c);
    return Array.from(merged.values());
  }, [ownClassrooms, scopedClassrooms]);

  const pendingRequests = usePendingAccessRequestsForSchool(isAtLeastAdmin ? schoolId : undefined);

  const [, navigate] = useLocation();
  const firstName = (user.displayName ?? '').split(' ')[0] || 'there';

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        actions={
          isAtLeastAdmin && (
            <>
              <Button onClick={() => navigate('/app/classrooms/new')}>Add Classroom</Button>
              <Button variant="secondary" onClick={() => navigate('/app/students/new')}>
                Add Student
              </Button>
            </>
          )
        }
      />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:max-w-md">
          <div className="flex items-center gap-3 rounded-2xl border border-border-strong bg-surface p-4 shadow-card">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-brand">
              <GraduationCap size={18} />
            </span>
            <div>
              <p className="text-2xl font-black leading-none text-ink">{classrooms.length}</p>
              <p className="mt-1 text-xs font-semibold text-ink-muted">
                Classroom{classrooms.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          {isAtLeastAdmin && (
            <button
              type="button"
              onClick={() => navigate('/app/school')}
              className="flex items-center gap-3 rounded-2xl border border-border-strong bg-surface p-4 text-left shadow-card transition hover:border-brand"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warning-soft text-warning">
                <Inbox size={18} />
              </span>
              <div>
                <p className="text-2xl font-black leading-none text-ink">{pendingRequests.length}</p>
                <p className="mt-1 text-xs font-semibold text-ink-muted">
                  Pending request{pendingRequests.length === 1 ? '' : 's'}
                </p>
              </div>
            </button>
          )}
        </div>

        {classrooms.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border-strong p-8">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-mint text-brand">
              <Sprout size={22} />
            </span>
            <div>
              <p className="font-bold text-ink">No classrooms yet</p>
              <p className="mt-1 text-sm text-ink-muted">
                {isAtLeastAdmin
                  ? 'Add one above to start recording earn/spend and goals.'
                  : "Ask your school's admin to add you to a classroom."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {classrooms.map((classroom) => (
              <button
                key={classroom.id}
                type="button"
                onClick={() => navigate(`/app/classrooms/${classroom.id}`)}
                className="flex flex-col items-start gap-3 rounded-2xl border border-border-strong bg-surface p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-brand"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-brand">
                  <Users size={18} />
                </span>
                <div>
                  <p className="font-bold text-ink">{classroom.name}</p>
                  {classroom.gradeLevel && (
                    <span className="mt-1 inline-flex rounded-full bg-bg px-2 py-0.5 text-xs font-semibold text-ink-muted">
                      Grade {classroom.gradeLevel}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
