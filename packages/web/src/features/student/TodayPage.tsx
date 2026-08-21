import type { Student } from '@sprout/shared';
import { Sprout } from 'lucide-react';
import { Link } from 'wouter';
import { useGoals, useTransactions } from '../../lib/firestore';
import { PageHeader } from '../../components/ui/page-header';
import { GoalProgressCard } from '../../components/ui/goal-progress-card';
import { ReflectionPrompt } from './ReflectionPrompt';
import { StudentNav } from './StudentNav';
import { TransactionRowContent, transactionAriaLabel } from './TransactionRow';

/** `W-STUDENT-01` — the student-only "Today" home: balance, one current
 * goal, the last three transactions, a neutral reflection prompt, and a
 * link into the full history. Read-only throughout — no earn/spend
 * controls, no goal create/delete (see firestore.rules: a student can
 * never write a goal or transaction, only staff/award-scoped adults can).
 * Reframed out of the old flat MyBalancePage in Slice 4 — see
 * 05_IMPLEMENTATION_HANDOFF.md's Slice 4 step 1. */
export function TodayPage({ student }: { student: Student }) {
  const transactions = useTransactions(student.contextId, student.id);
  const goals = useGoals(student.id);
  const currentGoal = goals[0];
  const recentTransactions = transactions.slice(0, 3);

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title={student.contextName ?? 'Today'} />

      <div className="flex-1 overflow-y-auto px-6 pt-5">
        <div className="flex items-center gap-4 rounded-[26px] bg-ink p-6 text-on-dark shadow-panel">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand">
            <Sprout size={22} />
          </span>
          <div aria-live="polite">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-on-dark/60">Your Sprout balance</p>
            <p className="mt-1 text-4xl font-black tracking-tight">${(student.balanceCents / 100).toFixed(2)}</p>
            <p className="mt-1 text-xs text-on-dark/60">Practice money—not real money.</p>
          </div>
        </div>

        {currentGoal && (
          <div className="pt-4">
            <GoalProgressCard goal={currentGoal} />
          </div>
        )}

        <div className="pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-ink">Recent</h2>
            <Link href="/app/me/history" className="text-sm font-bold text-brand">
              See all history
            </Link>
          </div>
          {recentTransactions.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">No transactions yet.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {recentTransactions.map((transaction) => (
                <li
                  key={transaction.id}
                  aria-label={transactionAriaLabel(transaction)}
                  className="flex rounded-xl border border-border-strong bg-surface px-4 py-3 text-ink shadow-card"
                >
                  <TransactionRowContent transaction={transaction} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="py-4">
          <ReflectionPrompt prompts={['What happened today?', 'What might you try next?']} />
        </div>
      </div>

      <StudentNav />
    </div>
  );
}
