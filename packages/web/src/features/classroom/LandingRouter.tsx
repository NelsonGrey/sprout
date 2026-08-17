import type { User } from 'firebase/auth';
import { useLinkedStudent } from '../../lib/firestore';
import { useSchoolIdsForUser } from '../../lib/school';
import { useClassrooms } from '../../lib/firestore';
import { ClassroomsPage } from './ClassroomsPage';
import { MyBalancePage } from '../student/MyBalancePage';

/** Routed at `/`. Decides between the student-facing balance view and the
 * staff "My Classrooms" landing:
 *   - linked student, no staff access at all -> MyBalancePage (the common
 *     case for an actual student — see BR-1.3.3/1.4.1).
 *   - everyone else (unlinked, OR linked but also staff, OR a brand-new
 *     self-serve teacher who's never linked to anything) -> ClassroomsPage,
 *     unchanged from before this feature existed. A dual-role user
 *     deliberately defaults to the staff experience, the rarer and more
 *     privileged path. */
export function LandingRouter({ user }: { user: User }) {
  const linkedStudent = useLinkedStudent(user.uid);
  const schoolIds = useSchoolIdsForUser(user.uid);
  const ownClassrooms = useClassrooms(user.uid);

  if (linkedStudent === undefined) return null;

  const hasAnyStaffAccess = schoolIds.length > 0 || ownClassrooms.length > 0;
  if (linkedStudent && !hasAnyStaffAccess) {
    return <MyBalancePage student={linkedStudent} />;
  }
  return <ClassroomsPage user={user} />;
}
