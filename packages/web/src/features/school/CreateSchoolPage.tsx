import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { createSchool } from '../../lib/school';
import { useNcesSchoolSearch, type NcesSchoolResult } from '../../lib/ncesLookup';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

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
    navigate('/app/school');
  };

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader title="Set up your school" backTo="/app" />
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
        <p className="max-w-sm text-ink-muted">
          You'll be the super admin — the only one who can grant or revoke admin access for this
          school. You can delegate day-to-day staff management to someone else afterward.
        </p>
        <div className="flex w-full max-w-sm flex-col gap-3">
          {!manualEntry ? (
            <>
              <div className="relative text-left">
                <Input
                  value={selected ? selected.name : query}
                  onChange={(e) => {
                    setSelected(null);
                    setQuery(e.target.value);
                  }}
                  placeholder="Search for your school"
                  className="w-full"
                />
                {!selected && query.trim().length >= 3 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-surface text-left shadow-lg">
                    {loading && <p className="px-3 py-2 text-sm text-ink-muted">Searching…</p>}
                    {!loading && results.length === 0 && (
                      <p className="px-3 py-2 text-sm text-ink-muted">No matches found.</p>
                    )}
                    {results.map((result) => (
                      <button
                        key={result.ncesId}
                        type="button"
                        onClick={() => setSelected(result)}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-bg"
                      >
                        <span className="font-medium">{result.name}</span>
                        <span className="ml-2 text-ink-muted">
                          {result.city}, {result.state}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button variant="ghost" className="text-ink-muted hover:text-ink hover:no-underline" onClick={() => setManualEntry(true)}>
                Can't find your school? Enter it manually
              </Button>
            </>
          ) : (
            <>
              <Input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="School name"
                className="text-left"
              />
              <Button variant="ghost" className="text-ink-muted hover:text-ink hover:no-underline" onClick={() => setManualEntry(false)}>
                Search instead
              </Button>
            </>
          )}

          <Button onClick={handleCreate} disabled={creating || (!selected && !manualName.trim())}>
            Create School
          </Button>
        </div>
      </div>
    </div>
  );
}
