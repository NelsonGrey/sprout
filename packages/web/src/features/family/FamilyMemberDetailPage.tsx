import { useState } from 'react';
import type { User } from 'firebase/auth';
import { Plus } from 'lucide-react';
import { useTransactions } from '../../lib/firestore';
import {
  createFamilyGoal,
  deleteFamilyGoal,
  linkFamilyMemberAccount,
  recordFamilyTransaction,
  unlinkFamilyMemberAccount,
  useFamilyGoals,
  useFamilyMembers,
} from '../../lib/family';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { GoalProgressCard } from '../../components/ui/goal-progress-card';
import { Input } from '../../components/ui/input';
import { SavingsLabelBadge } from '../../components/ui/savings-label-badge';
import { SpendCategoryBadge } from '../../components/ui/spend-category-badge';
import { TransactionComposer } from '../classroom/components/transaction-composer/TransactionComposer';

/** `W-FAMILY-02` — reuses W-CLASS-03's primitives (TransactionComposer,
 * GoalProgressCard, the link-invite pattern) with family language and a
 * narrower capability: no store catalog, no interest mechanic — just
 * earn/spend/save/reflect, goals, and the just-in-case label, per that
 * screen's spec. Mirrors StudentDetailPane closely by design (§9's "reuse
 * ... with family language," not a fork). */
export function FamilyMemberDetailPage({
  user,
  contextId,
  familyMemberId,
}: {
  user: User;
  contextId: string;
  familyMemberId: string;
}) {
  const members = useFamilyMembers(contextId);
  const member = members.find((m) => m.id === familyMemberId);
  const ownerUids = member?.ownerUids ?? [user.uid];

  const transactions = useTransactions(contextId, familyMemberId);
  const goals = useFamilyGoals(familyMemberId);

  const [addingGoal, setAddingGoal] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  const [linkEmail, setLinkEmail] = useState('');
  const [linking, setLinking] = useState(false);

  const handleAddGoal = async () => {
    const trimmedName = goalName.trim();
    const parsedTarget = Number.parseFloat(goalTarget);
    if (!trimmedName || !Number.isFinite(parsedTarget) || parsedTarget <= 0 || savingGoal) return;
    setSavingGoal(true);
    await createFamilyGoal({
      familyMemberId,
      name: trimmedName,
      targetCents: Math.round(parsedTarget * 100),
      createdByUid: user.uid,
    });
    setGoalName('');
    setGoalTarget('');
    setSavingGoal(false);
    setAddingGoal(false);
  };

  const handleSendLinkInvite = async () => {
    const trimmed = linkEmail.trim();
    if (!trimmed || linking) return;
    setLinking(true);
    await linkFamilyMemberAccount({ familyMemberId, email: trimmed, invitedByUid: user.uid });
    setLinkEmail('');
    setLinking(false);
  };

  if (!member) return null;

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader title={member.displayName} backTo={`/app/family/${contextId}`} />
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <p className="text-3xl font-bold">${(member.balanceCents / 100).toFixed(2)}</p>

        <section className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-muted">Goals</h2>
            {!addingGoal && (
              <Button size="sm" variant="secondary" onClick={() => setAddingGoal(true)}>
                <Plus size={14} /> New goal
              </Button>
            )}
          </div>
          {addingGoal && (
            <div className="mb-3 flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
              <Input value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="Goal name" autoFocus />
              <Input
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                placeholder="Target amount"
                inputMode="decimal"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddGoal} disabled={savingGoal}>
                  Add goal
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setAddingGoal(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {goals.length > 0 && (
            <div className="flex flex-col gap-2">
              {goals.map((goal) => (
                <GoalProgressCard key={goal.id} goal={goal} onDelete={() => deleteFamilyGoal(familyMemberId, goal.id)} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-4 rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink-muted">Family account</h2>
          {member.linkedUid ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-brand">Linked — they can sign in and see this on their own</span>
              <Button size="sm" variant="secondary" onClick={() => unlinkFamilyMemberAccount(familyMemberId)}>
                Unlink
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                placeholder="Their email"
                className="flex-1"
              />
              <Button size="sm" onClick={handleSendLinkInvite} disabled={linking}>
                Send link invite
              </Button>
            </div>
          )}
        </section>

        <div className="py-4">
          {transactions.length === 0 ? (
            <p className="text-ink-muted">No transactions yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {transactions.map((transaction) => (
                <li
                  key={transaction.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
                >
                  <span className="flex items-center gap-2">
                    {transaction.reason}
                    {transaction.savingsLabel && <SavingsLabelBadge label={transaction.savingsLabel} />}
                    {transaction.spendCategory && <SpendCategoryBadge category={transaction.spendCategory} />}
                  </span>
                  <span>
                    {transaction.type === 'earn' ? '+' : '-'}${(transaction.amountCents / 100).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <TransactionComposer
          contextId={contextId}
          studentId={familyMemberId}
          ownerUids={ownerUids}
          createdByUid={user.uid}
          goals={goals}
          storeItems={[]}
          onRecord={recordFamilyTransaction}
        />
      </div>
    </div>
  );
}
