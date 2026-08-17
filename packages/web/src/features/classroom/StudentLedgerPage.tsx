import { useState } from 'react';
import type { User } from 'firebase/auth';
import type { TransactionType } from '@sprout/shared';
import { useLocation } from 'wouter';
import { Pencil, Trash2 } from 'lucide-react';
import { deleteStudent, recordTransaction, updateStudent, useStudents, useTransactions } from '../../lib/firestore';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { IconButton } from '../../components/ui/icon-button';
import { Input } from '../../components/ui/input';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';

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
  const [, navigate] = useLocation();
  const students = useStudents(contextId);
  const student = students.find((s) => s.id === studentId);
  const ownerUids = student?.ownerUids ?? [user.uid];

  const transactions = useTransactions(contextId, studentId);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [recording, setRecording] = useState(false);

  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [deleting, setDeleting] = useState(false);

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
      schoolId: student?.schoolId,
      gradeLevel: student?.gradeLevel,
    });
    setAmount('');
    setReason('');
    setRecording(false);
  };

  const startRenaming = () => {
    setNameDraft(student?.displayName ?? '');
    setRenaming(true);
  };

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (trimmed) await updateStudent(studentId, { displayName: trimmed });
    setRenaming(false);
  };

  return (
    <main className="flex min-h-screen flex-col bg-neutral-950 text-white">
      {renaming ? (
        <header className="flex items-center gap-3 border-b border-white/10 px-6 py-4">
          <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} autoFocus className="flex-1" />
          <Button size="sm" onClick={saveName}>
            Save
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setRenaming(false)}>
            Cancel
          </Button>
        </header>
      ) : (
        <PageHeader
          title={student?.displayName ?? 'Student'}
          backTo={`/classrooms/${contextId}`}
          actions={
            <>
              <IconButton label="Rename student" variant="secondary" onClick={startRenaming}>
                <Pencil size={16} />
              </IconButton>
              <IconButton label="Delete student" variant="secondary" onClick={() => setDeleting(true)}>
                <Trash2 size={16} />
              </IconButton>
            </>
          }
        />
      )}
      <p className="px-6 pt-4 text-3xl font-bold">${((student?.balanceCents ?? 0) / 100).toFixed(2)}</p>

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
          await deleteStudent(studentId);
          navigate(`/classrooms/${contextId}`);
        }}
      />
    </main>
  );
}
