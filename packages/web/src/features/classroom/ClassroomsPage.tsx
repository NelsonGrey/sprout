import { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { createClassroom, useClassrooms, useClassroomsInSchool } from '../../lib/firestore';
import { useMyMembership, useSchoolIdsForUser } from '../../lib/school';
import { GRADE_OPTIONS } from '../school/SchoolAdminPage';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

/** Post-login landing page: a teacher's classroom list plus "create a
 * classroom". The list is classrooms this user owns directly, merged with
 * any classrooms visible via a school-wide or grade-level scope grant
 * (BR-1.3.11/1.3.12) — most users belong to no school at all, in which case
 * this is just the plain owned-classrooms list, unchanged from before. */
export function ClassroomsPage({ user }: { user: User }) {
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

  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [addToSchool, setAddToSchool] = useState(true);
  const [gradeLevel, setGradeLevel] = useState('');
  const [, navigate] = useLocation();

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    await createClassroom({
      name: trimmed,
      ownerUid: user.uid,
      ownerDisplayName: user.displayName,
      ownerEmail: user.email,
      schoolId: isAtLeastAdmin && addToSchool ? schoolId : undefined,
      gradeLevel: isAtLeastAdmin && addToSchool ? gradeLevel || undefined : undefined,
    });
    setName('');
    setGradeLevel('');
    setCreating(false);
  };

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="My Classrooms"
        actions={
          <Button variant="secondary" onClick={() => navigate('/school')}>
            School
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {classrooms.length === 0 ? (
          <p className="text-ink-muted">No classrooms yet — add one below.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {classrooms.map((classroom) => (
              <li key={classroom.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/classrooms/${classroom.id}`)}
                  className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-left text-ink hover:bg-bg"
                >
                  {classroom.name}
                  {classroom.gradeLevel && (
                    <span className="ml-2 text-xs text-ink-muted">Grade {classroom.gradeLevel}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-border px-6 py-4">
        {isAtLeastAdmin && schoolId && (
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={addToSchool}
              onChange={(e) => setAddToSchool(e.target.checked)}
            />
            Add to school roster
            {addToSchool && (
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="ml-2 rounded-lg border border-border bg-surface px-2 py-1 text-ink"
              >
                <option value="">— Grade —</option>
                {GRADE_OPTIONS.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            )}
          </label>
        )}
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Classroom name"
            className="flex-1"
          />
          <Button onClick={handleCreate} disabled={creating}>
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
