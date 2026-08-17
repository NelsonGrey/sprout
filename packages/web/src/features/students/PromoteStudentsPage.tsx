import { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { bulkMoveStudents, useClassroomsInSchool, useStudentsInSchool } from '../../lib/firestore';
import { useMyMembership, useSchoolIdsForUser } from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';

const LEAVE_IN_PLACE = '';

/** Year-end grade rollover: bulk-reassign every student in a classroom to a
 * new destination classroom, for every classroom in the school at once —
 * one confirmation instead of moving each roster by hand. gradeLevel is
 * never computed here — it's inherited from whichever classroom a student
 * lands in (same as a manual move on StudentsPage), so picking a
 * destination classroom by name is enough; there's no "next grade" logic
 * to get wrong. A classroom can promote into only one destination — see
 * the note rendered below for the split-classroom fallback. */
export function PromoteStudentsPage({ user }: { user: User }) {
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
        studentIds: students.filter((s) => s.contextIds.includes(classroom.id)).map((s) => s.id),
      }))
      .filter((row) => row.studentIds.length > 0)
      .sort((a, b) => a.classroom.name.localeCompare(b.classroom.name));
  }, [classrooms, students]);

  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [promoting, setPromoting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const mappedRows = rows.filter((r) => mapping[r.classroom.id]);
  const movingCount = mappedRows.reduce((sum, r) => sum + r.studentIds.length, 0);
  const stayingRows = rows.length - mappedRows.length;
  const stayingCount = rows.filter((r) => !mapping[r.classroom.id]).reduce((sum, r) => sum + r.studentIds.length, 0);

  const handlePromote = async () => {
    // Snapshot the plan now — classrooms/students are onSnapshot-live and
    // will start updating mid-operation as each chunk commits, so re-reading
    // component state inside the loop below would corrupt a multi-hop
    // promotion (e.g. grade-3->grade-4 and grade-4->grade-5 in one commit).
    const plan = mappedRows.map((r) => ({
      source: r.classroom.name,
      studentIds: r.studentIds,
      target: classrooms.find((c) => c.id === mapping[r.classroom.id])!,
    }));
    setPromoting(true);
    setError('');
    try {
      for (const p of plan) {
        await bulkMoveStudents(p.studentIds, {
          contextId: p.target.id,
          ownerUids: p.target.ownerUids,
          schoolId: p.target.schoolId,
          gradeLevel: p.target.gradeLevel,
          contextName: p.target.name,
        });
      }
      setMapping({});
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Promotion failed partway through — check Students for current state.');
    } finally {
      setPromoting(false);
    }
  };

  if (!isAtLeastAdmin) {
    return (
      <div className="flex min-h-full flex-col text-ink">
        <PageHeader title="Promote Students" backTo="/students" />
        <p className="px-6 py-4 text-ink-muted">Only school admins can promote students.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader title="Promote Students" backTo="/students" />

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {done ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-brand">Promotion complete.</p>
            <Button onClick={() => navigate('/students')}>Back to Students</Button>
          </div>
        ) : (
          <div className="flex max-w-2xl flex-col gap-4">
            <p className="rounded-lg border border-border bg-bg px-3 py-2 text-xs text-ink-muted">
              Each classroom can promote into only one destination. To split one classroom across multiple
              destinations, use Students → select students → Move to classroom instead.
            </p>

            {rows.length === 0 ? (
              <p className="text-ink-muted">No classrooms with students to promote.</p>
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
                      <select
                        value={mapping[row.classroom.id] ?? LEAVE_IN_PLACE}
                        onChange={(e) =>
                          setMapping((prev) => ({ ...prev, [row.classroom.id]: e.target.value }))
                        }
                        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
                      >
                        <option value={LEAVE_IN_PLACE}>— Leave in place —</option>
                        {classrooms
                          .filter((c) => c.id !== row.classroom.id)
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </li>
                  ))}
                </ul>

                <p className="text-sm text-ink-muted">
                  {movingCount} student{movingCount === 1 ? '' : 's'} across {mappedRows.length} classroom
                  {mappedRows.length === 1 ? '' : 's'} will move; {stayingCount} student{stayingCount === 1 ? '' : 's'}{' '}
                  in {stayingRows} classroom{stayingRows === 1 ? '' : 's'} stay put.
                </p>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <Button
                  className="self-start"
                  disabled={mappedRows.length === 0 || promoting}
                  onClick={() => setConfirmOpen(true)}
                >
                  Promote All
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Promote ${movingCount} student${movingCount === 1 ? '' : 's'}?`}
        description="This can't be undone automatically — you'd need to move students back by hand."
        confirmLabel="Promote"
        onConfirm={handlePromote}
      >
        <ul className="flex flex-col gap-1 text-sm text-ink-muted">
          {mappedRows.map((r) => (
            <li key={r.classroom.id}>
              {r.studentIds.length} student{r.studentIds.length === 1 ? '' : 's'}: {r.classroom.name} →{' '}
              {classrooms.find((c) => c.id === mapping[r.classroom.id])?.name}
            </li>
          ))}
        </ul>
      </ConfirmDialog>
    </div>
  );
}
