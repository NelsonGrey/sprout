import { useState } from 'react';
import type { User } from 'firebase/auth';
import type { ClassroomGrantLevel } from '@sprout/shared';
import { useClassroom } from '../../lib/firestore';
import { createAccessRequest, useAccessRequestsForContext, useMembersOfSchool } from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';

/** A dedicated page for a classroom owner to request a colleague get
 * delegated access — reached from ClassroomSettingsPage's "Request Access"
 * button (only shown to the owner, when the school has other teachers)
 * rather than an inline form, matching the standalone-page convention used
 * elsewhere (CSV import/promote/archive). */
export function RequestAccessPage({ user, contextId }: { user: User; contextId: string }) {
  const classroom = useClassroom(contextId);
  const schoolTeachers = useMembersOfSchool(classroom?.schoolId).filter(
    (m) => m.role === 'teacher' && m.uid !== user.uid,
  );
  const contextRequests = useAccessRequestsForContext(contextId);

  const [requestTargetUid, setRequestTargetUid] = useState('');
  const [requestLevel, setRequestLevel] = useState<ClassroomGrantLevel>('award');
  const [requesting, setRequesting] = useState(false);

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
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader
        title={`Request Access — ${classroom?.name ?? 'Classroom'}`}
        breadcrumbs={[
          { label: 'Home', href: '/app' },
          { label: classroom?.name ?? 'Classroom', href: `/app/classrooms/${contextId}` },
          { label: 'Settings', href: `/app/classrooms/${contextId}/settings` },
          { label: 'Request Access', href: `/app/classrooms/${contextId}/request-access` },
        ]}
      />
      <div className="flex max-w-md flex-col gap-4 px-6 py-4">
        <p className="text-xs text-ink-muted">An admin will need to approve this before your colleague gets access.</p>
        <select
          value={requestTargetUid}
          onChange={(e) => setRequestTargetUid(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-ink"
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
            <input type="radio" checked={requestLevel === 'award'} onChange={() => setRequestLevel('award')} />
            Award only (record earn/spend)
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={requestLevel === 'manage'} onChange={() => setRequestLevel('manage')} />
            Full manage (rename/delete/roster)
          </label>
        </div>
        <Button className="self-start" onClick={handleRequestAccess} disabled={!requestTargetUid || requesting}>
          Request Access
        </Button>

        {contextRequests.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1 text-xs text-ink-muted">
            {contextRequests.map((r) => (
              <li key={r.id}>
                {r.targetDisplayName} — {r.level} — {r.status}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
