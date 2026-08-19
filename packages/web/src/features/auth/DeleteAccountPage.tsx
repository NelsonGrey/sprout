import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from 'firebase/auth';
import { useLocation } from 'wouter';
import { deleteMyAccount, getAccountDeletionSummary, type AccountDeletionSummary } from '../../lib/account';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { roleLabel } from '../school/shared';

function friendlyDeleteError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/popup-closed-by-user':
      return 'Verification was cancelled.';
    case 'auth/requires-recent-login':
      return 'Please verify your identity again and retry.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

/** Self-service account deletion, required for Apple/Google app store
 * compliance (any app that supports account creation must offer in-app
 * deletion). Leaving a school only unassigns any classroom(s) that member
 * owned there — an admin can reassign them; a personal (non-school)
 * classroom the user solely owns is permanently destroyed along with its
 * students, since firestore.rules gives standalone classrooms no admin
 * escape hatch and they'd otherwise be orphaned forever. See
 * lib/account.ts's deleteMyAccount for the exact cleanup order and the
 * reasoning behind what's deliberately left untouched (a linked student's
 * stale linkedUid, a destroyed classroom's transaction history). */
export function DeleteAccountPage({ user }: { user: User }) {
  const [, navigate] = useLocation();
  const [summary, setSummary] = useState<AccountDeletionSummary | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAccountDeletionSummary(user.uid).then(setSummary);
  }, [user.uid]);

  const providerId = user.providerData[0]?.providerId;

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      if (providerId === 'google.com') {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
      } else if (providerId === 'apple.com') {
        const provider = new OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');
        await reauthenticateWithPopup(user, provider);
      } else {
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? '', password));
      }
      await deleteMyAccount(user);
      // No further state update needed on success — deleteUser() clears
      // the auth session, App.tsx's onAuthStateChanged unmounts this page.
    } catch (err) {
      setError(friendlyDeleteError(err));
      setDeleting(false);
    }
  };

  if (!summary) {
    return (
      <div className="flex min-h-full flex-col text-ink">
        <PageHeader title="Delete Account" backTo="/app" />
      </div>
    );
  }

  const soleSuperAdminOf = summary.schoolMemberships.filter((m) => m.isSoleSuperAdmin);
  const needsAcknowledgement = summary.standaloneClassrooms.length > 0;
  const canDelete = !needsAcknowledgement || acknowledged;

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader title="Delete Account" backTo="/app" />
      <div className="flex max-w-md flex-col gap-6 px-6 py-4">
        {soleSuperAdminOf.length > 0 ? (
          <section className="rounded-lg border border-danger/40 bg-danger/5 p-4">
            <h2 className="font-semibold">You can't delete your account yet</h2>
            <p className="mt-2 text-sm text-ink-muted">
              You're the only super admin of {soleSuperAdminOf.map((m) => m.schoolName).join(', ')}. Promote another
              admin to super admin (or delete the school) before deleting your account.
            </p>
            {soleSuperAdminOf.map((m) => (
              <Button
                key={m.schoolId}
                variant="secondary"
                size="sm"
                className="mt-3"
                onClick={() => navigate('/app/school/staff')}
              >
                Go to Staff — {m.schoolName}
              </Button>
            ))}
          </section>
        ) : (
          <>
            <section className="rounded-lg border border-border p-4">
              <h2 className="text-sm font-semibold text-ink-muted">What happens</h2>
              {summary.schoolMemberships.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {summary.schoolMemberships.map((m) => (
                    <li key={m.schoolId}>
                      You'll leave <strong>{m.schoolName}</strong> ({roleLabel(m.role)}). Any classroom you own there
                      will be unassigned, not deleted — an admin can reassign it.
                    </li>
                  ))}
                </ul>
              )}
              {summary.standaloneClassrooms.length > 0 && (
                <p className="mt-2 text-sm text-danger">
                  These personal classrooms and their students will be permanently deleted:{' '}
                  {summary.standaloneClassrooms.map((c) => c.name).join(', ')}.
                </p>
              )}
              {summary.linkedStudentName && (
                <p className="mt-2 text-sm text-ink-muted">
                  Your account is linked to {summary.linkedStudentName}'s balance — that record stays with the
                  school; only your login is removed.
                </p>
              )}
            </section>

            {needsAcknowledgement && (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-1"
                />
                I understand my personal classroom(s) and their students will be permanently deleted.
              </label>
            )}

            <Button variant="danger" disabled={!canDelete} onClick={() => setConfirmOpen(true)}>
              Delete My Account
            </Button>

            {deleting && <p className="text-sm text-ink-muted">Deleting your account…</p>}
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}

            <ConfirmDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              title="Delete your account?"
              description="This can't be undone."
              confirmLabel="Delete Account"
              destructive
              confirmDisabled={providerId === 'password' && !password}
              onConfirm={handleDelete}
            >
              {providerId === 'password' && (
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink"
                />
              )}
            </ConfirmDialog>
          </>
        )}
      </div>
    </div>
  );
}
