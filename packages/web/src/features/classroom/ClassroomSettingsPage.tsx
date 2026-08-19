import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { Pencil, Trash2 } from 'lucide-react';
import { deleteClassroom, updateClassroom, useClassroom } from '../../lib/firestore';
import { useMembersOfSchool, useMyMembership } from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { IconButton } from '../../components/ui/icon-button';
import { Input } from '../../components/ui/input';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { StoreManager } from './StoreManager';

/** Classroom setup — rename/delete the classroom, run the store catalog,
 * and request colleague access. Separated from the daily balance-review
 * page (rare, high-blast-radius actions) and from roster changes (a
 * different concern — who's enrolled, not what the classroom itself is
 * called or sells). The Store section deliberately has no canManage gate
 * here, matching its existing behavior: firestore.rules already lets any
 * award-access teacher stock the store, and this page must not narrow
 * that just because it also happens to host manage-only actions. */
export function ClassroomSettingsPage({ user, contextId }: { user: User; contextId: string }) {
  const classroom = useClassroom(contextId);
  const ownerUids = classroom?.ownerUids ?? [user.uid];
  const isOwner = ownerUids.includes(user.uid);

  const membership = useMyMembership(classroom?.schoolId, user.uid);
  const canManage =
    isOwner ||
    (membership !== null && membership !== undefined && membership.role !== 'teacher') ||
    membership?.classroomGrants?.[contextId] === 'manage';

  const schoolTeachers = useMembersOfSchool(classroom?.schoolId).filter(
    (m) => m.role === 'teacher' && m.uid !== user.uid,
  );

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

      <div className="border-b border-border px-6 py-4">
        <StoreManager contextId={contextId} createdByUid={user.uid} />
      </div>

      {isOwner && schoolTeachers.length > 0 && (
        <div className="px-6 py-4">
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
    </div>
  );
}
