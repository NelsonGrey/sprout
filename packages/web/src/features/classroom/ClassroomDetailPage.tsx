import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { addStudent, useClassrooms, useStudents } from '../../lib/firestore';

export function ClassroomDetailPage({ user, contextId }: { user: User; contextId: string }) {
  const classrooms = useClassrooms(user.uid);
  const classroom = classrooms.find((c) => c.id === contextId);
  const ownerUids = classroom?.ownerUids ?? [user.uid];

  const students = useStudents(contextId);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [, navigate] = useLocation();

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    await addStudent({ contextId, displayName: trimmed, ownerUids });
    setName('');
    setAdding(false);
  };

  return (
    <main className="flex min-h-screen flex-col bg-neutral-950 text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <h1 className="text-xl font-bold">{classroom?.name ?? 'Classroom'}</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {students.length === 0 ? (
          <p className="text-white/60">No students yet — add one below.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {students.map((student) => (
              <li key={student.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/classrooms/${contextId}/students/${student.id}`)}
                  className="flex w-full items-center justify-between rounded-lg border border-white/10 px-4 py-3 text-left hover:bg-white/5"
                >
                  <span>{student.displayName}</span>
                  <span>${(student.balanceCents / 100).toFixed(2)}</span>
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
          placeholder="Student name"
          className="flex-1 rounded-lg border border-white/20 bg-transparent px-3 py-2"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="rounded-lg bg-green-600 px-4 py-2 font-medium hover:bg-green-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </main>
  );
}
