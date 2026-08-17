import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { Pencil, Trash2 } from 'lucide-react';
import {
  addStudent,
  deleteClassroom,
  deleteStudent,
  updateClassroom,
  updateStudent,
  useClassroom,
  useStudents,
} from '../../lib/firestore';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { IconButton } from '../../components/ui/icon-button';
import { Input } from '../../components/ui/input';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';

export function ClassroomDetailPage({ user, contextId }: { user: User; contextId: string }) {
  const classroom = useClassroom(contextId);
  const ownerUids = classroom?.ownerUids ?? [user.uid];

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

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    await addStudent({
      contextId,
      displayName: trimmed,
      ownerUids,
      schoolId: classroom?.schoolId,
      gradeLevel: classroom?.gradeLevel,
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
    if (trimmed) await updateStudent(studentId, { displayName: trimmed });
    setRenamingStudentId(null);
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
            <>
              <IconButton label="Rename classroom" variant="secondary" onClick={startRenamingClassroom}>
                <Pencil size={16} />
              </IconButton>
              <IconButton label="Delete classroom" variant="secondary" onClick={() => setDeletingClassroom(true)}>
                <Trash2 size={16} />
              </IconButton>
            </>
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
                </li>
              ),
            )}
          </ul>
        )}
      </div>

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
