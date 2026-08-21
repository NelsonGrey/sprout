import type { Student } from '@sprout/shared';
import { Sparkles, Sprout } from 'lucide-react';
import { useGoals, useTransactions } from '../../lib/firestore';
import { PageHeader } from '../../components/ui/page-header';
import { GoalProgressCard } from '../../components/ui/goal-progress-card';
import { ReadAloudButton } from './ReadAloudButton';

/** The Pre-K–2 presentation — 01_EXPERIENCE_FOUNDATIONS.md §5.2: "Pre-K–2
 * may collapse these into one scrollable Today view with adult-guided
 * cards." Deliberately not the same component as TodayPage with different
 * CSS: no History/Goals/Learn destinations exist here at all (a young
 * reader isn't asked to navigate between them), copy is short sentences
 * paired with icons and an optional read-aloud control per §9's "icon-
 * only meaning is insufficient," and there's no dense transaction table —
 * just the single most recent change. Selected by the student's own
 * roster grade level via isEarlyReaderPresentation(), never a self-
 * reported age — see studentPresentation.ts. */
export function EarlyReaderTodayPage({ student }: { student: Student }) {
  const transactions = useTransactions(student.contextId, student.id);
  const goals = useGoals(student.id);
  const latest = transactions[0];

  const balanceText = `You have ${(student.balanceCents / 100).toFixed(2)} dollars.`;
  const latestText = latest
    ? `You ${latest.type === 'earn' ? 'earned' : 'spent'} ${(latest.amountCents / 100).toFixed(2)} dollars for ${latest.reason}.`
    : undefined;

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title={student.contextName ?? 'Today'} />

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="flex items-center gap-4 rounded-[26px] bg-ink p-6 text-on-dark shadow-panel">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand">
            <Sprout size={26} />
          </span>
          <div className="flex-1" aria-live="polite">
            <p className="text-lg font-bold">{balanceText}</p>
          </div>
          <ReadAloudButton text={balanceText} />
        </div>

        {goals[0] && (
          <div className="pt-4">
            <GoalProgressCard goal={goals[0]} />
          </div>
        )}

        {latest && latestText && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border-strong bg-surface p-4">
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg ${
                latest.type === 'earn' ? 'bg-mint text-brand' : 'bg-accent-soft text-accent'
              }`}
              aria-hidden="true"
            >
              {latest.type === 'earn' ? '+' : '−'}
            </span>
            <p className="flex-1 text-base font-semibold text-ink">{latestText}</p>
            <ReadAloudButton text={latestText} />
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-border-strong bg-surface p-4">
          <div className="flex items-center gap-2 text-sm font-black text-ink">
            <Sparkles size={16} className="text-brand-bright" /> Pause · Choose · Grow
          </div>
          <p className="mt-2 text-sm text-ink-muted">Ask a grown-up: What happened today?</p>
        </div>
      </div>
    </div>
  );
}
