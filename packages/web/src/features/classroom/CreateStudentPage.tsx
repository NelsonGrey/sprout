import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { addStudent, splitDisplayName, useClassroom } from '../../lib/firestore';
import { useMyMembership } from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

/** A dedicated page for adding a student to one classroom — reached from
 * ClassroomRosterPage's "Add Student" button rather than an inline form,
 * matching the standalone-page convention already used for CSV import/
 * promote/archive (see packages/web/src/features/students/). Guards
 * itself independently of ClassroomRosterPage's own gating, since this
 * route is still directly reachable by URL. */
export function CreateStudentPage({ user, contextId }: { user: User; contextId: string }) {
  const [, navigate] = useLocation();
  const classroom = useClassroom(contextId);
  const ownerUids = classroom?.ownerUids ?? [user.uid];
  const isOwner = ownerUids.includes(user.uid);

  const membership = useMyMembership(classroom?.schoolId, user.uid);
  const isAtLeastAdmin = membership?.role === 'admin' || membership?.role === 'super_admin';
  const canManage = classroom?.schoolId == null ? isOwner : isAtLeastAdmin;

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
    navigate(`/app/classrooms/${contextId}/roster`);
  };

  const breadcrumbs = [
    { label: 'Home', href: '/app' },
    { label: classroom?.name ?? 'Classroom', href: `/app/classrooms/${contextId}` },
    { label: 'Roster', href: `/app/classrooms/${contextId}/roster` },
    { label: 'Add Student', href: `/app/classrooms/${contextId}/students/new` },
  ];

  if (!canManage) {
    return (
      <div className="flex min-h-full flex-col text-ink">
        <PageHeader title="Add Student" breadcrumbs={breadcrumbs} />
        <p className="px-6 py-4 text-ink-muted">Only school staff can add a student.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader title={`Add Student — ${classroom?.name ?? 'Classroom'}`} breadcrumbs={breadcrumbs} />
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
