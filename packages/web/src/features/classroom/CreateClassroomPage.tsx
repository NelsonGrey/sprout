import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { createClassroom } from '../../lib/firestore';
import { getSchool, useMyMembership, useSchoolIdsForUser } from '../../lib/school';
import { GRADE_OPTIONS } from '../school/shared';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

/** A dedicated page for creating a classroom — reached from DashboardPage's
 * "Add Classroom" button rather than an inline form, matching the
 * standalone-page convention used elsewhere (CSV import/promote/archive/
 * add student/request access). */
export function CreateClassroomPage({ user }: { user: User }) {
  const [, navigate] = useLocation();
  const schoolIds = useSchoolIdsForUser(user.uid);
  // Multi-school membership/switching is deferred — use the first one.
  const schoolId = schoolIds[0];
  const membership = useMyMembership(schoolId, user.uid);
  const isAtLeastAdmin = membership?.role === 'admin' || membership?.role === 'super_admin';

  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [addToSchool, setAddToSchool] = useState(true);
  const [gradeLevel, setGradeLevel] = useState('');
  const [schoolGrades, setSchoolGrades] = useState<string[] | undefined>(undefined);

  useEffect(() => {
    if (!schoolId) {
      setSchoolGrades(undefined);
      return;
    }
    getSchool(schoolId).then((school) => setSchoolGrades(school?.enabledGrades));
  }, [schoolId]);

  const gradeOptions = schoolGrades ?? GRADE_OPTIONS;

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
    navigate('/app');
  };

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader title="Add Classroom" backTo="/app" />
      <div className="flex max-w-md flex-col gap-3 px-6 py-4">
        {isAtLeastAdmin && schoolId && (
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input type="checkbox" checked={addToSchool} onChange={(e) => setAddToSchool(e.target.checked)} />
            Add to school roster
            {addToSchool && (
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="ml-2 rounded-lg border border-border bg-surface px-2 py-1 text-ink"
              >
                <option value="">— Grade —</option>
                {gradeOptions.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            )}
          </label>
        )}
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Classroom name" autoFocus />
        <Button className="self-start" onClick={handleCreate} disabled={!name.trim() || creating}>
          Create
        </Button>
      </div>
    </div>
  );
}
