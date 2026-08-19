import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useClassroom } from '../../lib/firestore';
import { createAccessRequest, useAccessRequestsForContext, useMembersOfSchool } from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';

/** A dedicated page for a classroom owner to request a colleague get
 * award-level access — reached from ClassroomDetailPage's "Request Access"
 * button (only shown to the owner, when the school has other teachers)
 * rather than an inline form, matching the standalone-page convention used
 * elsewhere (CSV import/promote/archive). 'award' is the only grant level
 * that exists — rename/delete/roster/store rights are school-staff only
 * and can't be delegated, so there's no level to choose here anymore. */
export function RequestAccessPage({ user, contextId }: { user: User; contextId: string }) {
  const classroom = useClassroom(contextId);
  const schoolTeachers = useMembersOfSchool(classroom?.schoolId).filter(
    (m) => m.role === 'teacher' && m.uid !== user.uid,
  );
  const contextRequests = useAccessRequestsForContext(contextId);

  const [requestTargetUid, setRequestTargetUid] = useState('');
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
      level: 'award',
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
          { label: 'Request Access', href: `/app/classrooms/${contextId}/request-access` },
        ]}
      />
      <div className="flex max-w-md flex-col gap-4 px-6 py-4">
        <p className="text-xs text-ink-muted">
          An admin will need to approve this before your colleague can record earn/spend for this classroom.
        </p>
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
