import type { Student } from '@sprout/shared';
import { useTransactions } from '../../lib/firestore';
import { PageHeader } from '../../components/ui/page-header';

/**
 * A student's own read-only balance and transaction history — no earn/spend
 * controls, no navigation elsewhere. This is the entire student-facing
 * experience (BR-1.3.3/1.4.1): sign in with the same real account a teacher
 * would use, land here automatically instead of "My Classrooms" (see the
 * landing decision in App.tsx).
 */
export function MyBalancePage({ student }: { student: Student }) {
  const transactions = useTransactions(student.contextId, student.id);

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title={student.contextName ?? 'My Balance'} />
      <p className="px-6 pt-4 text-3xl font-bold text-ink">${(student.balanceCents / 100).toFixed(2)}</p>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {transactions.length === 0 ? (
          <p className="text-ink-muted">No transactions yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {transactions.map((transaction) => (
              <li
                key={transaction.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-ink"
              >
                <span>{transaction.reason}</span>
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
