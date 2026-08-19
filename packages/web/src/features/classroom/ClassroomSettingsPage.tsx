import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { Pencil, Trash2 } from 'lucide-react';
import { deleteClassroom, updateClassroom, useClassroom, useStudents } from '../../lib/firestore';
import { useMyMembership } from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { IconButton } from '../../components/ui/icon-button';
import { Input } from '../../components/ui/input';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { StoreManager } from './StoreManager';

/** Classroom setup — rename/delete the classroom and run the store
 * catalog. School-staff only for a school-affiliated classroom (a
 * schoolless classroom's owner remains its only possible manager) —
 * separated from the daily balance-review page (rare, high-blast-radius
 * actions) and from roster changes (a different concern — who's
 * enrolled, not what the classroom itself is called or sells). */
export function ClassroomSettingsPage({ user, contextId }: { user: User; contextId: string }) {
  const classroom = useClassroom(contextId);
  const ownerUids = classroom?.ownerUids ?? [user.uid];
  const isOwner = ownerUids.includes(user.uid);

  const membership = useMyMembership(classroom?.schoolId, user.uid);
  const isAtLeastAdmin = membership?.role === 'admin' || membership?.role === 'super_admin';
  const canManage = classroom?.schoolId == null ? isOwner : isAtLeastAdmin;

  const students = useStudents(contextId);
  const hasActiveStudents = students.some((s) => !s.archivedAt);

  const [, navigate] = useLocation();
  const [renamingClassroom, setRenamingClassroom] = useState(false);
  const [classroomNameDraft, setClassroomNameDraft] = useState('');
  const [deletingClassroom, setDeletingClassroom] = useState(false);

  const startRenamingClassroom = () => {
    setClassroomNameDraft(classroom?.name ?? '');
    setRenamingClassroom(true);
  };

  const saveClassroomName = async () => {
    const trimmed = classroomNameDraft.trim();
    if (trimmed) await updateClassroom(contextId, { name: trimmed });
    setRenamingClassroom(false);
  };

  const breadcrumbs = [
    { label: 'Home', href: '/app' },
    { label: classroom?.name ?? 'Classroom', href: `/app/classrooms/${contextId}` },
    { label: 'Settings', href: `/app/classrooms/${contextId}/settings` },
  ];

  if (!canManage) {
    return (
      <div className="flex min-h-full flex-col text-ink">
        <PageHeader title="Settings" breadcrumbs={breadcrumbs} />
        <p className="px-6 py-4 text-ink-muted">Only school staff can manage this classroom.</p>
      </div>
    );
  }

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
          title={`Settings — ${classroom?.name ?? 'Classroom'}`}
          breadcrumbs={breadcrumbs}
          actions={
            <>
              <IconButton label="Rename classroom" variant="secondary" onClick={startRenamingClassroom}>
                <Pencil size={16} />
              </IconButton>
              <IconButton
                label="Delete classroom"
                variant="secondary"
                disabled={hasActiveStudents}
                title={hasActiveStudents ? 'Move or archive all students before deleting this classroom.' : undefined}
                onClick={() => setDeletingClassroom(true)}
              >
                <Trash2 size={16} />
              </IconButton>
            </>
          }
        />
      )}

      <div className="border-b border-border px-6 py-4">
        <StoreManager contextId={contextId} createdByUid={user.uid} />
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
          navigate('/app');
        }}
      />
    </div>
  );
}
