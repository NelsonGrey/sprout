import type { Student } from '@sprout/shared';
import { useGoals } from '../../lib/firestore';
import { PageHeader } from '../../components/ui/page-header';
import { GoalProgressCard } from '../../components/ui/goal-progress-card';
import { SpendDetourPreview } from './SpendDetourPreview';
import { StudentNav } from './StudentNav';

/** `W-STUDENT-02` — every active and achieved goal, read-only (creation
 * stays adult-only via StudentDetailPane — see firestore.rules'
 * hasGoalAccess, which never includes isLinkedStudentSelf). Each
 * unachieved goal gets a spend-detour preview so a student can see how a
 * hypothetical spend would change their trail "without blocking the
 * choice or applying shame" (W-STUDENT-02's own wording). */
export function GoalsPage({ student }: { student: Student }) {
  const goals = useGoals(student.id);

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Goals" backTo="/app/me" />

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {goals.length === 0 ? (
          <p className="text-ink-muted">No goals yet — ask an adult to set one up with you.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {goals.map((goal) => (
              <GoalProgressCard
                key={goal.id}
                goal={goal}
                footer={goal.savedCents < goal.targetCents ? <SpendDetourPreview goal={goal} /> : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <StudentNav />
    </div>
  );
}
