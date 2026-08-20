import type { User } from 'firebase/auth';
import { useLinkedStudent } from '../../lib/firestore';
import { PageHeader } from '../../components/ui/page-header';
import { MyBalancePage } from './MyBalancePage';

/** Routed at `/app/me` (`W-STUDENT-01`) — reachable from the account menu's
 * "My student view" switcher for a dual-role account (§2.1: staff and
 * linked-student on the same Firebase user). LandingRouter still defaults
 * such an account to the staff dashboard at `/app`; this route is the only
 * way back to the student-only view without switching accounts. Renders a
 * stable explanation rather than redirecting if the account turns out not
 * to be linked, since navigating here should never flash protected data. */
export function MyStudentViewPage({ user }: { user: User }) {
  const linkedStudent = useLinkedStudent(user.uid);

  if (linkedStudent === undefined) return null;

  if (linkedStudent === null) {
    return (
      <div className="flex min-h-full flex-col">
        <PageHeader title="My student view" />
        <div className="px-6 py-6">
          <p className="text-sm text-ink-muted">This account isn't linked to a student record.</p>
        </div>
      </div>
    );
  }

  return <MyBalancePage student={linkedStudent} />;
}
