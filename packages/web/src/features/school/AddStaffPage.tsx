import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { MemberRole, MemberScope } from '@sprout/shared';
import {
  cancelInvite,
  getSchool,
  inviteMember,
  useMyMembership,
  usePendingInvitesForSchool,
  useSchoolIdsForUser,
} from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { GRADE_OPTIONS, roleLabel, scopeSummary } from './shared';
import { ScopePicker } from './ScopePicker';

/** Invite any staff member — teacher, admin, or super admin — and manage
 * pending invites, all in one place reachable from StaffPage's "Add Staff"
 * button. Merges the former separate InviteTeacherPage/DelegateAdminPage:
 * "create a staff member" is one capability, not two disconnected pages. */
export function AddStaffPage({ user }: { user: User }) {
  const schoolIds = useSchoolIdsForUser(user.uid);
  const schoolId = schoolIds[0];
  const membership = useMyMembership(schoolId, user.uid);
  const isAtLeastAdmin = membership?.role === 'admin' || membership?.role === 'super_admin';
  const isSuperAdmin = membership?.role === 'super_admin';
  const invites = usePendingInvitesForSchool(schoolId);

  const [schoolEnabledGrades, setSchoolEnabledGrades] = useState<string[] | undefined>(undefined);
  useEffect(() => {
    if (!schoolId) return;
    getSchool(schoolId).then((school) => setSchoolEnabledGrades(school?.enabledGrades));
  }, [schoolId]);
  const activeGrades = schoolEnabledGrades ?? GRADE_OPTIONS;

  const [role, setRole] = useState<MemberRole>('teacher');
  const [email, setEmail] = useState('');
  const [scope, setScope] = useState<MemberScope>({ type: 'own' });
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');

  const handleInvite = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || inviting) return;
    setInviting(true);
    setError('');
    try {
      await inviteMember({
        schoolId,
        email: trimmedEmail,
        role,
        ...(role === 'teacher' ? { scope } : {}),
        invitedByUid: user.uid,
      });
      setEmail('');
      setRole('teacher');
      setScope({ type: 'own' });
    } catch {
      setError('Could not send that invite. Please try again.');
    } finally {
      setInviting(false);
    }
  };

  if (!isAtLeastAdmin) {
    return (
      <div className="flex min-h-full flex-col text-ink">
        <PageHeader title="Add Staff" backTo="/app/school/staff" />
        <p className="px-6 py-4 text-ink-muted">Only school admins can invite staff.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader title="Add Staff" backTo="/app/school/staff" />
      <div className="flex max-w-md flex-col gap-8 px-6 py-4">
        <section className="rounded-lg border border-border p-4">
          <div className="flex flex-col gap-3">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            {isSuperAdmin && (
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={role === 'teacher'} onChange={() => setRole('teacher')} />
                  Teacher
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={role === 'admin'} onChange={() => setRole('admin')} />
                  Admin
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={role === 'super_admin'}
                    onChange={() => setRole('super_admin')}
                  />
                  Super Admin
                </label>
              </div>
            )}
            {role === 'teacher' && <ScopePicker value={scope} onChange={setScope} gradeOptions={activeGrades} />}
            <Button onClick={handleInvite} disabled={inviting}>
              Send Invite
            </Button>
          </div>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </section>

        {invites.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink-muted">Pending invites</h2>
            <ul className="flex flex-col gap-2">
              {invites.map((invite) => (
                <li
                  key={invite.email}
                  className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                >
                  <div>
                    <p>{invite.email}</p>
                    <p className="text-xs text-ink-muted">
                      {invite.role === 'teacher'
                        ? `Teacher — ${scopeSummary(invite.scope)} (pending)`
                        : `${roleLabel(invite.role)} (pending)`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => cancelInvite(invite.email)}>
                    Cancel
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
