import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { addStudent, splitDisplayName, useClassrooms, useClassroomsInSchool } from '../../lib/firestore';
import { useMyMembership, useSchoolIdsForUser } from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

/** Top-level "Add Student" — reached from the dashboard, next to "Add
 * Classroom", so staff can enroll a student without first drilling into a
 * specific classroom's Roster page (which still has its own,
 * classroom-scoped add-student flow for the in-context case). Offers only
 * classrooms the viewer can actually add students to: every classroom in
 * their school if they're an admin, or their own schoolless classrooms
 * otherwise — a school-affiliated classroom's roster is school-staff-only
 * (see canManageClassroom in firestore.rules). */
export function AddStudentPage({ user }: { user: User }) {
  const [, navigate] = useLocation();
  const schoolIds = useSchoolIdsForUser(user.uid);
  const schoolId = schoolIds[0];
  const membership = useMyMembership(schoolId, user.uid);
  const isAtLeastAdmin = membership?.role === 'admin' || membership?.role === 'super_admin';

  const ownClassrooms = useClassrooms(user.uid);
  const schoolClassrooms = useClassroomsInSchool(isAtLeastAdmin ? schoolId : undefined);
  const classrooms = isAtLeastAdmin ? schoolClassrooms : ownClassrooms.filter((c) => c.schoolId == null);

  const [contextId, setContextId] = useState('');
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const classroom = classrooms.find((c) => c.id === contextId);

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed || !classroom || adding) return;
    setAdding(true);
    const { firstName, lastName } = splitDisplayName(trimmed);
    await addStudent({
      contextId: classroom.id,
      firstName,
      lastName,
      ownerUids: classroom.ownerUids,
      schoolId: classroom.schoolId,
      gradeLevel: classroom.gradeLevel,
      contextName: classroom.name,
    });
    navigate('/app');
  };

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader
        title="Add Student"
        breadcrumbs={[{ label: 'Home', href: '/app' }, { label: 'Add Student', href: '/app/students/new' }]}
      />
      <div className="flex max-w-md flex-col gap-3 px-6 py-4">
        {classrooms.length === 0 ? (
          <p className="text-ink-muted">No classrooms you can add a student to yet — create a classroom first.</p>
        ) : (
          <>
            <select
              value={contextId}
              onChange={(e) => setContextId(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-ink"
            >
              <option value="">Choose a classroom…</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Student name" />
            <Button className="self-start" onClick={handleAdd} disabled={!contextId || !name.trim() || adding}>
              Create
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
