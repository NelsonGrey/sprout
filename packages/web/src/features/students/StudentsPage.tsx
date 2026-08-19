import { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import {
  bulkArchiveStudents,
  bulkDeleteStudents,
  bulkMoveStudents,
  restoreStudents,
  updateStudent,
  useClassroomsInSchool,
  useStudentsInSchool,
} from '../../lib/firestore';
import { useMyMembership, useSchoolIdsForUser } from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';

type SortKey = 'name' | 'grade' | 'classroom';

/** School-wide student roster — every student in the school, independent
 * of classroom, with search/sort/inline-edit/multi-select/bulk actions.
 * Admin/super_admin only for v1 (see plan: per-row scoped-teacher
 * management would duplicate per-classroom canManage logic across every
 * row — deferred until a real need shows up). */
export function StudentsPage({ user }: { user: User }) {
  const [, navigate] = useLocation();
  const schoolIds = useSchoolIdsForUser(user.uid);
  const schoolId = schoolIds[0];
  const membership = useMyMembership(schoolId, user.uid);
  const isAtLeastAdmin = membership?.role === 'admin' || membership?.role === 'super_admin';

  const students = useStudentsInSchool(isAtLeastAdmin ? schoolId : undefined);
  const classrooms = useClassroomsInSchool(isAtLeastAdmin ? schoolId : undefined);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [editGrade, setEditGrade] = useState('');

  const [movingOpen, setMovingOpen] = useState(false);
  const [moveTargetContextId, setMoveTargetContextId] = useState('');
  const [moving, setMoving] = useState(false);
  const [deletingOpen, setDeletingOpen] = useState(false);
  const [archivingOpen, setArchivingOpen] = useState(false);
  const [restoringOpen, setRestoringOpen] = useState(false);
  const [restoreTargetContextId, setRestoreTargetContextId] = useState('');
  const [restoring, setRestoring] = useState(false);

  const visibleStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = showArchived ? students : students.filter((s) => !s.archivedAt);
    const filtered = term
      ? base.filter(
          (s) => s.displayName.toLowerCase().includes(term) || (s.studentId ?? '').toLowerCase().includes(term),
        )
      : base;
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === 'grade') return (a.gradeLevel ?? '').localeCompare(b.gradeLevel ?? '');
      if (sortKey === 'classroom') return (a.contextName ?? '').localeCompare(b.contextName ?? '');
      return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
    });
    return sorted;
  }, [students, search, sortKey, showArchived]);

  const selectedStudents = visibleStudents.filter((s) => selected.has(s.id));
  // Restore only makes sense for a purely-archived selection — applying it
  // to an active student would be a harmless no-op reassignment, but a
  // confusingly-labeled one.
  const canRestore = selectedStudents.length > 0 && selectedStudents.every((s) => s.archivedAt);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEditing = (student: (typeof students)[number]) => {
    setEditingId(student.id);
    setEditFirstName(student.firstName);
    setEditLastName(student.lastName);
    setEditStudentId(student.studentId ?? '');
    setEditGrade(student.gradeLevel ?? '');
  };

  const saveEditing = async () => {
    if (!editingId) return;
    await updateStudent(editingId, {
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      studentId: editStudentId.trim() || undefined,
      gradeLevel: editGrade.trim() || undefined,
    });
    setEditingId(null);
  };

  const handleBulkMove = async () => {
    const target = classrooms.find((c) => c.id === moveTargetContextId);
    if (!target || moving || selected.size === 0) return;
    setMoving(true);
    await bulkMoveStudents([...selected], {
      contextId: target.id,
      ownerUids: target.ownerUids,
      schoolId: target.schoolId,
      gradeLevel: target.gradeLevel,
      contextName: target.name,
    });
    setSelected(new Set());
    setMovingOpen(false);
    setMoving(false);
  };

  const handleBulkDelete = async () => {
    await bulkDeleteStudents([...selected]);
    setSelected(new Set());
  };

  const handleBulkArchive = async () => {
    await bulkArchiveStudents([...selected]);
    setSelected(new Set());
  };

  const handleBulkRestore = async () => {
    const target = classrooms.find((c) => c.id === restoreTargetContextId);
    if (!target || restoring || selected.size === 0) return;
    setRestoring(true);
    await restoreStudents([...selected], {
      contextId: target.id,
      ownerUids: target.ownerUids,
      schoolId: target.schoolId,
      gradeLevel: target.gradeLevel,
      contextName: target.name,
    });
    setSelected(new Set());
    setRestoringOpen(false);
    setRestoring(false);
  };

  if (!isAtLeastAdmin) {
    return (
      <div className="flex min-h-full flex-col text-ink">
        <PageHeader
          title="Students"
          breadcrumbs={[{ label: 'Home', href: '/app' }, { label: 'School', href: '/app/school' }, { label: 'Students', href: '/app/students' }]}
        />
        <p className="px-6 py-4 text-ink-muted">Only school admins can manage the full student roster.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader
        title="Students"
        breadcrumbs={[{ label: 'Home', href: '/app' }, { label: 'School', href: '/app/school' }, { label: 'Students', href: '/app/students' }]}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/app/students/promote')}>
              Promote Students
            </Button>
            <Button variant="secondary" onClick={() => navigate('/app/students/archive')}>
              Archive Students
            </Button>
            <Button variant="secondary" onClick={() => navigate('/app/students/import')}>
              Import CSV
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or student ID"
          className="sm:w-72"
        />
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived
          </label>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-ink-muted">Sort by</span>
            {(['name', 'grade', 'classroom'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSortKey(key)}
                className={`rounded-full px-3 py-1 ${sortKey === key ? 'bg-brand text-on-dark' : 'border border-border text-ink-muted hover:text-ink'}`}
              >
                {key === 'name' ? 'Name' : key === 'grade' ? 'Grade' : 'Classroom'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between border-b border-border bg-bg px-6 py-3">
          <span className="text-sm text-ink-muted">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setMovingOpen(true)}>
              Move to classroom…
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setArchivingOpen(true)}>
              Archive
            </Button>
            <Button size="sm" variant="secondary" disabled={!canRestore} onClick={() => setRestoringOpen(true)}>
              Restore…
            </Button>
            <Button size="sm" variant="danger" onClick={() => setDeletingOpen(true)}>
              Delete
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {visibleStudents.length === 0 ? (
          <p className="text-ink-muted">No students match.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {visibleStudents.map((student) =>
              editingId === student.id ? (
                <li key={student.id} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex flex-wrap gap-2">
                    <Input
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      placeholder="First name"
                      className="w-32"
                      autoFocus
                    />
                    <Input
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      placeholder="Last name"
                      className="w-32"
                    />
                    <Input
                      value={editStudentId}
                      onChange={(e) => setEditStudentId(e.target.value)}
                      placeholder="Student ID"
                      className="w-28"
                    />
                    <Input
                      value={editGrade}
                      onChange={(e) => setEditGrade(e.target.value)}
                      placeholder="Grade"
                      className="w-20"
                    />
                    <Button size="sm" onClick={saveEditing}>
                      Save
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </li>
              ) : (
                <li
                  key={student.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(student.id)}
                    onChange={() => toggleSelected(student.id)}
                    aria-label={`Select ${student.displayName}`}
                  />
                  <button
                    type="button"
                    onClick={() => startEditing(student)}
                    className="flex flex-1 flex-wrap items-center justify-between gap-2 text-left"
                  >
                    <span className="font-medium">{student.displayName}</span>
                    <span className="flex gap-3 text-xs text-ink-muted">
                      {student.archivedAt && <span>Archived</span>}
                      {student.studentId && <span>ID {student.studentId}</span>}
                      {student.gradeLevel && <span>Grade {student.gradeLevel}</span>}
                      {student.contextName && <span>{student.contextName}</span>}
                    </span>
                  </button>
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={movingOpen}
        onOpenChange={(open) => {
          setMovingOpen(open);
          if (!open) setMoveTargetContextId('');
        }}
        title={`Move ${selected.size} student${selected.size === 1 ? '' : 's'}?`}
        description="They'll be reassigned to the classroom you choose below."
        confirmLabel="Move"
        confirmDisabled={!moveTargetContextId || moving}
        onConfirm={handleBulkMove}
      >
        <select
          value={moveTargetContextId}
          onChange={(e) => setMoveTargetContextId(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink"
        >
          <option value="">Choose a classroom…</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </ConfirmDialog>

      <ConfirmDialog
        open={deletingOpen}
        onOpenChange={setDeletingOpen}
        title={`Delete ${selected.size} student${selected.size === 1 ? '' : 's'}?`}
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleBulkDelete}
      />

      <ConfirmDialog
        open={archivingOpen}
        onOpenChange={setArchivingOpen}
        title={`Archive ${selected.size} student${selected.size === 1 ? '' : 's'}?`}
        description="Archived students keep their balance and history but leave active classroom/roster views. Use Restore… to bring one back later."
        confirmLabel="Archive"
        onConfirm={handleBulkArchive}
      />

      <ConfirmDialog
        open={restoringOpen}
        onOpenChange={(open) => {
          setRestoringOpen(open);
          if (!open) setRestoreTargetContextId('');
        }}
        title={`Restore ${selected.size} student${selected.size === 1 ? '' : 's'}?`}
        description="They'll be reassigned to the classroom you choose below and become active again."
        confirmLabel="Restore"
        confirmDisabled={!restoreTargetContextId || restoring}
        onConfirm={handleBulkRestore}
      >
        <select
          value={restoreTargetContextId}
          onChange={(e) => setRestoreTargetContextId(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink"
        >
          <option value="">Choose a classroom…</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </ConfirmDialog>
    </div>
  );
}
