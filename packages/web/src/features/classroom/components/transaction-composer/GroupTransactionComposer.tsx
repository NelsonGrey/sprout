import { useState } from 'react';
import type { SpendCategory, Student, TransactionType } from '@sprout/shared';
import { recordBulkTransaction, type BulkTransactionOutcome } from '../../../../lib/api';
import { useOnlineStatus } from '../../../../lib/useOnlineStatus';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { OfflineNotice } from '../../../../components/ui/offline-notice';

/**
 * The group/mass transaction composer (`C-TRANSACTION-COMPOSER`, group
 * mode) — W-CLASS-02's multi-recipient path. Recipient selection itself
 * lives in the caller (checkbox selection on the roster list); this only
 * covers action/tags/review/submit, calling the sprout-functions bulk
 * endpoint (see lib/api.ts) rather than looping recordTransaction client-
 * side, which has neither the idempotency nor the server-rechecked
 * authorization a retry-safe group write requires.
 *
 * No per-recipient goalId — each student's goals differ, so a single
 * shared goal selection across a group has no coherent meaning (mirrors
 * the same constraint in bulkTransactions.ts and the single-recipient
 * TransactionComposer's "Save as" field). No createdByUid prop, unlike the
 * single composer: the bulk endpoint derives the actor from the verified
 * ID token server-side rather than trusting a client-supplied field.
 */
export function GroupTransactionComposer({
  contextId,
  students,
  onDone,
}: {
  contextId: string;
  students: Student[];
  onDone: () => void;
}) {
  // Stable for the composer's whole lifetime, including a "retry failed
  // only" — reusing the same key keeps every attempt (initial + retries)
  // one idempotent operation rather than risking a fresh key re-crediting
  // a recipient a second attempt already succeeded for.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [type, setType] = useState<TransactionType>('earn');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [savingsLabel, setSavingsLabel] = useState<'' | 'just_in_case'>('');
  const [spendCategory, setSpendCategory] = useState<SpendCategory | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkTransactionOutcome | null>(null);
  const [submitError, setSubmitError] = useState('');
  const online = useOnlineStatus();

  const parsedAmount = Number.parseFloat(amount);
  const amountCents = Math.round(parsedAmount * 100);
  const validAmount = Number.isFinite(parsedAmount) && amountCents > 0;
  const canSubmit = validAmount && reason.trim().length > 0 && !submitting && online;

  const recipientStudentIds = students.map((s) => s.id);
  const studentName = (id: string) => students.find((s) => s.id === id)?.displayName ?? id;

  const submit = async (targetStudentIds: string[]) => {
    if (submitting || !online) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const outcome = await recordBulkTransaction({
        contextId,
        idempotencyKey,
        type,
        amountCentsEach: amountCents,
        reason: reason.trim(),
        recipientStudentIds: targetStudentIds,
        ...(type === 'earn' && savingsLabel ? { savingsLabel } : {}),
        ...(type === 'spend' && spendCategory ? { spendCategory } : {}),
      });
      setResult((prev) =>
        prev
          ? { succeeded: [...prev.succeeded, ...outcome.succeeded], failed: outcome.failed }
          : outcome,
      );
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  if (result) {
    return (
      <div className="flex flex-col gap-3">
        <p className={result.failed.length > 0 ? 'text-warning' : 'text-brand'}>
          {result.succeeded.length} of {result.succeeded.length + result.failed.length} recorded
          {result.failed.length > 0 ? `, ${result.failed.length} failed` : ''}.
        </p>
        {result.failed.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm text-ink-muted">
            {result.failed.map((f) => (
              <li key={f.studentId}>
                {studentName(f.studentId)}: {f.error}
              </li>
            ))}
          </ul>
        )}
        {submitError && <p className="text-sm text-danger">{submitError}</p>}
        {!online && result.failed.length > 0 && <OfflineNotice />}
        <div className="flex gap-2">
          {result.failed.length > 0 && (
            <Button onClick={() => submit(result.failed.map((f) => f.studentId))} disabled={submitting || !online}>
              {submitting ? 'Retrying…' : 'Retry failed only'}
            </Button>
          )}
          <Button variant="secondary" onClick={onDone}>
            Return to classroom
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-semibold text-ink">
        {students.length} student{students.length === 1 ? '' : 's'} selected
      </p>
      <ul className="flex flex-wrap gap-1 text-xs text-ink-muted">
        {students.map((s) => (
          <li key={s.id} className="rounded-full bg-bg px-2 py-1">
            {s.displayName}
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Button variant={type === 'earn' ? 'primary' : 'secondary'} className="flex-1" onClick={() => setType('earn')}>
          Earn
        </Button>
        <Button variant={type === 'spend' ? 'primary' : 'secondary'} className="flex-1" onClick={() => setType('spend')}>
          Spend
        </Button>
      </div>

      <Input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount for each student"
        inputMode="decimal"
      />
      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" />

      {type === 'earn' && (
        <select
          value={savingsLabel}
          onChange={(e) => setSavingsLabel(e.target.value as '' | 'just_in_case')}
          aria-label="Save this earning toward"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink-muted"
        >
          <option value="">No label</option>
          <option value="just_in_case">☂️ Just in case</option>
        </select>
      )}
      {type === 'spend' && (
        <select
          value={spendCategory}
          onChange={(e) => setSpendCategory(e.target.value as SpendCategory | '')}
          aria-label="This purchase is a"
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink-muted"
        >
          <option value="">No label</option>
          <option value="need">✅ Need</option>
          <option value="want">💖 Want</option>
          <option value="both">🔀 It depends</option>
        </select>
      )}

      {validAmount && (
        <div className="rounded-lg border border-border bg-bg p-3 text-sm">
          <p className="mb-1 font-semibold text-ink-muted">
            {students.length} student{students.length === 1 ? '' : 's'} × ${(amountCents / 100).toFixed(2)} each
          </p>
          <ul className="flex flex-col gap-0.5 text-ink-muted">
            {students.map((s) => {
              const newBalance = (s.balanceCents + (type === 'earn' ? amountCents : -amountCents)) / 100;
              return (
                <li key={s.id} className="flex justify-between">
                  <span>{s.displayName}</span>
                  <span>
                    ${(s.balanceCents / 100).toFixed(2)} → ${newBalance.toFixed(2)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {submitError && <p className="text-sm text-danger">{submitError}</p>}
      {!online && <OfflineNotice />}

      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => submit(recipientStudentIds)} disabled={!canSubmit}>
          {submitting ? 'Recording…' : `Record ${students.length} transaction${students.length === 1 ? '' : 's'}`}
        </Button>
        <Button variant="secondary" onClick={onDone} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
