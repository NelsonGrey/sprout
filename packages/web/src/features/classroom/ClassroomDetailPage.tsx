import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { ArrowLeft, Settings, Users } from 'lucide-react';
import { useClassroom, useStudents } from '../../lib/firestore';
import { useMembersOfSchool, useMyMembership } from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { IconButton } from '../../components/ui/icon-button';
import { TwoPaneLayout } from '../../components/layout/TwoPaneLayout';
import { StudentDetailPane } from './StudentDetailPane';
import { GroupTransactionComposer } from './components/transaction-composer/GroupTransactionComposer';

/** Daily-use view: pick a student, review/award their balance. Classroom
 * setup (rename/delete/store catalog) lives at /settings, and roster
 * changes (add/archive/delete) live at /roster — both school-staff only,
 * reached via the header icons below — so this page never mixes rare,
 * high-blast-radius actions in with the thing people do here every day. */
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
  const isAtLeastAdmin = membership?.role === 'admin' || membership?.role === 'super_admin';
  // School-staff only, once a classroom belongs to a school — ownership no
  // longer confers rename/delete/roster/store rights there (see
  // firestore.rules' canManageClassroom, the real gate this mirrors). A
  // schoolless classroom has no admin at all, so its owner remains its
  // only possible manager.
  const canManage = classroom?.schoolId == null ? isOwner : isAtLeastAdmin;

  const schoolTeachers = useMembersOfSchool(classroom?.schoolId).filter(
    (m) => m.role === 'teacher' && m.uid !== user.uid,
  );

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

  const clearSelection = () => {
    setSelectedStudentId(null);
    navigate(`/app/classrooms/${contextId}`);
  };

  // Group/mass transactions (W-CLASS-02 group mode) — a separate opt-in
  // mode via a "Select" toggle, entirely independent of selectedStudentId
  // above. Rows behave exactly as before (click navigates to single
  // detail) whenever this is off, so the existing single-select flow is
  // unchanged.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());

  const toggleSelectMode = () => {
    setSelectMode((on) => !on);
    setSelectedGroupIds(new Set());
  };

  const toggleGroupMember = (id: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedGroupIds(new Set());
  };

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader
        title={classroom?.name ?? 'Classroom'}
        breadcrumbs={[{ label: 'Home', href: '/app' }, { label: classroom?.name ?? 'Classroom', href: `/app/classrooms/${contextId}` }]}
        actions={
          <>
            {students.length > 0 && (
              <Button variant="secondary" size="sm" onClick={toggleSelectMode}>
                {selectMode ? 'Cancel select' : 'Select'}
              </Button>
            )}
            {canManage && (
              <>
                <IconButton
                  label="Roster"
                  variant="secondary"
                  onClick={() => navigate(`/app/classrooms/${contextId}/roster`)}
                >
                  <Users size={16} />
                </IconButton>
                <IconButton
                  label="Classroom settings"
                  variant="secondary"
                  onClick={() => navigate(`/app/classrooms/${contextId}/settings`)}
                >
                  <Settings size={16} />
                </IconButton>
              </>
            )}
          </>
        }
      />

      <TwoPaneLayout
        detailSelected={selectedStudentId != null || (selectMode && selectedGroupIds.size > 0)}
        left={
          students.length === 0 ? (
            <p className="text-ink-muted">No students yet.</p>
          ) : (
            <>
              {selectMode && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedGroupIds(
                      selectedGroupIds.size === students.length ? new Set() : new Set(students.map((s) => s.id)),
                    )
                  }
                  className="mb-2 text-left text-sm font-semibold text-brand hover:underline"
                >
                  {selectedGroupIds.size === students.length ? 'Deselect all' : 'Select all visible'}
                </button>
              )}
              <ul className="flex flex-col gap-2">
                {students.map((student) => (
                  <li key={student.id}>
                    <button
                      type="button"
                      onClick={() => (selectMode ? toggleGroupMember(student.id) : selectStudent(student.id))}
                      aria-pressed={selectMode ? selectedGroupIds.has(student.id) : undefined}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left shadow-card hover:border-brand ${
                        selectMode && selectedGroupIds.has(student.id)
                          ? 'border-brand bg-mint'
                          : 'border-border-strong bg-surface'
                      }`}
                    >
                      {selectMode && (
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.has(student.id)}
                          // No onChange: nesting this inside the row
                          // <button> above means a click already reaches
                          // this input AND bubbles to that button's own
                          // onClick — wiring both toggles the same id
                          // twice per click (back to unselected). The
                          // outer button is the single source of truth;
                          // this is a visual echo of its state.
                          onChange={() => {}}
                          aria-label={`Select ${student.displayName}`}
                          className="h-4 w-4 shrink-0"
                        />
                      )}
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
            </>
          )
        }
        right={
          (() => {
            if (selectMode) {
              const selectedStudents = students.filter((s) => selectedGroupIds.has(s.id));
              return (
                <div>
                  <button
                    type="button"
                    onClick={() => setSelectedGroupIds(new Set())}
                    className="mb-3 flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink lg:hidden"
                  >
                    <ArrowLeft size={16} /> Students
                  </button>
                  {selectedStudents.length > 0 ? (
                    <GroupTransactionComposer contextId={contextId} students={selectedStudents} onDone={exitSelectMode} />
                  ) : (
                    <p className="text-ink-muted">Select one or more students to record for the group.</p>
                  )}
                </div>
              );
            }

            const selectedStudent = students.find((s) => s.id === selectedStudentId);
            return selectedStudent ? (
              <div>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="mb-3 flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink lg:hidden"
                >
                  <ArrowLeft size={16} /> Students
                </button>
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
              </div>
            ) : (
              <p className="text-ink-muted">Select a student to view details.</p>
            );
          })()
        }
      />

      {isOwner && schoolTeachers.length > 0 && (
        <div className="border-t border-border px-6 py-4">
          <Button variant="secondary" onClick={() => navigate(`/app/classrooms/${contextId}/request-access`)}>
            Request access for a colleague
          </Button>
        </div>
      )}
    </div>
  );
}
