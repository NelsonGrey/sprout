import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { Settings, Users } from 'lucide-react';
import { useClassroom, useStudents } from '../../lib/firestore';
import { useMyMembership } from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { IconButton } from '../../components/ui/icon-button';
import { TwoPaneLayout } from '../../components/layout/TwoPaneLayout';
import { StudentDetailPane } from './StudentDetailPane';

/** Daily-use view: pick a student, review/award their balance. Classroom
 * setup (rename/delete/store catalog/colleague access) lives at
 * /settings, and roster changes (add/archive/delete/move) live at
 * /roster — both reached via the header icons below — so this page never
 * mixes rare, high-blast-radius actions in with the thing people do here
 * every day. */
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
  // firestore.rules' hasAwardAccess/hasManageAccess split). Only gates the
  // Roster icon below — Settings stays reachable to everyone who can view
  // this page, since its Store section already has no such gate (any
  // award-access teacher can stock the store today).
  const canManage =
    isOwner ||
    (membership !== null && membership !== undefined && membership.role !== 'teacher') ||
    membership?.classroomGrants?.[contextId] === 'manage';

  const students = useStudents(contextId);
  const [, navigate] = useLocation();

  // Right pane selection: which student is shown in detail (URL-synced, so
  // a direct link to /classrooms/:id/students/:id stays bookmarkable).
  // Seeded once from the studentId route param, not re-synced on every
  // render, so a user's in-page selection isn't fought by prop changes.
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(studentId ?? null);

  const selectStudent = (id: string) => {
    setSelectedStudentId(id);
    navigate(`/app/classrooms/${contextId}/students/${id}`);
  };

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader
        title={classroom?.name ?? 'Classroom'}
        breadcrumbs={[{ label: 'Home', href: '/app' }, { label: classroom?.name ?? 'Classroom', href: `/app/classrooms/${contextId}` }]}
        actions={
          <>
            {canManage && (
              <IconButton
                label="Roster"
                variant="secondary"
                onClick={() => navigate(`/app/classrooms/${contextId}/roster`)}
              >
                <Users size={16} />
              </IconButton>
            )}
            <IconButton
              label="Classroom settings"
              variant="secondary"
              onClick={() => navigate(`/app/classrooms/${contextId}/settings`)}
            >
              <Settings size={16} />
            </IconButton>
          </>
        }
      />

      <TwoPaneLayout
        left={
          students.length === 0 ? (
            <p className="text-ink-muted">No students yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {students.map((student) => (
                <li key={student.id}>
                  <button
                    type="button"
                    onClick={() => selectStudent(student.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border-strong bg-surface px-3 py-2.5 text-left shadow-card hover:border-brand"
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
        }
      />
    </div>
  );
}
