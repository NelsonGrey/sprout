import { useState } from 'react';
import type { User } from 'firebase/auth';
import type { Student, TransactionType } from '@sprout/shared';
import { Pencil, Trash2 } from 'lucide-react';
import {
  cancelStudentLink,
  deleteStudent,
  linkStudentAccount,
  recordTransaction,
  splitDisplayName,
  unlinkStudentAccount,
  updateStudent,
  usePendingStudentLinkForStudent,
  useTransactions,
} from '../../lib/firestore';
import { Button } from '../../components/ui/button';
import { IconButton } from '../../components/ui/icon-button';
import { Input } from '../../components/ui/input';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';

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
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [recording, setRecording] = useState(false);

  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [deleting, setDeleting] = useState(false);

  const pendingLink = usePendingStudentLinkForStudent(student.id);
  const [linkEmail, setLinkEmail] = useState('');
  const [linking, setLinking] = useState(false);

  const handleRecord = async (type: TransactionType) => {
    const parsed = Number.parseFloat(amount);
    if (!Number.isFinite(parsed) || parsed <= 0 || !reason.trim() || recording) return;
    setRecording(true);
    await recordTransaction({
      contextId,
      studentId: student.id,
      type,
      amountCents: Math.round(parsed * 100),
      reason: reason.trim(),
      createdByUid: user.uid,
      ownerUids,
      schoolId: student.schoolId,
      gradeLevel: student.gradeLevel,
    });
    setAmount('');
    setReason('');
    setRecording(false);
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

      <div className="flex flex-col gap-2 border-t border-border pt-4">
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
          await deleteStudent(student.id);
          onDeleted();
        }}
      />
    </div>
  );
}
