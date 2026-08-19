import { useState } from 'react';
import type { User } from 'firebase/auth';
import type { SpendCategory, Student, TransactionType } from '@sprout/shared';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  cancelStudentLink,
  createGoal,
  deleteGoal,
  deleteStudent,
  linkStudentAccount,
  recordTransaction,
  splitDisplayName,
  unlinkStudentAccount,
  updateStudent,
  useGoals,
  usePendingStudentLinkForStudent,
  useStoreItems,
  useTransactions,
} from '../../lib/firestore';
import { Button } from '../../components/ui/button';
import { GoalProgressCard } from '../../components/ui/goal-progress-card';
import { IconButton } from '../../components/ui/icon-button';
import { Input } from '../../components/ui/input';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { SavingsLabelBadge } from '../../components/ui/savings-label-badge';
import { SpendCategoryBadge } from '../../components/ui/spend-category-badge';

/**
 * One student's balance, transaction history, and earn/spend form — the
 * right-pane content of ClassroomDetailPage's master-detail layout.
 * `student`/`canManage` are resolved by the caller (which already has the
 * full classroom roster loaded), not re-derived here — see
 * ClassroomDetailPage for how this is embedded.
 */
export function StudentDetailPane({
  user,
  contextId,
  student,
  canManage,
  onDeleted,
}: {
  user: User;
  contextId: string;
  student: Student;
  canManage: boolean;
  onDeleted: () => void;
}) {
  const ownerUids = student.ownerUids ?? [user.uid];

  const transactions = useTransactions(contextId, student.id);
  const goals = useGoals(student.id);
  // The Opportunity Cost Challenge starter lesson's prompt: before a
  // spend, name what's being chosen not to fund yet. Purely a computed
  // reminder from existing goals — no new field written anywhere.
  const unachievedGoals = goals.filter((g) => g.savedCents < g.targetCents);
  const storeItems = useStoreItems(contextId);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  // Encodes the "Save as…" select's value: '' (none), 'just_in_case', or
  // a specific goal's id — see handleRecord for how this splits back out
  // into savingsLabel/goalId.
  const [saveAs, setSaveAs] = useState('');
  const [spendCategory, setSpendCategory] = useState<SpendCategory | ''>('');
  const [recording, setRecording] = useState(false);

  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [addingGoal, setAddingGoal] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  const pendingLink = usePendingStudentLinkForStudent(student.id);
  const [linkEmail, setLinkEmail] = useState('');
  const [linking, setLinking] = useState(false);

  const handleRecord = async (type: TransactionType) => {
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0 || !reason.trim() || recording) return;
    setRecording(true);
    const targetGoal = goals.find((g) => g.id === saveAs);
    await recordTransaction({
      contextId,
      studentId: student.id,
      type,
      amountCents: Math.round(parsed * 100),
      reason: reason.trim(),
      ...(type === 'earn' && targetGoal ? { goalId: targetGoal.id } : {}),
      ...(type === 'earn' && !targetGoal && saveAs === 'just_in_case' ? { savingsLabel: 'just_in_case' as const } : {}),
      ...(type === 'spend' && spendCategory ? { spendCategory } : {}),
      createdByUid: user.uid,
      ownerUids,
      schoolId: student.schoolId,
      gradeLevel: student.gradeLevel,
    });
    setAmount('');
    setReason('');
    setSaveAs('');
    setSpendCategory('');
    setRecording(false);
  };

  const handleAddGoal = async () => {
    const trimmedName = goalName.trim();
    const parsedTarget = Number.parseFloat(goalTarget);
    if (!trimmedName || !Number.isFinite(parsedTarget) || parsedTarget <= 0 || savingGoal) return;
    setSavingGoal(true);
    await createGoal({
      studentId: student.id,
      name: trimmedName,
      targetCents: Math.round(parsedTarget * 100),
      createdByUid: user.uid,
    });
    setGoalName('');
    setGoalTarget('');
    setSavingGoal(false);
    setAddingGoal(false);
  };

  // "Interest Joins the Team" starter lesson — a teacher-run round, not a
  // background process: the class picks a rate together and applies it,
  // so the cause and effect stays visible. Interest is just another earn
  // toward the same goal, reusing recordTransaction's existing goalId
  // path — no new write shape.
  const handleApplyInterest = async (goal: (typeof goals)[number], ratePercent: number) => {
    if (!Number.isFinite(ratePercent) || ratePercent <= 0 || goal.savedCents <= 0) return;
    const interestCents = Math.round(goal.savedCents * (ratePercent / 100));
    if (interestCents <= 0) return;
    await recordTransaction({
      contextId,
      studentId: student.id,
      type: 'earn',
      amountCents: interestCents,
      reason: 'Interest',
      goalId: goal.id,
      createdByUid: user.uid,
      ownerUids,
      schoolId: student.schoolId,
      gradeLevel: student.gradeLevel,
    });
  };

  const startRenaming = () => {
    setNameDraft(student.displayName);
    setRenaming(true);
  };

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (trimmed) {
      const { firstName, lastName } = splitDisplayName(trimmed);
      await updateStudent(student.id, { firstName, lastName });
    }
    setRenaming(false);
  };

  const handleSendLinkInvite = async () => {
    const trimmed = linkEmail.trim();
    if (!trimmed || linking) return;
    setLinking(true);
    await linkStudentAccount({ studentId: student.id, email: trimmed, invitedByUid: user.uid });
    setLinkEmail('');
    setLinking(false);
  };

  return (
    <div className="flex min-h-full flex-col text-ink">
      {renaming ? (
        <header className="flex items-center gap-3 border-b border-border pb-4">
          <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} autoFocus className="flex-1" />
          <Button size="sm" onClick={saveName}>
            Save
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setRenaming(false)}>
            Cancel
          </Button>
        </header>
      ) : (
        <header className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-xl font-bold text-ink">{student.displayName}</h2>
          {canManage && (
            <div className="flex items-center gap-2">
              <IconButton label="Rename student" variant="secondary" onClick={startRenaming}>
                <Pencil size={16} />
              </IconButton>
              <IconButton label="Delete student" variant="secondary" onClick={() => setDeleting(true)}>
                <Trash2 size={16} />
              </IconButton>
            </div>
          )}
        </header>
      )}
      <p className="pt-4 text-3xl font-bold">${(student.balanceCents / 100).toFixed(2)}</p>

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
              <GoalProgressCard
                key={goal.id}
                goal={goal}
                onDelete={() => deleteGoal(student.id, goal.id)}
                onApplyInterest={(ratePercent) => handleApplyInterest(goal, ratePercent)}
              />
            ))}
          </div>
        )}
      </section>

      {canManage && (
        <section className="mt-4 rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink-muted">Student account</h2>
          {student.linkedUid ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-brand">Linked — the student can sign in and see this on their own</span>
              <Button size="sm" variant="secondary" onClick={() => unlinkStudentAccount(student.id)}>
                Unlink
              </Button>
            </div>
          ) : pendingLink ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-muted">Invite sent to {pendingLink.email}</span>
              <Button size="sm" variant="secondary" onClick={() => cancelStudentLink(pendingLink.email)}>
                Cancel invite
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                placeholder="Student's school email"
                className="flex-1"
              />
              <Button size="sm" onClick={handleSendLinkInvite} disabled={linking}>
                Send link invite
              </Button>
            </div>
          )}
        </section>
      )}

      <div className="flex-1 overflow-y-auto py-4">
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
                  {transaction.type === 'earn' ? '+' : '-'}$
                  {(transaction.amountCents / 100).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        {storeItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {storeItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setAmount((item.priceCents / 100).toFixed(2));
                  setReason(item.name);
                }}
                className="rounded-full border border-border-strong bg-surface px-3 py-1.5 text-xs font-semibold text-ink-soft hover:border-brand hover:text-brand"
              >
                {item.name} — ${(item.priceCents / 100).toFixed(2)}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            inputMode="decimal"
            className="flex-1"
          />
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason"
            className="flex-1"
          />
        </div>
        {/* Only meaningful for Earn — recordTransaction drops it for a
         * Spend regardless, but leaving it selectable either way avoids a
         * mode toggle just to show/hide one field. Value is either
         * 'just_in_case' or a specific goal's id (see handleRecord). */}
        <select
          value={saveAs}
          onChange={(e) => setSaveAs(e.target.value)}
          aria-label="Save this earning toward"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink-muted"
        >
          <option value="">Save as… (optional, for Earn)</option>
          <option value="just_in_case">☂️ Just in case</option>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              🎯 {goal.name} — ${(goal.savedCents / 100).toFixed(2)} of ${(goal.targetCents / 100).toFixed(2)}
            </option>
          ))}
        </select>
        {/* Mirror image of the select above — only meaningful for Spend,
         * dropped for an Earn regardless. */}
        <select
          value={spendCategory}
          onChange={(e) => setSpendCategory(e.target.value as SpendCategory | '')}
          aria-label="This purchase is a"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink-muted"
        >
          <option value="">This is a… (optional, for Spend)</option>
          <option value="need">✅ Need</option>
          <option value="want">💖 Want</option>
          <option value="both">🔀 It depends</option>
        </select>
        {unachievedGoals.length > 0 && Number.parseFloat(amount) > 0 && (
          <p className="text-xs text-ink-muted">
            💭 Spending this now means less goes toward:{' '}
            {unachievedGoals.map((g) => g.name).join(', ')}.
          </p>
        )}
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => handleRecord('earn')} disabled={recording}>
            Earn
          </Button>
          <Button className="flex-1" variant="danger" onClick={() => handleRecord('spend')} disabled={recording}>
            Spend
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete this student?"
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          await deleteStudent(student.id);
          onDeleted();
        }}
      />
    </div>
  );
}
