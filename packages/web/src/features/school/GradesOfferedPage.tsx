import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { getSchool, updateSchool, useMyMembership, useSchoolIdsForUser } from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { GRADE_OPTIONS } from './shared';

/** Which grades a school offers — filters grade pickers elsewhere in the
 * app. Viewable by any admin, editable only by a super_admin. Split out
 * of the former all-in-one SchoolAdminPage. */
export function GradesOfferedPage({ user }: { user: User }) {
  const schoolIds = useSchoolIdsForUser(user.uid);
  const schoolId = schoolIds[0];
  const membership = useMyMembership(schoolId, user.uid);
  const isAtLeastAdmin = membership?.role === 'admin' || membership?.role === 'super_admin';
  const isSuperAdmin = membership?.role === 'super_admin';

  const [schoolEnabledGrades, setSchoolEnabledGrades] = useState<string[] | undefined>(undefined);
  useEffect(() => {
    if (!schoolId) return;
    getSchool(schoolId).then((school) => setSchoolEnabledGrades(school?.enabledGrades));
  }, [schoolId]);
  const activeGrades = schoolEnabledGrades ?? GRADE_OPTIONS;

  const [editingGrades, setEditingGrades] = useState(false);
  const [gradesDraft, setGradesDraft] = useState<string[]>(GRADE_OPTIONS);

  const startEditingGrades = () => {
    setGradesDraft(activeGrades);
    setEditingGrades(true);
  };

  const saveGrades = async () => {
    const ordered = GRADE_OPTIONS.filter((g) => gradesDraft.includes(g));
    await updateSchool(schoolId, { enabledGrades: ordered });
    setSchoolEnabledGrades(ordered);
    setEditingGrades(false);
  };

  if (!isAtLeastAdmin) {
    return (
      <div className="flex min-h-full flex-col text-ink">
        <PageHeader
          title="Grades Offered"
          backTo="/app/school"
          breadcrumbs={[{ label: 'Home', href: '/app' }, { label: 'School', href: '/app/school' }, { label: 'Grades Offered', href: '/app/school/grades' }]}
        />
        <p className="px-6 py-4 text-ink-muted">Only school admins can view grades offered.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader
        title="Grades Offered"
        backTo="/app/school"
        breadcrumbs={[{ label: 'Home', href: '/app' }, { label: 'School', href: '/app/school' }, { label: 'Grades Offered', href: '/app/school/grades' }]}
      />
      <div className="max-w-md px-6 py-4">
        <section className="rounded-lg border border-border p-4">
          {editingGrades ? (
            <>
              <div className="flex flex-wrap gap-2">
                {GRADE_OPTIONS.map((grade) => {
                  const checked = gradesDraft.includes(grade);
                  return (
                    <button
                      key={grade}
                      type="button"
                      onClick={() =>
                        setGradesDraft((prev) => (checked ? prev.filter((g) => g !== grade) : [...prev, grade]))
                      }
                      className={`rounded border px-2 py-1 text-xs ${checked ? 'border-brand bg-brand/20' : 'border-border'}`}
                    >
                      {grade}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={saveGrades}>
                  Save
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditingGrades(false)}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-muted">
                {activeGrades.length === GRADE_OPTIONS.length ? 'All grades' : activeGrades.join(', ')}
              </p>
              {isSuperAdmin && (
                <Button size="sm" variant="secondary" className="mt-3" onClick={startEditingGrades}>
                  Edit
                </Button>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
