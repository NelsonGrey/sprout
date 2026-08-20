import type { SpendCategory } from '@sprout/shared';
import { firebaseClient } from './firebase';

export interface BulkTransactionOutcome {
  succeeded: string[];
  failed: { studentId: string; error: string }[];
}

/** Calls the sprout-functions `api` Cloud Function's group/mass transaction
 * endpoint (see sprout-functions/src/api/bulkTransactions.ts) — the
 * production write contract Slice 2 step 5 requires before group
 * transactions can ship: a client-generated idempotencyKey means a retried
 * request can never double-credit a student, and the server re-checks
 * award authorization itself rather than trusting the client. Never call
 * recordTransaction directly in a loop for a group action — that has
 * neither property. */
export async function recordBulkTransaction({
  contextId,
  idempotencyKey,
  type,
  amountCentsEach,
  reason,
  recipientStudentIds,
  savingsLabel,
  spendCategory,
}: {
  contextId: string;
  idempotencyKey: string;
  type: 'earn' | 'spend';
  amountCentsEach: number;
  reason: string;
  recipientStudentIds: string[];
  savingsLabel?: 'just_in_case';
  spendCategory?: SpendCategory;
}): Promise<BulkTransactionOutcome> {
  const user = firebaseClient.auth.currentUser;
  if (!user) throw new Error('Not signed in');
  const token = await user.getIdToken();

  const response = await fetch(`/api/classrooms/${contextId}/transactions/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      idempotencyKey,
      type,
      amountCentsEach,
      reason,
      recipientStudentIds,
      ...(savingsLabel ? { savingsLabel } : {}),
      ...(spendCategory ? { spendCategory } : {}),
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `Request failed with status ${response.status}`);
  }
  return data as BulkTransactionOutcome;
}
