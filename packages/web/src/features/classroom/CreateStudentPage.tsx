import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { addStudent, splitDisplayName, useClassroom } from '../../lib/firestore';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

/** A dedicated page for adding a student to one classroom — reached from
 * ClassroomDetailPage's "Add Student" button rather than an inline form,
 * matching the standalone-page convention already used for CSV import/
 * promote/archive (see packages/web/src/features/students/). */
export function CreateStudentPage({ user, contextId }: { user: User; contextId: string }) {
  const [, navigate] = useLocation();
  const classroom = useClassroom(contextId);
  const ownerUids = classroom?.ownerUids ?? [user.uid];

  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

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
    navigate(`/classrooms/${contextId}`);
  };

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader title={`Add Student — ${classroom?.name ?? 'Classroom'}`} backTo={`/classrooms/${contextId}`} />
      <div className="flex max-w-md flex-col gap-3 px-6 py-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Student name"
          autoFocus
        />
        <Button className="self-start" onClick={handleAdd} disabled={!name.trim() || adding}>
          Create
        </Button>
      </div>
    </div>
  );
}
