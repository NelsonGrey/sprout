import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { createClassroom, useClassrooms } from '../../lib/firestore';
import { firebaseClient } from '../../lib/firebase';

/** Post-login landing page: a teacher's classroom list plus "create a classroom". */
export function ClassroomsPage({ user }: { user: User }) {
  const classrooms = useClassrooms(user.uid);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [, navigate] = useLocation();

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    await createClassroom({
      name: trimmed,
      ownerUid: user.uid,
      ownerDisplayName: user.displayName,
      ownerEmail: user.email,
    });
    setName('');
    setCreating(false);
  };

  return (
    <main className="flex min-h-screen flex-col bg-neutral-950 text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <h1 className="text-xl font-bold">My Classrooms</h1>
        <button
          type="button"
          onClick={() => firebaseClient.auth.signOut()}
          className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
        >
          Sign out
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {classrooms.length === 0 ? (
          <p className="text-white/60">No classrooms yet — add one below.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {classrooms.map((classroom) => (
              <li key={classroom.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/classrooms/${classroom.id}`)}
                  className="w-full rounded-lg border border-white/10 px-4 py-3 text-left hover:bg-white/5"
                >
                  {classroom.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2 border-t border-white/10 px-6 py-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Classroom name"
          className="flex-1 rounded-lg border border-white/20 bg-transparent px-3 py-2"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="rounded-lg bg-green-600 px-4 py-2 font-medium hover:bg-green-700 disabled:opacity-50"
        >
          Create
        </button>
      </div>
    </main>
  );
}
