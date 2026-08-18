import { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { bulkArchiveStudents, useClassroomsInSchool, useStudentsInSchool } from '../../lib/firestore';
import { useMyMembership, useSchoolIdsForUser } from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';

/** Year-end grade rollover: mark every student in a graduating classroom
 * (6th/8th grade, whichever a school ends at) as archived, for every
 * classroom in the school at once. Archiving is a field flip, not a
 * delete — balance and transaction history are untouched, students just
 * drop out of active classroom/roster views (see StudentsPage's "Show
 * archived" toggle to look one up later). No un-archive UI exists yet. */
export function ArchiveStudentsPage({ user }: { user: User }) {
  const [, navigate] = useLocation();
  const schoolIds = useSchoolIdsForUser(user.uid);
  const schoolId = schoolIds[0];
  const membership = useMyMembership(schoolId, user.uid);
  const isAtLeastAdmin = membership?.role === 'admin' || membership?.role === 'super_admin';

  const classrooms = useClassroomsInSchool(isAtLeastAdmin ? schoolId : undefined);
  const students = useStudentsInSchool(isAtLeastAdmin ? schoolId : undefined);

  const rows = useMemo(() => {
    return classrooms
      .map((classroom) => ({
        classroom,
        studentIds: students.filter((s) => !s.archivedAt && s.contextId === classroom.id).map((s) => s.id),
      }))
      .filter((row) => row.studentIds.length > 0)
      .sort((a, b) => a.classroom.name.localeCompare(b.classroom.name));
  }, [classrooms, students]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [archiving, setArchiving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const selectedRows = rows.filter((r) => selected[r.classroom.id]);
  const archivingCount = selectedRows.reduce((sum, r) => sum + r.studentIds.length, 0);

  const handleArchive = async () => {
    // Snapshot the plan now — classrooms/students are onSnapshot-live and
    // will start updating mid-operation as the batch commits.
    const studentIds = selectedRows.flatMap((r) => r.studentIds);
    setArchiving(true);
    setError('');
    try {
      await bulkArchiveStudents(studentIds);
      setSelected({});
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Archiving failed partway through — check Students for current state.');
    } finally {
      setArchiving(false);
    }
  };

  if (!isAtLeastAdmin) {
    return (
      <div className="flex min-h-full flex-col text-ink">
        <PageHeader title="Archive Students" backTo="/students" />
        <p className="px-6 py-4 text-ink-muted">Only school admins can archive students.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader title="Archive Students" backTo="/students" />

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {done ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-brand">Archiving complete.</p>
            <Button onClick={() => navigate('/students')}>Back to Students</Button>
          </div>
        ) : (
          <div className="flex max-w-2xl flex-col gap-4">
            <p className="rounded-lg border border-border bg-bg px-3 py-2 text-xs text-ink-muted">
              Archived students keep their balance and history but leave active classroom/roster views. There's
              no undo button yet — ask to have it cleared directly if this was a mistake.
            </p>

            {rows.length === 0 ? (
              <p className="text-ink-muted">No classrooms with students to archive.</p>
            ) : (
              <>
                <ul className="flex flex-col gap-2">
                  {rows.map((row) => (
                    <li
                      key={row.classroom.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-3"
                    >
                      <div>
                        <span className="font-medium">{row.classroom.name}</span>
                        <span className="ml-2 text-xs text-ink-muted">
                          {row.classroom.gradeLevel && `Grade ${row.classroom.gradeLevel} · `}
                          {row.studentIds.length} student{row.studentIds.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-ink-muted">
                        <input
                          type="checkbox"
                          checked={selected[row.classroom.id] ?? false}
                          onChange={(e) =>
                            setSelected((prev) => ({ ...prev, [row.classroom.id]: e.target.checked }))
                          }
                        />
                        Archive this classroom's students
                      </label>
                    </li>
                  ))}
                </ul>

                <p className="text-sm text-ink-muted">
                  {archivingCount} student{archivingCount === 1 ? '' : 's'} across {selectedRows.length} classroom
                  {selectedRows.length === 1 ? '' : 's'} will be archived.
                </p>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button
                  className="self-start"
                  disabled={selectedRows.length === 0 || archiving}
                  onClick={() => setConfirmOpen(true)}
                >
                  Archive All
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Archive ${archivingCount} student${archivingCount === 1 ? '' : 's'}?`}
        description="Archived students keep their balance and history but leave the active roster. There's no undo button yet — ask to have it cleared directly if this was a mistake."
        confirmLabel="Archive"
        onConfirm={handleArchive}
      >
        <ul className="flex flex-col gap-1 text-sm text-ink-muted">
          {selectedRows.map((r) => (
            <li key={r.classroom.id}>
              {r.studentIds.length} student{r.studentIds.length === 1 ? '' : 's'}: {r.classroom.name}
            </li>
          ))}
        </ul>
      </ConfirmDialog>
    </div>
  );
}
