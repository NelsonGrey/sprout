import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { createSchool } from '../../lib/school';

/** Shown at /school to a signed-in user who isn't a member of any school
 * yet — founding a school makes them its principal (BR-1.3.11/1.3.12),
 * with no gating, the same as creating a classroom today. */
export function CreateSchoolPage({ user }: { user: User }) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [, navigate] = useLocation();

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    await createSchool({
      name: trimmed,
      principalUid: user.uid,
      principalDisplayName: user.displayName,
      principalEmail: user.email,
    });
    setCreating(false);
    navigate('/school');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-8 text-center text-white">
      <div>
        <h1 className="text-2xl font-bold">Set up your school</h1>
        <p className="mt-2 max-w-sm text-white/60">
          You'll be the principal — the only one who can grant or revoke admin access for this
          school. You can delegate day-to-day staff management to someone else afterward.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="School name"
          className="rounded-lg border border-white/20 bg-transparent px-3 py-2 text-left"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="w-full rounded-lg bg-green-600 px-4 py-3 font-medium hover:bg-green-700 disabled:opacity-50"
        >
          Found School
        </button>
        <button type="button" onClick={() => navigate('/')} className="text-xs text-white/60 hover:underline">
          Back to my classrooms
        </button>
      </div>
    </main>
  );
}
