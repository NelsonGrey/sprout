import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import type { MemberScope } from '@sprout/shared';
import {
  cancelInvite,
  getSchool,
  inviteMember,
  removeMember,
  useMembersOfSchool,
  useMyMembership,
  usePendingInvitesForSchool,
} from '../../lib/school';

const GRADE_OPTIONS = ['PK', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

function scopeSummary(scope: MemberScope | undefined): string {
  if (!scope || scope.type === 'own') return 'Own classrooms only';
  if (scope.type === 'school') return 'Whole school';
  return `Grades: ${scope.grades.join(', ') || '(none selected)'}`;
}

function ScopePicker({ value, onChange }: { value: MemberScope; onChange: (v: MemberScope) => void }) {
  return (
    <div className="flex flex-col gap-2 text-left text-sm">
      <label className="flex items-center gap-2">
        <input
          type="radio"
          checked={value.type === 'own'}
          onChange={() => onChange({ type: 'own' })}
        />
        Own classrooms only
      </label>
      <label className="flex items-center gap-2">
        <input
          type="radio"
          checked={value.type === 'grades'}
          onChange={() => onChange({ type: 'grades', grades: [] })}
        />
        Specific grades
      </label>
      {value.type === 'grades' && (
        <div className="ml-6 flex flex-wrap gap-2">
          {GRADE_OPTIONS.map((grade) => {
            const checked = value.grades.includes(grade);
            return (
              <button
                key={grade}
                type="button"
                onClick={() =>
                  onChange({
                    type: 'grades',
                    grades: checked ? value.grades.filter((g) => g !== grade) : [...value.grades, grade],
                  })
                }
                className={`rounded border px-2 py-1 text-xs ${checked ? 'border-green-500 bg-green-600/30' : 'border-white/20'}`}
              >
                {grade}
              </button>
            );
          })}
        </div>
      )}
      <label className="flex items-center gap-2">
        <input
          type="radio"
          checked={value.type === 'school'}
          onChange={() => onChange({ type: 'school' })}
        />
        Whole school (PE, art, music, etc.)
      </label>
    </div>
  );
}

/** Shown at /school to a member of a school. Admins (principal or
 * delegate) get the full staff roster + invite/remove tooling; a plain
 * teacher just sees their own role and scope. Delegation is hierarchical
 * (BR-1.3.11/1.3.12): only the principal can invite/remove admins. */
export function SchoolAdminPage({ user, schoolId }: { user: User; schoolId: string }) {
  const [, navigate] = useLocation();
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [principalUid, setPrincipalUid] = useState<string | null>(null);
  const membership = useMyMembership(schoolId, user.uid);
  const members = useMembersOfSchool(schoolId);
  const invites = usePendingInvitesForSchool(schoolId);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteScope, setInviteScope] = useState<MemberScope>({ type: 'own' });
  const [inviting, setInviting] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [invitingAdmin, setInvitingAdmin] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSchool(schoolId).then((school) => {
      setSchoolName(school?.name ?? null);
      setPrincipalUid(school?.principalUid ?? null);
    });
  }, [schoolId]);

  const isAdmin = membership?.role === 'admin';
  const isPrincipal = principalUid === user.uid;

  const handleInviteTeacher = async () => {
    const email = inviteEmail.trim();
    if (!email || inviting) return;
    setInviting(true);
    setError('');
    try {
      await inviteMember({ schoolId, email, role: 'teacher', scope: inviteScope, invitedByUid: user.uid });
      setInviteEmail('');
      setInviteScope({ type: 'own' });
    } catch {
      setError('Could not send that invite. Please try again.');
    } finally {
      setInviting(false);
    }
  };

  const handleInviteAdmin = async () => {
    const email = adminEmail.trim();
    if (!email || invitingAdmin) return;
    setInvitingAdmin(true);
    setError('');
    try {
      await inviteMember({ schoolId, email, role: 'admin', invitedByUid: user.uid });
      setAdminEmail('');
    } catch {
      setError('Could not send that invite. Please try again.');
    } finally {
      setInvitingAdmin(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-neutral-950 text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <h1 className="text-xl font-bold">{schoolName ?? 'School'}</h1>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
        >
          My Classrooms
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 overflow-y-auto px-6 py-6">
        <section className="rounded-lg border border-white/10 p-4">
          <h2 className="text-sm font-semibold text-white/60">Your access</h2>
          <p className="mt-1">
            {isPrincipal ? 'Principal' : membership?.role === 'admin' ? 'Admin (delegate)' : 'Teacher'}
            {membership?.role === 'teacher' && ` — ${scopeSummary(membership.scope)}`}
          </p>
        </section>

        {isAdmin && (
          <>
            <section>
              <h2 className="mb-3 text-sm font-semibold text-white/60">Staff</h2>
              <ul className="flex flex-col gap-2">
                {members.map((member) => (
                  <li
                    key={member.uid}
                    className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3"
                  >
                    <div>
                      <p>{member.displayName || member.email}</p>
                      <p className="text-xs text-white/50">
                        {member.role === 'admin' ? 'Admin' : `Teacher — ${scopeSummary(member.scope)}`}
                      </p>
                    </div>
                    {member.uid !== user.uid && (member.role === 'teacher' || isPrincipal) && (
                      <button
                        type="button"
                        onClick={() => removeMember(schoolId, member.uid)}
                        className="text-xs text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {invites.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-white/60">Pending invites</h2>
                <ul className="flex flex-col gap-2">
                  {invites.map((invite) => (
                    <li
                      key={invite.email}
                      className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3"
                    >
                      <div>
                        <p>{invite.email}</p>
                        <p className="text-xs text-white/50">
                          {invite.role === 'admin' ? 'Admin (pending)' : `Teacher — ${scopeSummary(invite.scope)} (pending)`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => cancelInvite(invite.email)}
                        className="text-xs text-red-400 hover:underline"
                      >
                        Cancel
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-lg border border-white/10 p-4">
              <h2 className="mb-3 text-sm font-semibold text-white/60">Invite a teacher</h2>
              <div className="flex flex-col gap-3">
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Email"
                  className="rounded-lg border border-white/20 bg-transparent px-3 py-2"
                />
                <ScopePicker value={inviteScope} onChange={setInviteScope} />
                <button
                  type="button"
                  onClick={handleInviteTeacher}
                  disabled={inviting}
                  className="rounded-lg bg-green-600 px-4 py-2 font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  Send Invite
                </button>
              </div>
            </section>

            {isPrincipal && (
              <section className="rounded-lg border border-white/10 p-4">
                <h2 className="mb-3 text-sm font-semibold text-white/60">
                  Delegate admin access
                </h2>
                <p className="mb-3 text-xs text-white/50">
                  Only you, as principal, can grant or revoke admin access.
                </p>
                <div className="flex gap-2">
                  <input
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="Email"
                    className="flex-1 rounded-lg border border-white/20 bg-transparent px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={handleInviteAdmin}
                    disabled={invitingAdmin}
                    className="rounded-lg border border-white/20 px-4 py-2 font-medium hover:bg-white/10 disabled:opacity-50"
                  >
                    Invite Admin
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </main>
  );
}
