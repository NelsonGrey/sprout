import { useState } from 'react';
import type { LedgerTransaction, Student } from '@sprout/shared';
import { useTransactions } from '../../lib/firestore';
import { PageHeader } from '../../components/ui/page-header';
import { ReflectionPrompt } from './ReflectionPrompt';
import { StudentNav } from './StudentNav';
import { TransactionRowContent, transactionAriaLabel } from './TransactionRow';

const SPEND_REFLECT_PROMPTS = ['What happened?', 'What would you try next time?'];
const EARN_REFLECT_PROMPTS = ['What did you do to earn this?', 'What might you do with it?'];

function HistoryRow({ transaction }: { transaction: LedgerTransaction }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="flex flex-col rounded-xl border border-border-strong bg-surface shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${transactionAriaLabel(transaction)}. ${open ? 'Hide' : 'Show'} reflection prompt.`}
        className="flex items-center px-4 py-3 text-ink"
      >
        <TransactionRowContent transaction={transaction} />
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3">
          <ReflectionPrompt
            prompts={transaction.type === 'earn' ? EARN_REFLECT_PROMPTS : SPEND_REFLECT_PROMPTS}
            defaultOpen
          />
        </div>
      )}
    </li>
  );
}

/** `W-STUDENT-01`'s "See all history" destination — every past
 * transaction, each expandable into a discussion-only reflection prompt
 * (UC-STU-04: "open transaction/history → see effect... → answer 'What
 * would you try next?' or discuss aloud"). Nothing here is ever written —
 * see ReflectionPrompt's doc comment. */
export function HistoryPage({ student }: { student: Student }) {
  const transactions = useTransactions(student.contextId, student.id);

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="History" backTo="/app/me" />

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {transactions.length === 0 ? (
          <p className="text-ink-muted">No transactions yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {transactions.map((transaction) => (
              <HistoryRow key={transaction.id} transaction={transaction} />
            ))}
          </ul>
        )}
      </div>

      <StudentNav />
    </div>
  );
}
