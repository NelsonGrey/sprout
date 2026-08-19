import type { Student } from '@sprout/shared';
import { Sprout } from 'lucide-react';
import { useGoals, useTransactions } from '../../lib/firestore';
import { PageHeader } from '../../components/ui/page-header';
import { GoalProgressCard } from '../../components/ui/goal-progress-card';
import { SavingsLabelBadge } from '../../components/ui/savings-label-badge';
import { SpendCategoryBadge } from '../../components/ui/spend-category-badge';

/**
 * A student's own read-only balance, goal progress, and transaction
 * history — no earn/spend controls, no goal create/delete, no navigation
 * elsewhere. This is the entire student-facing experience (BR-1.3.3/1.4.1):
 * sign in with the same real account a teacher would use, land here
 * automatically instead of the staff dashboard (see the landing decision in
 * App.tsx). Goals are set up by staff via StudentDetailPane — a student can
 * see their own trail here but not create or remove one.
 */
export function MyBalancePage({ student }: { student: Student }) {
  const transactions = useTransactions(student.contextId, student.id);
  const goals = useGoals(student.id);

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title={student.contextName ?? 'My Balance'} />

      <div className="px-6 pt-5">
        <div className="flex items-center gap-4 rounded-[26px] bg-ink p-6 text-on-dark shadow-panel">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand">
            <Sprout size={22} />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-on-dark/60">Your balance</p>
            <p className="mt-1 text-4xl font-black tracking-tight">${(student.balanceCents / 100).toFixed(2)}</p>
          </div>
        </div>
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
                  {transaction.type === 'earn' ? '+' : '-'}$
                  {(transaction.amountCents / 100).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
