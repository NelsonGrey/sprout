import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { HeartHandshake } from 'lucide-react';
import { useClassroom } from '../../lib/firestore';
import { inviteFamilyCoManager, useFamilyMembers } from '../../lib/family';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

/** `W-FAMILY-01` — one family's home: child cards with their own separate
 * balance, a persistent "stays separate from school" banner, and a
 * co-manager invite section. Reuses useClassroom as-is — contexts/{id}
 * has the same shape whether type is 'classroom' or 'family'. */
export function FamilyHomePage({ user, contextId }: { user: User; contextId: string }) {
  const [, navigate] = useLocation();
  const family = useClassroom(contextId);
  const members = useFamilyMembers(contextId);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    const trimmed = inviteEmail.trim();
    if (!trimmed || inviting) return;
    setInviting(true);
    await inviteFamilyCoManager({ contextId, email: trimmed, invitedByUid: user.uid });
    setInviteEmail('');
    setInviting(false);
  };

  if (!family) return null;

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={family.name}
        backTo="/app/family"
        actions={<Button onClick={() => navigate(`/app/family/${contextId}/children/new`)}>Add family member</Button>}
      />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mb-6 rounded-xl bg-mint px-4 py-2 text-sm font-semibold text-brand">
          Family activity stays separate from school administration.
        </div>

        {members.length === 0 ? (
          <p className="text-ink-muted">No family members yet — add one to get started.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => navigate(`/app/family/${contextId}/children/${member.id}`)}
                className="flex flex-col items-start gap-2 rounded-2xl border border-border-strong bg-surface p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-brand"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-brand">
                  <HeartHandshake size={18} />
                </span>
                <p className="font-bold text-ink">{member.displayName}</p>
                <p className="text-sm text-ink-muted">${(member.balanceCents / 100).toFixed(2)}</p>
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 max-w-md rounded-2xl border border-border-strong bg-surface p-4">
          <h2 className="font-bold text-ink">Co-managers</h2>
          <p className="mt-1 text-sm text-ink-muted">Invite another adult to help manage this family.</p>
          <div className="mt-3 flex gap-2">
            <Input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Co-manager's email"
              className="flex-1"
            />
            <Button size="sm" onClick={handleInvite} disabled={inviting}>
              Invite
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
