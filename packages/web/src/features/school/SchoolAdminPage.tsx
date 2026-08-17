import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { Pencil, X } from 'lucide-react';
import type { MemberRole, MemberScope } from '@sprout/shared';
import {
  approveAccessRequest,
  cancelInvite,
  declineAccessRequest,
  getSchool,
  inviteMember,
  removeMember,
  revokeClassroomGrant,
  updateMemberScope,
  updateSchool,
  useMembersOfSchool,
  useMyMembership,
  usePendingAccessRequestsForSchool,
  usePendingInvitesForSchool,
} from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { IconButton } from '../../components/ui/icon-button';
import { Input } from '../../components/ui/input';

const GRADE_OPTIONS = ['PK', 'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

function scopeSummary(scope: MemberScope | undefined): string {
  if (!scope || scope.type === 'own') return 'Own classrooms only';
  if (scope.type === 'school') return 'Whole school';
  return `Grades: ${scope.grades.join(', ') || '(none selected)'}`;
}

function roleLabel(role: MemberRole): string {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'admin') return 'Admin';
  return 'Teacher';
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

/** Shown at /school to a member of a school. Admins/super admins get the
 * full staff roster + invite/remove tooling; a plain teacher just sees
 * their own role and scope. Delegation is hierarchical
 * (BR-1.3.11/1.3.12): only a super_admin can invite/remove another
 * super_admin or an admin — a regular admin manages teachers only. The
 * school is never left without at least one super_admin (enforced in
 * firestore.rules, not just this UI's disabled-button state). */
export function SchoolAdminPage({ user, schoolId }: { user: User; schoolId: string }) {
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const membership = useMyMembership(schoolId, user.uid);
  const members = useMembersOfSchool(schoolId);
  const invites = usePendingInvitesForSchool(schoolId);
  const accessRequests = usePendingAccessRequestsForSchool(schoolId);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteScope, setInviteScope] = useState<MemberScope>({ type: 'own' });
  const [inviting, setInviting] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminRole, setAdminRole] = useState<'admin' | 'super_admin'>('admin');
  const [invitingAdmin, setInvitingAdmin] = useState(false);
  const [error, setError] = useState('');

  const [renamingSchool, setRenamingSchool] = useState(false);
  const [schoolNameDraft, setSchoolNameDraft] = useState('');
  const [editingScopeUid, setEditingScopeUid] = useState<string | null>(null);
  const [scopeDraft, setScopeDraft] = useState<MemberScope>({ type: 'own' });

  useEffect(() => {
    getSchool(schoolId).then((school) => setSchoolName(school?.name ?? null));
  }, [schoolId]);

  const isAtLeastAdmin = membership?.role === 'admin' || membership?.role === 'super_admin';
  const isSuperAdmin = membership?.role === 'super_admin';
  const superAdminCount = members.filter((m) => m.role === 'super_admin').length;

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
      await inviteMember({ schoolId, email, role: adminRole, invitedByUid: user.uid });
      setAdminEmail('');
    } catch {
      setError('Could not send that invite. Please try again.');
    } finally {
      setInvitingAdmin(false);
    }
  };

  const canRemove = (memberRole: MemberRole, memberUid: string): boolean => {
    if (memberUid === user.uid) return false;
    if (memberRole === 'teacher') return isAtLeastAdmin;
    if (memberRole === 'admin') return isSuperAdmin;
    // super_admin — only another super_admin can remove one, and never the last.
    return isSuperAdmin && superAdminCount > 1;
  };

  const startRenamingSchool = () => {
    setSchoolNameDraft(schoolName ?? '');
    setRenamingSchool(true);
  };

  const saveSchoolName = async () => {
    const trimmed = schoolNameDraft.trim();
    if (trimmed) {
      await updateSchool(schoolId, { name: trimmed });
      setSchoolName(trimmed);
    }
    setRenamingSchool(false);
  };

  const startEditingScope = (member: { uid: string; scope?: MemberScope }) => {
    setScopeDraft(member.scope ?? { type: 'own' });
    setEditingScopeUid(member.uid);
  };

  const saveScope = async (uid: string) => {
    await updateMemberScope(schoolId, uid, scopeDraft);
    setEditingScopeUid(null);
  };

  return (
    <main className="flex min-h-screen flex-col bg-neutral-950 text-white">
      {renamingSchool ? (
        <header className="flex items-center gap-3 border-b border-white/10 px-6 py-4">
          <Input
            value={schoolNameDraft}
            onChange={(e) => setSchoolNameDraft(e.target.value)}
            autoFocus
            className="flex-1"
          />
          <Button size="sm" onClick={saveSchoolName}>
            Save
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setRenamingSchool(false)}>
            Cancel
          </Button>
        </header>
      ) : (
        <PageHeader
          title={schoolName ?? 'School'}
          backTo="/"
          actions={
            isSuperAdmin && (
              <IconButton label="Rename school" variant="secondary" onClick={startRenamingSchool}>
                <Pencil size={16} />
              </IconButton>
            )
          }
        />
      )}

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 overflow-y-auto px-6 py-6">
        <section className="rounded-lg border border-white/10 p-4">
          <h2 className="text-sm font-semibold text-white/60">Your access</h2>
          <p className="mt-1">
            {membership && roleLabel(membership.role)}
            {membership?.role === 'teacher' && ` — ${scopeSummary(membership.scope)}`}
          </p>
        </section>

        {isAtLeastAdmin && (
          <>
            <section>
              <h2 className="mb-3 text-sm font-semibold text-white/60">Staff</h2>
              <ul className="flex flex-col gap-2">
                {members.map((member) =>
                  editingScopeUid === member.uid ? (
                    <li key={member.uid} className="rounded-lg border border-white/10 px-4 py-3">
                      <p className="mb-2">{member.displayName || member.email}</p>
                      <ScopePicker value={scopeDraft} onChange={setScopeDraft} />
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" onClick={() => saveScope(member.uid)}>
                          Save
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditingScopeUid(null)}>
                          Cancel
                        </Button>
                      </div>
                    </li>
                  ) : (
                    <li
                      key={member.uid}
                      className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3"
                    >
                      <div>
                        <p>{member.displayName || member.email}</p>
                        <p className="text-xs text-white/50">
                          {member.role === 'teacher'
                            ? `Teacher — ${scopeSummary(member.scope)}`
                            : roleLabel(member.role)}
                        </p>
                        {member.classroomGrants && Object.keys(member.classroomGrants).length > 0 && (
                          <ul className="mt-1 flex flex-col gap-0.5">
                            {Object.entries(member.classroomGrants).map(([contextId, level]) => (
                              <li key={contextId} className="flex items-center gap-1 text-xs text-white/40">
                                Classroom {contextId} — {level}
                                <button
                                  type="button"
                                  onClick={() => revokeClassroomGrant(schoolId, member.uid, contextId)}
                                  aria-label={`Revoke access to classroom ${contextId}`}
                                  className="text-white/40 hover:text-red-400"
                                >
                                  <X size={12} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {member.role === 'teacher' && isAtLeastAdmin && (
                          <IconButton
                            label="Edit scope"
                            variant="secondary"
                            onClick={() => startEditingScope(member)}
                          >
                            <Pencil size={14} />
                          </IconButton>
                        )}
                        {canRemove(member.role, member.uid) && (
                          <Button variant="ghost" size="sm" onClick={() => removeMember(schoolId, member.uid)}>
                            Remove
                          </Button>
                        )}
                      </div>
                    </li>
                  ),
                )}
              </ul>
            </section>

            {accessRequests.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-white/60">Access requests</h2>
                <ul className="flex flex-col gap-2">
                  {accessRequests.map((request) => (
                    <li
                      key={request.id}
                      className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3"
                    >
                      <div>
                        <p>
                          {request.requestedByDisplayName} wants {request.targetDisplayName} to have{' '}
                          {request.level} access to {request.contextName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => approveAccessRequest(request, user.uid)}>
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => declineAccessRequest(request.id, user.uid)}
                        >
                          Decline
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

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

            <section className="rounded-lg border border-white/10 p-4">
              <h2 className="mb-3 text-sm font-semibold text-white/60">Invite a teacher</h2>
              <div className="flex flex-col gap-3">
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Email"
                />
                <ScopePicker value={inviteScope} onChange={setInviteScope} />
                <Button onClick={handleInviteTeacher} disabled={inviting}>
                  Send Invite
                </Button>
              </div>
            </section>

            {isSuperAdmin && (
              <section className="rounded-lg border border-white/10 p-4">
                <h2 className="mb-3 text-sm font-semibold text-white/60">
                  Delegate admin access
                </h2>
                <p className="mb-3 text-xs text-white/50">
                  Only a super admin can grant or revoke admin (or super admin) access.
                </p>
                <div className="flex flex-col gap-3">
                  <Input
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="Email"
                    className="text-left"
                  />
                  <div className="flex gap-4 text-left text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={adminRole === 'admin'}
                        onChange={() => setAdminRole('admin')}
                      />
                      Admin
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={adminRole === 'super_admin'}
                        onChange={() => setAdminRole('super_admin')}
                      />
                      Super Admin
                    </label>
                  </div>
                  <Button variant="secondary" onClick={handleInviteAdmin} disabled={invitingAdmin}>
                    Send Invite
                  </Button>
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
