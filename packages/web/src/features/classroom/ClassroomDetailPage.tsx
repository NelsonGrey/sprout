import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { Pencil, Trash2 } from 'lucide-react';
import {
  addStudent,
  deleteClassroom,
  deleteStudent,
  splitDisplayName,
  updateClassroom,
  updateStudent,
  useClassroom,
  useStudents,
} from '../../lib/firestore';
import {
  createAccessRequest,
  useAccessRequestsForContext,
  useMembersOfSchool,
  useMyMembership,
} from '../../lib/school';
import type { ClassroomGrantLevel } from '@sprout/shared';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { IconButton } from '../../components/ui/icon-button';
import { Input } from '../../components/ui/input';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';

export function ClassroomDetailPage({ user, contextId }: { user: User; contextId: string }) {
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
  const contextRequests = useAccessRequestsForContext(contextId);

  const students = useStudents(contextId);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [, navigate] = useLocation();

  const [renamingClassroom, setRenamingClassroom] = useState(false);
  const [classroomNameDraft, setClassroomNameDraft] = useState('');
  const [deletingClassroom, setDeletingClassroom] = useState(false);
  const [renamingStudentId, setRenamingStudentId] = useState<string | null>(null);
  const [studentNameDraft, setStudentNameDraft] = useState('');
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);

  const [requestTargetUid, setRequestTargetUid] = useState('');
  const [requestLevel, setRequestLevel] = useState<ClassroomGrantLevel>('award');
  const [requesting, setRequesting] = useState(false);

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    const { firstName, lastName } = splitDisplayName(trimmed);
    await addStudent({
      contextId,
      firstName,
      lastName,
      ownerUids,
      schoolId: classroom?.schoolId,
      gradeLevel: classroom?.gradeLevel,
      contextName: classroom?.name,
    });
    setName('');
    setAdding(false);
  };

  const startRenamingClassroom = () => {
    setClassroomNameDraft(classroom?.name ?? '');
    setRenamingClassroom(true);
  };

  const saveClassroomName = async () => {
    const trimmed = classroomNameDraft.trim();
    if (trimmed) await updateClassroom(contextId, { name: trimmed });
    setRenamingClassroom(false);
  };

  const startRenamingStudent = (studentId: string, currentName: string) => {
    setStudentNameDraft(currentName);
    setRenamingStudentId(studentId);
  };

  const saveStudentName = async (studentId: string) => {
    const trimmed = studentNameDraft.trim();
    if (trimmed) {
      const { firstName, lastName } = splitDisplayName(trimmed);
      await updateStudent(studentId, { firstName, lastName });
    }
    setRenamingStudentId(null);
  };

  const handleRequestAccess = async () => {
    const target = schoolTeachers.find((m) => m.uid === requestTargetUid);
    if (!target || !classroom?.schoolId || requesting) return;
    setRequesting(true);
    await createAccessRequest({
      schoolId: classroom.schoolId,
      contextId,
      contextName: classroom.name,
      requestedByUid: user.uid,
      requestedByDisplayName: user.displayName ?? '',
      targetUid: target.uid,
      targetDisplayName: target.displayName || target.email,
      level: requestLevel,
    });
    setRequestTargetUid('');
    setRequesting(false);
  };

  return (
    <main className="flex min-h-screen flex-col bg-neutral-950 text-white">
      {renamingClassroom ? (
        <header className="flex items-center gap-3 border-b border-white/10 px-6 py-4">
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
          backTo="/"
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

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {students.length === 0 ? (
          <p className="text-white/60">No students yet — create one below.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {students.map((student) =>
              renamingStudentId === student.id ? (
                <li
                  key={student.id}
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-3"
                >
                  <Input
                    value={studentNameDraft}
                    onChange={(e) => setStudentNameDraft(e.target.value)}
                    autoFocus
                    className="flex-1"
                  />
                  <Button size="sm" onClick={() => saveStudentName(student.id)}>
                    Save
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setRenamingStudentId(null)}>
                    Cancel
                  </Button>
                </li>
              ) : (
                <li
                  key={student.id}
                  className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3 hover:bg-white/5"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/classrooms/${contextId}/students/${student.id}`)}
                    className="flex flex-1 items-center justify-between text-left"
                  >
                    <span>{student.displayName}</span>
                    <span>${(student.balanceCents / 100).toFixed(2)}</span>
                  </button>
                  {canManage && (
                    <div className="ml-2 flex items-center gap-1">
                      <IconButton
                        label="Rename student"
                        variant="secondary"
                        onClick={() => startRenamingStudent(student.id, student.displayName)}
                      >
                        <Pencil size={14} />
                      </IconButton>
                      <IconButton
                        label="Delete student"
                        variant="secondary"
                        onClick={() => setDeletingStudentId(student.id)}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  )}
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      {canManage && (
        <div className="flex gap-2 border-t border-white/10 px-6 py-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Student name"
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={adding}>
            Create
          </Button>
        </div>
      )}

      {isOwner && schoolTeachers.length > 0 && (
        <section className="mx-6 mb-6 rounded-lg border border-white/10 p-4">
          <h2 className="mb-3 text-sm font-semibold text-white/60">Request access for a colleague</h2>
          <p className="mb-3 text-xs text-white/50">
            An admin will need to approve this before your colleague gets access.
          </p>
          <div className="flex flex-col gap-3">
            <select
              value={requestTargetUid}
              onChange={(e) => setRequestTargetUid(e.target.value)}
              className="rounded-lg border border-white/20 bg-neutral-950 px-3 py-2 text-white"
            >
              <option value="">Choose a teacher…</option>
              {schoolTeachers.map((m) => (
                <option key={m.uid} value={m.uid}>
                  {m.displayName || m.email}
                </option>
              ))}
            </select>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={requestLevel === 'award'}
                  onChange={() => setRequestLevel('award')}
                />
                Award only (record earn/spend)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={requestLevel === 'manage'}
                  onChange={() => setRequestLevel('manage')}
                />
                Full manage (rename/delete/roster)
              </label>
            </div>
            <Button onClick={handleRequestAccess} disabled={!requestTargetUid || requesting}>
              Request Access
            </Button>
          </div>
          {contextRequests.length > 0 && (
            <ul className="mt-4 flex flex-col gap-1 text-xs text-white/50">
              {contextRequests.map((r) => (
                <li key={r.id}>
                  {r.targetDisplayName} — {r.level} — {r.status}
                </li>
              ))}
            </ul>
          )}
        </section>
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
          navigate('/');
        }}
      />
      <ConfirmDialog
        open={deletingStudentId !== null}
        onOpenChange={(open) => !open && setDeletingStudentId(null)}
        title="Delete this student?"
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (deletingStudentId) await deleteStudent(deletingStudentId);
        }}
      />
    </main>
  );
}
