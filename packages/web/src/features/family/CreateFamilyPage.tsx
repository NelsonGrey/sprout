import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { createFamilyContext, useEnabledFamilyPolicyProfiles } from '../../lib/family';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

/** `W-FAMILY-01`'s creation flow — 06_FAMILY_MODE_TECHNICAL_DESIGN.md §7:
 * fails closed with zero enabled policy profiles (the Create button simply
 * has nothing to submit against), auto-selects the platform-default
 * profile when it's the only one, offers a picker when the operator has
 * published more than one (e.g. by region), and requires an affirmative
 * consent acknowledgment when the resolved profile's consentRequired is
 * true — never a silent default. Never imports a classroom balance or
 * history (05_IMPLEMENTATION_HANDOFF.md's Hard Stop). */
export function CreateFamilyPage({ user }: { user: User }) {
  const [, navigate] = useLocation();
  const profiles = useEnabledFamilyPolicyProfiles();

  const [name, setName] = useState('');
  const [profileId, setProfileId] = useState('');
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (profileId || profiles.length === 0) return;
    const platformDefault = profiles.find((p) => p.isPlatformDefault);
    setProfileId((platformDefault ?? profiles[0]).id);
  }, [profiles, profileId]);

  const selectedProfile = profiles.find((p) => p.id === profileId);
  const consentSatisfied = !selectedProfile?.consentRequired || consentAcknowledged;
  const canCreate = name.trim() && selectedProfile && consentSatisfied && !creating;

  const handleCreate = async () => {
    if (!canCreate || !selectedProfile) return;
    setCreating(true);
    const contextId = await createFamilyContext({
      name: name.trim(),
      ownerUid: user.uid,
      policyProfileId: selectedProfile.id,
    });
    navigate(`/app/family/${contextId}`);
  };

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader title="Create a family" backTo="/app/family" />
      <div className="flex max-w-md flex-col gap-3 px-6 py-4">
        <p className="text-sm text-ink-muted">
          Family activity stays separate from any school. Nothing here imports a classroom balance or history.
        </p>

        {profiles.length === 0 ? (
          <p className="rounded-lg border border-border-strong bg-surface p-3 text-sm text-ink-muted">
            Family creation isn't available yet — no policy has been configured.
          </p>
        ) : (
          <>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Family name" autoFocus />

            {profiles.length > 1 && (
              <select
                value={profileId}
                onChange={(e) => {
                  setProfileId(e.target.value);
                  setConsentAcknowledged(false);
                }}
                aria-label="Policy"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.label}
                  </option>
                ))}
              </select>
            )}

            {selectedProfile?.consentRequired && (
              <label className="flex items-start gap-2 rounded-lg border border-border-strong bg-surface p-3 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  checked={consentAcknowledged}
                  onChange={(e) => setConsentAcknowledged(e.target.checked)}
                  className="mt-0.5"
                />
                <span>{selectedProfile.consentStatement}</span>
              </label>
            )}

            <Button className="self-start" onClick={handleCreate} disabled={!canCreate}>
              Create
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
