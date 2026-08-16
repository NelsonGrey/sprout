import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { createSchool } from '../../lib/school';
import { useNcesSchoolSearch, type NcesSchoolResult } from '../../lib/ncesLookup';

/** Shown at /school to a signed-in user who isn't a member of any school
 * yet — founding a school makes them its super_admin (BR-1.3.11/1.3.12),
 * with no gating, the same as creating a classroom today. Search-as-you-type
 * against NCES's public school directory streamlines picking a real school;
 * "enter it manually" stays as a fallback since NCES only covers public
 * schools. */
export function CreateSchoolPage({ user }: { user: User }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<NcesSchoolResult | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualEntry, setManualEntry] = useState(false);
  const [creating, setCreating] = useState(false);
  const [, navigate] = useLocation();

  const { results, loading } = useNcesSchoolSearch(selected ? '' : query);

  const handleCreate = async () => {
    const name = selected ? selected.name : manualName.trim();
    if (!name || creating) return;
    setCreating(true);
    await createSchool({
      name,
      founderUid: user.uid,
      founderDisplayName: user.displayName,
      founderEmail: user.email,
      ...(selected
        ? {
            nces: {
              ncesId: selected.ncesId,
              street: selected.street,
              city: selected.city,
              state: selected.state,
              zip: selected.zip,
            },
          }
        : {}),
    });
    setCreating(false);
    navigate('/school');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-8 text-center text-white">
      <div>
        <h1 className="text-2xl font-bold">Set up your school</h1>
        <p className="mt-2 max-w-sm text-white/60">
          You'll be the super admin — the only one who can grant or revoke admin access for this
          school. You can delegate day-to-day staff management to someone else afterward.
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-3">
        {!manualEntry ? (
          <>
            <div className="relative text-left">
              <input
                value={selected ? selected.name : query}
                onChange={(e) => {
                  setSelected(null);
                  setQuery(e.target.value);
                }}
                placeholder="Search for your school"
                className="w-full rounded-lg border border-white/20 bg-transparent px-3 py-2"
              />
              {!selected && query.trim().length >= 3 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-white/20 bg-neutral-900 text-left shadow-lg">
                  {loading && <p className="px-3 py-2 text-sm text-white/50">Searching…</p>}
                  {!loading && results.length === 0 && (
                    <p className="px-3 py-2 text-sm text-white/50">No matches found.</p>
                  )}
                  {results.map((result) => (
                    <button
                      key={result.ncesId}
                      type="button"
                      onClick={() => setSelected(result)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-white/10"
                    >
                      <span className="font-medium">{result.name}</span>
                      <span className="ml-2 text-white/50">
                        {result.city}, {result.state}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setManualEntry(true)}
              className="text-xs text-white/60 hover:underline"
            >
              Can't find your school? Enter it manually
            </button>
          </>
        ) : (
          <>
            <input
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="School name"
              className="rounded-lg border border-white/20 bg-transparent px-3 py-2 text-left"
            />
            <button
              type="button"
              onClick={() => setManualEntry(false)}
              className="text-xs text-white/60 hover:underline"
            >
              Search instead
            </button>
          </>
        )}

        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || (!selected && !manualName.trim())}
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
