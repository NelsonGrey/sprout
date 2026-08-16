import { useState } from 'react';
import type { User } from 'firebase/auth';
import type { TransactionType } from '@sprout/shared';
import { recordTransaction, useStudents, useTransactions } from '../../lib/firestore';

/**
 * A single student's balance and transaction history, with an inline
 * earn/spend form. Sharing this page with the student on the family/shared
 * device is this slice's stand-in for a separate student login.
 */
export function StudentLedgerPage({
  user,
  contextId,
  studentId,
}: {
  user: User;
  contextId: string;
  studentId: string;
}) {
  const students = useStudents(contextId);
  const student = students.find((s) => s.id === studentId);
  const ownerUids = student?.ownerUids ?? [user.uid];

  const transactions = useTransactions(contextId, studentId);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [recording, setRecording] = useState(false);

  const handleRecord = async (type: TransactionType) => {
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0 || !reason.trim() || recording) return;
    setRecording(true);
    await recordTransaction({
      contextId,
      studentId,
      type,
      amountCents: Math.round(parsed * 100),
      reason: reason.trim(),
      createdByUid: user.uid,
      ownerUids,
    });
    setAmount('');
    setReason('');
    setRecording(false);
  };

  return (
    <main className="flex min-h-screen flex-col bg-neutral-950 text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <h1 className="text-xl font-bold">{student?.displayName ?? 'Student'}</h1>
        <p className="mt-2 text-3xl font-bold">${((student?.balanceCents ?? 0) / 100).toFixed(2)}</p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {transactions.length === 0 ? (
          <p className="text-white/60">No transactions yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {transactions.map((transaction) => (
              <li
                key={transaction.id}
                className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-3"
              >
                <span>{transaction.reason}</span>
                <span>
                  {transaction.type === 'earn' ? '+' : '-'}$
                  {(transaction.amountCents / 100).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-white/10 px-6 py-4">
        <div className="flex gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            inputMode="decimal"
            className="flex-1 rounded-lg border border-white/20 bg-transparent px-3 py-2"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason"
            className="flex-1 rounded-lg border border-white/20 bg-transparent px-3 py-2"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleRecord('earn')}
            disabled={recording}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-medium hover:bg-green-700 disabled:opacity-50"
          >
            Earn
          </button>
          <button
            type="button"
            onClick={() => handleRecord('spend')}
            disabled={recording}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium hover:bg-red-700 disabled:opacity-50"
          >
            Spend
          </button>
        </div>
      </div>
    </main>
  );
}
