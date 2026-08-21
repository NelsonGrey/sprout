import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { splitDisplayName, useClassroom } from '../../lib/firestore';
import { addFamilyMember } from '../../lib/family';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

/** A dedicated page for adding a family member — mirrors CreateStudentPage
 * exactly, minus the school-scoped denormalization (family has none). */
export function AddFamilyMemberPage({ user, contextId }: { user: User; contextId: string }) {
  const [, navigate] = useLocation();
  const family = useClassroom(contextId);
  const ownerUids = family?.ownerUids ?? [user.uid];

  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    const { firstName, lastName } = splitDisplayName(trimmed);
    await addFamilyMember({ contextId, firstName, lastName, ownerUids });
    navigate(`/app/family/${contextId}`);
  };

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader title={`Add family member — ${family?.name ?? 'Family'}`} backTo={`/app/family/${contextId}`} />
      <div className="flex max-w-md flex-col gap-3 px-6 py-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Family member's name" autoFocus />
        <Button className="self-start" onClick={handleAdd} disabled={!name.trim() || adding}>
          Create
        </Button>
      </div>
    </div>
  );
}
