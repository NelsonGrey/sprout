import type { User } from 'firebase/auth';
import { useLinkedStudent } from '../../lib/firestore';
import { PageHeader } from '../../components/ui/page-header';
import { EarlyReaderTodayPage } from './EarlyReaderTodayPage';
import { GoalsPage } from './GoalsPage';
import { HistoryPage } from './HistoryPage';
import { isEarlyReaderPresentation } from './studentPresentation';
import { TodayPage } from './TodayPage';

export type StudentView = 'today' | 'history' | 'goals';

/** Routed at `/app/me`, `/app/me/history`, and `/app/me/goals`
 * (`W-STUDENT-01/02`) — reachable from the account menu's "My student
 * view" switcher for a dual-role account (§2.1: staff and linked-student
 * on the same Firebase user). LandingRouter still defaults such an
 * account to the staff dashboard at `/app`; these routes are the only way
 * back to the student-only view without switching accounts. Renders a
 * stable explanation rather than redirecting if the account turns out not
 * to be linked, since navigating here should never flash protected data.
 *
 * Presentation forks on the student's own grade band (Slice 4): a
 * Pre-K–2 account always gets the single collapsed EarlyReaderTodayPage
 * regardless of which of the three routes it landed on — that band has no
 * History/Goals/Learn destinations at all (01_EXPERIENCE_FOUNDATIONS.md
 * §5.2) — while everyone else gets the requested Today/History/Goals view. */
export function MyStudentViewPage({ user, view = 'today' }: { user: User; view?: StudentView }) {
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

  if (isEarlyReaderPresentation(linkedStudent)) {
    return <EarlyReaderTodayPage student={linkedStudent} />;
  }

  if (view === 'history') return <HistoryPage student={linkedStudent} />;
  if (view === 'goals') return <GoalsPage student={linkedStudent} />;
  return <TodayPage student={linkedStudent} />;
}
