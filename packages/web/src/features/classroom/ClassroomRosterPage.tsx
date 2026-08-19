import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { bulkArchiveStudents, bulkDeleteStudents, useClassroom, useStudents } from '../../lib/firestore';
import { useMyMembership } from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';

/** Roster changes (add/archive/delete students) — school-staff only for a
 * school-affiliated classroom (a schoolless classroom's owner remains its
 * only possible manager) — separated from the daily balance-review page
 * so adding or removing a student isn't mixed in with awarding money, and
 * from classroom settings so roster work isn't mixed in with renaming/
 * deleting the classroom itself. */
export function ClassroomRosterPage({ user, contextId }: { user: User; contextId: string }) {
  const classroom = useClassroom(contextId);
  const ownerUids = classroom?.ownerUids ?? [user.uid];
  const isOwner = ownerUids.includes(user.uid);

  const membership = useMyMembership(classroom?.schoolId, user.uid);
  const isAtLeastAdmin = membership?.role === 'admin' || membership?.role === 'super_admin';
  const canManage = classroom?.schoolId == null ? isOwner : isAtLeastAdmin;

  const students = useStudents(contextId);
  const [, navigate] = useLocation();

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [deletingChecked, setDeletingChecked] = useState(false);

  const toggleChecked = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // No confirm dialog, matching StudentsPage's exact Archive/Delete
  // asymmetry (Archive fires directly, only Delete confirms).
  const handleBulkArchive = async () => {
    await bulkArchiveStudents([...checkedIds]);
    setCheckedIds(new Set());
  };

  const handleBulkDelete = async () => {
    await bulkDeleteStudents([...checkedIds]);
    setCheckedIds(new Set());
    setDeletingChecked(false);
  };

  const breadcrumbs = [
    { label: 'Home', href: '/app' },
    { label: classroom?.name ?? 'Classroom', href: `/app/classrooms/${contextId}` },
    { label: 'Roster', href: `/app/classrooms/${contextId}/roster` },
  ];

  if (!canManage) {
    return (
      <div className="flex min-h-full flex-col text-ink">
        <PageHeader title="Roster" breadcrumbs={breadcrumbs} />
        <p className="px-6 py-4 text-ink-muted">Only school staff can edit the roster.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader
        title={`Roster — ${classroom?.name ?? 'Classroom'}`}
        breadcrumbs={breadcrumbs}
        actions={<Button onClick={() => navigate(`/app/classrooms/${contextId}/students/new`)}>Add Student</Button>}
      />

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {students.length === 0 ? (
          <p className="text-ink-muted">No students yet — add one above.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-2">
              {students.map((student) => (
                <li
                  key={student.id}
                  className="flex items-center gap-3 rounded-xl border border-border-strong bg-surface px-3 py-2.5 shadow-card"
                >
                  <input
                    type="checkbox"
                    checked={checkedIds.has(student.id)}
                    onChange={() => toggleChecked(student.id)}
                    aria-label={`Select ${student.displayName}`}
                  />
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-on-dark">
                    {student.displayName.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 font-semibold">{student.displayName}</span>
                  <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-bold text-brand">
                    ${(student.balanceCents / 100).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            {checkedIds.size > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-ink-muted">{checkedIds.size} selected</p>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={handleBulkArchive}>
                    Archive selected
                  </Button>
                  <Button variant="danger" onClick={() => setDeletingChecked(true)}>
                    Delete selected
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deletingChecked}
        onOpenChange={setDeletingChecked}
        title={`Delete ${checkedIds.size} student(s)?`}
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
