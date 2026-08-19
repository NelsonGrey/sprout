import { useState } from 'react';
import { X } from 'lucide-react';
import type { ClassroomContext, MemberScope, SchoolMember } from '@sprout/shared';
import { assignClassroomOwner } from '../../lib/firestore';
import { removeMember, revokeClassroomGrant, updateMemberScope } from '../../lib/school';
import { Button } from '../../components/ui/button';
import { roleLabel, scopeSummary } from './shared';
import { ScopePicker } from './ScopePicker';

/** One staff member's detail — the right-pane content of StaffPage's
 * master-detail layout: role/scope, assigned classrooms, classroom grants
 * with revoke, and remove. `canEditScope`/`canRemove` are pre-computed by
 * the caller (StaffPage), which already has the full member list needed
 * for the hierarchy rules (only a super_admin can remove another
 * super_admin or an admin; a school is never left without one).
 * `canEditScope` also gates the assigned-classrooms section — assignment
 * is a teacher-only concept, same as scope. */
export function StaffDetailPane({
  schoolId,
  member,
  gradeOptions,
  canEditScope,
  canRemove,
  schoolClassrooms,
  allMembers,
  onRemoved,
}: {
  schoolId: string;
  member: SchoolMember;
  gradeOptions: string[];
  canEditScope: boolean;
  canRemove: boolean;
  schoolClassrooms: ClassroomContext[];
  allMembers: SchoolMember[];
  onRemoved: () => void;
}) {
  const [editingScope, setEditingScope] = useState(false);
  const [scopeDraft, setScopeDraft] = useState<MemberScope>(member.scope ?? { type: 'own' });

  const startEditingScope = () => {
    setScopeDraft(member.scope ?? { type: 'own' });
    setEditingScope(true);
  };

  const saveScope = async () => {
    await updateMemberScope(schoolId, member.uid, scopeDraft);
    setEditingScope(false);
  };

  const handleRemove = async () => {
    await removeMember(schoolId, member.uid);
    onRemoved();
  };

  const classroomName = (contextId: string) =>
    schoolClassrooms.find((c) => c.id === contextId)?.name ?? `Classroom ${contextId}`;

  const assignedClassrooms = schoolClassrooms.filter((c) => c.ownerUids.includes(member.uid));
  const assignableClassrooms = schoolClassrooms.filter((c) => !c.ownerUids.includes(member.uid));

  const classroomStatus = (classroom: ClassroomContext) => {
    const currentOwnerUid = classroom.ownerUids[0];
    if (!currentOwnerUid) return 'unassigned';
    const owner = allMembers.find((m) => m.uid === currentOwnerUid);
    return owner ? `currently ${owner.displayName || owner.email}` : 'unassigned';
  };

  const handleUnassign = (contextId: string) => assignClassroomOwner(contextId, null);

  const handleAssign = (contextId: string) => {
    if (contextId) assignClassroomOwner(contextId, member.uid);
  };

  return (
    <div className="flex flex-col gap-4 text-ink">
      <header className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold">{member.displayName || member.email}</h2>
          <p className="text-xs text-ink-muted">
            {member.role === 'teacher' ? `Teacher — ${scopeSummary(member.scope)}` : roleLabel(member.role)}
          </p>
        </div>
        {canRemove && (
          <Button variant="ghost" size="sm" onClick={handleRemove}>
            Remove
          </Button>
        )}
      </header>

      {canEditScope && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink-muted">Assigned Classrooms</h3>
          {assignedClassrooms.length > 0 ? (
            <ul className="mb-2 flex flex-col gap-1">
              {assignedClassrooms.map((classroom) => (
                <li key={classroom.id} className="flex items-center gap-1 text-sm text-ink-muted">
                  {classroom.name}
                  <button
                    type="button"
                    onClick={() => handleUnassign(classroom.id)}
                    aria-label={`Unassign ${classroom.name}`}
                    className="text-ink-muted hover:text-danger"
                  >
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-2 text-sm text-ink-muted">No classrooms assigned.</p>
          )}
          {assignableClassrooms.length > 0 && (
            <select
              value=""
              onChange={(e) => handleAssign(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
            >
              <option value="">Assign a classroom…</option>
              {assignableClassrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name} — {classroomStatus(classroom)}
                </option>
              ))}
            </select>
          )}
        </section>
      )}

      {member.classroomGrants && Object.keys(member.classroomGrants).length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink-muted">Classroom grants</h3>
          <ul className="flex flex-col gap-1">
            {Object.entries(member.classroomGrants).map(([contextId, level]) => (
              <li key={contextId} className="flex items-center gap-1 text-sm text-ink-muted">
                {classroomName(contextId)} — {level}
                <button
                  type="button"
                  onClick={() => revokeClassroomGrant(schoolId, member.uid, contextId)}
                  aria-label={`Revoke access to classroom ${contextId}`}
                  className="text-ink-muted hover:text-danger"
                >
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canEditScope && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink-muted">Scope</h3>
          {editingScope ? (
            <div className="flex flex-col gap-3">
              <ScopePicker value={scopeDraft} onChange={setScopeDraft} gradeOptions={gradeOptions} />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveScope}>
                  Save
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditingScope(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={startEditingScope}>
              Edit scope
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
