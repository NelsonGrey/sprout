import type { User } from 'firebase/auth';
import { useSchoolIdsForUser } from '../../lib/school';
import { CreateSchoolPage } from './CreateSchoolPage';
import { SchoolAdminPage } from './SchoolAdminPage';

/** Routed at /app/school. A signed-in user with no school yet can found one;
 * otherwise shows their school. Multi-school membership/switching is
 * deferred — the first schoolId wins. */
export function SchoolPage({ user }: { user: User }) {
  const schoolIds = useSchoolIdsForUser(user.uid);
  if (schoolIds.length === 0) return <CreateSchoolPage user={user} />;
  return <SchoolAdminPage user={user} schoolId={schoolIds[0]} />;
}
