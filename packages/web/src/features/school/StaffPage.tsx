import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { useClassroomsInSchool } from '../../lib/firestore';
import { getSchool, useMembersOfSchool, useMyMembership, useSchoolIdsForUser } from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { TwoPaneLayout } from '../../components/layout/TwoPaneLayout';
import { GRADE_OPTIONS, roleLabel, scopeSummary } from './shared';
import { StaffDetailPane } from './StaffDetailPane';

/** Master-detail staff roster: every school member on the left, the
 * selected member's scope/classroom-grants/remove controls on the right —
 * split out of the former all-in-one SchoolAdminPage. */
export function StaffPage({ user, selectedUid }: { user: User; selectedUid?: string }) {
  const [, navigate] = useLocation();
  const schoolIds = useSchoolIdsForUser(user.uid);
  const schoolId = schoolIds[0];
  const membership = useMyMembership(schoolId, user.uid);
  const isAtLeastAdmin = membership?.role === 'admin' || membership?.role === 'super_admin';
  const isSuperAdmin = membership?.role === 'super_admin';
  const members = useMembersOfSchool(schoolId);
  const superAdminCount = members.filter((m) => m.role === 'super_admin').length;
  const schoolClassrooms = useClassroomsInSchool(schoolId);

  const [schoolEnabledGrades, setSchoolEnabledGrades] = useState<string[] | undefined>(undefined);
  useEffect(() => {
    if (!schoolId) return;
    getSchool(schoolId).then((school) => setSchoolEnabledGrades(school?.enabledGrades));
  }, [schoolId]);
  const activeGrades = schoolEnabledGrades ?? GRADE_OPTIONS;

  const [selected, setSelected] = useState<string | null>(selectedUid ?? null);

  if (!isAtLeastAdmin) {
    return (
      <div className="flex min-h-full flex-col text-ink">
        <PageHeader title="Staff" backTo="/app/school" />
        <p className="px-6 py-4 text-ink-muted">Only school admins can manage staff.</p>
      </div>
    );
  }

  const canRemove = (member: { role: string; uid: string }): boolean => {
    if (member.uid === user.uid) return false;
    if (member.role === 'teacher') return isAtLeastAdmin;
    if (member.role === 'admin') return isSuperAdmin;
    return isSuperAdmin && superAdminCount > 1;
  };

  const selectedMember = members.find((m) => m.uid === selected);

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader
        title="Staff"
        backTo="/app/school"
        actions={<Button onClick={() => navigate('/app/school/staff/new')}>Add Staff</Button>}
      />
      <TwoPaneLayout
        left={
          <ul className="flex flex-col gap-2">
            {members.map((member) => (
              <li key={member.uid}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(member.uid);
                    navigate(`/app/school/staff/${member.uid}`);
                  }}
                  className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-left hover:bg-bg"
                >
                  <p>{member.displayName || member.email}</p>
                  <p className="text-xs text-ink-muted">
                    {member.role === 'teacher' ? `Teacher — ${scopeSummary(member.scope)}` : roleLabel(member.role)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        }
        right={
          selectedMember ? (
            <StaffDetailPane
              schoolId={schoolId}
              member={selectedMember}
              gradeOptions={activeGrades}
              canEditScope={selectedMember.role === 'teacher' && isAtLeastAdmin}
              canRemove={canRemove(selectedMember)}
              schoolClassrooms={schoolClassrooms}
              allMembers={members}
              onRemoved={() => {
                setSelected(null);
                navigate('/app/school/staff');
              }}
            />
          ) : (
            <p className="text-ink-muted">Select a staff member to view details.</p>
          )
        }
      />
    </div>
  );
}
