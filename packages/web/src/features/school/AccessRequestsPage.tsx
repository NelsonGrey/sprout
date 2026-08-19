import type { User } from 'firebase/auth';
import {
  approveAccessRequest,
  declineAccessRequest,
  useMyMembership,
  usePendingAccessRequestsForSchool,
  useSchoolIdsForUser,
} from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';

/** A classroom owner's requests that a colleague get delegated access —
 * split out of the former all-in-one SchoolAdminPage. */
export function AccessRequestsPage({ user }: { user: User }) {
  const schoolIds = useSchoolIdsForUser(user.uid);
  const schoolId = schoolIds[0];
  const membership = useMyMembership(schoolId, user.uid);
  const isAtLeastAdmin = membership?.role === 'admin' || membership?.role === 'super_admin';
  const accessRequests = usePendingAccessRequestsForSchool(schoolId);

  if (!isAtLeastAdmin) {
    return (
      <div className="flex min-h-full flex-col text-ink">
        <PageHeader
          title="Access Requests"
          breadcrumbs={[{ label: 'Home', href: '/app' }, { label: 'School', href: '/app/school' }, { label: 'Access Requests', href: '/app/school/requests' }]}
        />
        <p className="px-6 py-4 text-ink-muted">Only school admins can manage access requests.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader
        title="Access Requests"
        breadcrumbs={[{ label: 'Home', href: '/app' }, { label: 'School', href: '/app/school' }, { label: 'Access Requests', href: '/app/school/requests' }]}
      />
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {accessRequests.length === 0 ? (
          <p className="text-ink-muted">No pending access requests.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {accessRequests.map((request) => (
              <li
                key={request.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <p>
                  {request.requestedByDisplayName} wants {request.targetDisplayName} to have {request.level} access
                  to {request.contextName}
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => approveAccessRequest(request, user.uid)}>
                    Approve
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => declineAccessRequest(request.id, user.uid)}>
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
