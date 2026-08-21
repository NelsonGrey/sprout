import type { LedgerTransaction } from '@sprout/shared';
import { SavingsLabelBadge } from '../../components/ui/savings-label-badge';
import { SpendCategoryBadge } from '../../components/ui/spend-category-badge';

const TAG_LABEL: Record<string, string> = {
  goal: 'Goal',
  just_in_case: 'Just in case',
  need: 'Need',
  want: 'Want',
  both: 'It depends',
};

/** 01_EXPERIENCE_FOUNDATIONS.md §10: "Screen readers announce simulated
 * context, transaction type, signed amount, reason, date, and goal/
 * category tag" — the visible layout alone (icon color + a $ sign)
 * doesn't convey earn/spend to assistive tech, so callers attach this to
 * whatever accessible element wraps the row (a plain `<li>` on Today's
 * non-interactive list, or a `<button>` on History's expandable one). */
export function transactionAriaLabel(transaction: LedgerTransaction): string {
  const tag = transaction.savingsLabel ?? transaction.spendCategory;
  const verb = transaction.type === 'earn' ? 'Earned' : 'Spent';
  const date = transaction.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const amount = (transaction.amountCents / 100).toFixed(2);
  return `${verb} $${amount}, ${transaction.reason}, ${date}${tag ? `, tagged ${TAG_LABEL[tag]}` : ''}`;
}

/** The row's visual content only — no wrapping element, so callers choose
 * whether it lives in a plain `<li>` (Today) or a `<button>` (History).
 * Hidden from assistive tech since the wrapper carries a single composed
 * `transactionAriaLabel` instead of letting these child text nodes speak
 * for themselves — see that function's doc comment. */
export function TransactionRowContent({ transaction }: { transaction: LedgerTransaction }) {
  const date = transaction.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const amount = (transaction.amountCents / 100).toFixed(2);

  return (
    <div aria-hidden="true" className="flex flex-1 items-center justify-between">
      <span className="flex items-center gap-2">
        <span>
          {transaction.reason}
          {transaction.savingsLabel && <SavingsLabelBadge label={transaction.savingsLabel} />}
          {transaction.spendCategory && <SpendCategoryBadge category={transaction.spendCategory} />}
        </span>
        <span className="text-xs text-ink-muted">{date}</span>
      </span>
      <span className={transaction.type === 'earn' ? 'text-brand' : 'text-danger'}>
        {transaction.type === 'earn' ? '+' : '-'}${amount}
      </span>
    </div>
  );
}
