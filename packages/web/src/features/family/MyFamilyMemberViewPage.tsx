import type { User } from 'firebase/auth';
import type { FamilyMember } from '@sprout/shared';
import { useTransactions } from '../../lib/firestore';
import { useFamilyGoals, useLinkedFamilyMember } from '../../lib/family';
import { PageHeader } from '../../components/ui/page-header';
import { GoalProgressCard } from '../../components/ui/goal-progress-card';
import { SavingsLabelBadge } from '../../components/ui/savings-label-badge';
import { SpendCategoryBadge } from '../../components/ui/spend-category-badge';

/** The real content, split out from MyFamilyMemberViewPage so
 * useTransactions/useFamilyGoals only ever fire with a real, resolved
 * member — never a `member?.contextId ?? ''` placeholder while the linked
 * lookup is still loading. Mirrors MyStudentViewPage/TodayPage's identical
 * split for the same reason (an empty-string contextId collapses the
 * Firestore path and throws, not just returns no data). */
function LinkedFamilyMemberView({ member }: { member: FamilyMember }) {
  const transactions = useTransactions(member.contextId, member.id);
  const goals = useFamilyGoals(member.id);

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title={member.displayName} />
      <div className="px-6 pt-5">
        <p className="text-4xl font-black tracking-tight">${(member.balanceCents / 100).toFixed(2)}</p>
      </div>

      {goals.length > 0 && (
        <div className="flex flex-col gap-2 px-6 pt-4">
          {goals.map((goal) => (
            <GoalProgressCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {transactions.length === 0 ? (
          <p className="text-ink-muted">No transactions yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {transactions.map((transaction) => (
              <li
                key={transaction.id}
                className="flex items-center justify-between rounded-xl border border-border-strong bg-surface px-4 py-3 text-ink shadow-card"
              >
                <span className="flex items-center gap-2">
                  {transaction.reason}
                  {transaction.savingsLabel && <SavingsLabelBadge label={transaction.savingsLabel} />}
                  {transaction.spendCategory && <SpendCategoryBadge category={transaction.spendCategory} />}
                </span>
                <span className={transaction.type === 'earn' ? 'text-brand' : 'text-danger'}>
                  {transaction.type === 'earn' ? '+' : '-'}${(transaction.amountCents / 100).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** `/app/family/me` — a linked family member's own read-only view: their
 * balance, goals, and history, nothing else. No earn/spend/goal controls —
 * only a family manager can write those (firestore.rules never grants a
 * linked family member write access). Mirrors the pre-Slice-4 MyBalancePage
 * shape; family mode doesn't call for the full Today/History/Goals split
 * W-STUDENT-01/02 defined for school. */
export function MyFamilyMemberViewPage({ user }: { user: User }) {
  const member = useLinkedFamilyMember(user.uid);

  if (member === undefined) return null;

  if (member === null) {
    return (
      <div className="flex min-h-full flex-col">
        <PageHeader title="My family view" />
        <div className="px-6 py-6">
          <p className="text-sm text-ink-muted">This account isn't linked to a family record.</p>
        </div>
      </div>
    );
  }

  return <LinkedFamilyMemberView member={member} />;
}
