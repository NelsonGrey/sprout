import { useState } from 'react';
import type { Goal, SpendCategory, StoreItem } from '@sprout/shared';
import { recordTransaction } from '../../../../lib/firestore';
import { useOnlineStatus } from '../../../../lib/useOnlineStatus';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { OfflineNotice } from '../../../../components/ui/offline-notice';

/**
 * The single-recipient earn/spend composer (`C-TRANSACTION-COMPOSER`,
 * compact mode) — extracted from StudentDetailPane so a future group/mass
 * composer (Slice 2 step 4) can reuse the same amount/reason/tag fields
 * and write semantics without duplicating them. Owns its own draft state
 * and calls recordTransaction directly; the caller only supplies the
 * target and the goal/store context needed to render the optional tags.
 * Write semantics are unchanged from the pre-extraction StudentDetailPane.
 */
export function TransactionComposer({
  contextId,
  studentId,
  ownerUids,
  schoolId,
  gradeLevel,
  createdByUid,
  goals,
  storeItems,
}: {
  contextId: string;
  studentId: string;
  ownerUids: string[];
  schoolId?: string;
  gradeLevel?: string;
  createdByUid: string;
  goals: Goal[];
  storeItems: StoreItem[];
}) {
  // The Opportunity Cost Challenge starter lesson's prompt: before a
  // spend, name what's being chosen not to fund yet. Purely a computed
  // reminder from existing goals — no new field written anywhere.
  const unachievedGoals = goals.filter((g) => g.savedCents < g.targetCents);

  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  // Encodes the "Save as…" select's value: '' (none), 'just_in_case', or
  // a specific goal's id — see handleRecord for how this splits back out
  // into savingsLabel/goalId.
  const [saveAs, setSaveAs] = useState('');
  const [spendCategory, setSpendCategory] = useState<SpendCategory | ''>('');
  const [recording, setRecording] = useState(false);
  const online = useOnlineStatus();

  const handleRecord = async (type: 'earn' | 'spend') => {
    const parsed = Number.parseFloat(amount);
    if (!online || !Number.isFinite(parsed) || parsed <= 0 || !reason.trim() || recording) return;
    setRecording(true);
    const targetGoal = goals.find((g) => g.id === saveAs);
    await recordTransaction({
      contextId,
      studentId,
      type,
      amountCents: Math.round(parsed * 100),
      reason: reason.trim(),
      ...(type === 'earn' && targetGoal ? { goalId: targetGoal.id } : {}),
      ...(type === 'earn' && !targetGoal && saveAs === 'just_in_case' ? { savingsLabel: 'just_in_case' as const } : {}),
      ...(type === 'spend' && spendCategory ? { spendCategory } : {}),
      createdByUid,
      ownerUids,
      schoolId,
      gradeLevel,
    });
    setAmount('');
    setReason('');
    setSaveAs('');
    setSpendCategory('');
    setRecording(false);
  };

  return (
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
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="flex-1" />
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
          💭 Spending this now means less goes toward: {unachievedGoals.map((g) => g.name).join(', ')}.
        </p>
      )}
      {!online && <OfflineNotice />}
      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => handleRecord('earn')} disabled={recording || !online}>
          Earn
        </Button>
        <Button className="flex-1" variant="danger" onClick={() => handleRecord('spend')} disabled={recording || !online}>
          Spend
        </Button>
      </div>
    </div>
  );
}
