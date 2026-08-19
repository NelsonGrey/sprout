import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { Pencil, Trash2 } from 'lucide-react';
import {
  bulkArchiveStudents,
  bulkDeleteStudents,
  deleteClassroom,
  updateClassroom,
  useClassroom,
  useStudents,
} from '../../lib/firestore';
import { useMembersOfSchool, useMyMembership } from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { IconButton } from '../../components/ui/icon-button';
import { Input } from '../../components/ui/input';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { TwoPaneLayout } from '../../components/layout/TwoPaneLayout';
import { StoreManager } from './StoreManager';
import { StudentDetailPane } from './StudentDetailPane';

export function ClassroomDetailPage({
  user,
  contextId,
  studentId,
}: {
  user: User;
  contextId: string;
  studentId?: string;
}) {
  const classroom = useClassroom(contextId);
  const ownerUids = classroom?.ownerUids ?? [user.uid];
  const isOwner = ownerUids.includes(user.uid);

  const membership = useMyMembership(classroom?.schoolId, user.uid);
  // Full manage rights: the classroom's owner, an admin/super_admin, or a
  // teacher with an explicit 'manage'-level grant on this classroom. Grade/
  // whole-school scope alone never qualifies (award-only, see
  // firestore.rules' hasAwardAccess/hasManageAccess split).
  const canManage =
    isOwner ||
    (membership !== null && membership !== undefined && membership.role !== 'teacher') ||
    membership?.classroomGrants?.[contextId] === 'manage';

  const schoolTeachers = useMembersOfSchool(classroom?.schoolId).filter(
    (m) => m.role === 'teacher' && m.uid !== user.uid,
  );

  const students = useStudents(contextId);
  const [, navigate] = useLocation();

  const [renamingClassroom, setRenamingClassroom] = useState(false);
  const [classroomNameDraft, setClassroomNameDraft] = useState('');
  const [deletingClassroom, setDeletingClassroom] = useState(false);

  // Right pane selection: which student is shown in detail (URL-synced, so
  // a direct link to /classrooms/:id/students/:id stays bookmarkable) vs.
  // which are checked for a bulk action (ephemeral, local-only — never
  // synced to the URL). Seeded once from the studentId route param, not
  // re-synced on every render, so a user's in-page selection isn't fought
  // by prop changes.
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(studentId ?? null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [deletingChecked, setDeletingChecked] = useState(false);

  const startRenamingClassroom = () => {
    setClassroomNameDraft(classroom?.name ?? '');
    setRenamingClassroom(true);
  };

  const saveClassroomName = async () => {
    const trimmed = classroomNameDraft.trim();
    if (trimmed) await updateClassroom(contextId, { name: trimmed });
    setRenamingClassroom(false);
  };

  const selectStudent = (id: string) => {
    setSelectedStudentId(id);
    navigate(`/app/classrooms/${contextId}/students/${id}`);
  };

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
    if (selectedStudentId && checkedIds.has(selectedStudentId)) {
      setSelectedStudentId(null);
      navigate(`/app/classrooms/${contextId}`);
    }
    setCheckedIds(new Set());
    setDeletingChecked(false);
  };

  return (
    <div className="flex min-h-full flex-col text-ink">
      {renamingClassroom ? (
        <header className="flex items-center gap-3 border-b border-border px-6 py-4">
          <Input
            value={classroomNameDraft}
            onChange={(e) => setClassroomNameDraft(e.target.value)}
            autoFocus
            className="flex-1"
          />
          <Button size="sm" onClick={saveClassroomName}>
            Save
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setRenamingClassroom(false)}>
            Cancel
          </Button>
        </header>
      ) : (
        <PageHeader
          title={classroom?.name ?? 'Classroom'}
          backTo="/app"
          breadcrumbs={[{ label: 'Home', href: '/app' }, { label: classroom?.name ?? 'Classroom', href: `/app/classrooms/${contextId}` }]}
          actions={
            canManage && (
              <>
                <IconButton label="Rename classroom" variant="secondary" onClick={startRenamingClassroom}>
                  <Pencil size={16} />
                </IconButton>
                <IconButton label="Delete classroom" variant="secondary" onClick={() => setDeletingClassroom(true)}>
                  <Trash2 size={16} />
                </IconButton>
              </>
            )
          }
        />
      )}

      <TwoPaneLayout
        left={
          students.length === 0 ? (
            <p className="text-ink-muted">No students yet — create one below.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {students.map((student) => (
                <li
                  key={student.id}
                  className="flex items-center gap-3 rounded-xl border border-border-strong bg-surface px-3 py-2.5 shadow-card hover:border-brand"
                >
                  {canManage && (
                    <input
                      type="checkbox"
                      checked={checkedIds.has(student.id)}
                      onChange={() => toggleChecked(student.id)}
                      aria-label={`Select ${student.displayName}`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => selectStudent(student.id)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-on-dark">
                      {student.displayName.charAt(0).toUpperCase()}
                    </span>
                    <span className="flex-1 font-semibold">{student.displayName}</span>
                    <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-bold text-brand">
                      ${(student.balanceCents / 100).toFixed(2)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )
        }
        right={
          checkedIds.size > 0 ? (
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
          ) : (
            (() => {
              const selectedStudent = students.find((s) => s.id === selectedStudentId);
              return selectedStudent ? (
                <StudentDetailPane
                  user={user}
                  contextId={contextId}
                  student={selectedStudent}
                  canManage={canManage}
                  onDeleted={() => {
                    setSelectedStudentId(null);
                    navigate(`/app/classrooms/${contextId}`);
                  }}
                />
              ) : (
                <p className="text-ink-muted">Select a student to view details.</p>
              );
            })()
          )
        }
      />

      <div className="border-t border-border px-6 py-4">
        <StoreManager contextId={contextId} createdByUid={user.uid} />
      </div>

      {canManage && (
        <div className="border-t border-border px-6 py-4">
          <Button onClick={() => navigate(`/app/classrooms/${contextId}/students/new`)}>Add Student</Button>
        </div>
      )}

      {isOwner && schoolTeachers.length > 0 && (
        <div className="px-6 pb-6">
          <Button variant="secondary" onClick={() => navigate(`/app/classrooms/${contextId}/request-access`)}>
            Request access for a colleague
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={deletingClassroom}
        onOpenChange={setDeletingClassroom}
        title="Delete this classroom?"
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          await deleteClassroom(contextId);
          navigate('/app');
        }}
      />
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
