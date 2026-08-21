import { useState } from 'react';
import type { User } from 'firebase/auth';
import type { FamilyPolicyProfile } from '@sprout/shared';
import { saveFamilyPolicyProfile, useAllFamilyPolicyProfiles, usePlatformAdmin } from '../../lib/family';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

/** Platform-admin-only: author FamilyPolicyProfile documents — see
 * 06_FAMILY_MODE_TECHNICAL_DESIGN.md §7. Gated on the `platformAdmin`
 * Firebase Auth custom claim (set only via the Admin SDK — see
 * lib/family.ts's usePlatformAdmin), never a Firestore-document role like
 * every other admin screen in this app, since this authors policy that
 * applies platform-wide, not per school. */
export function FamilyPolicyProfilesAdminPage({ user }: { user: User }) {
  const isPlatformAdmin = usePlatformAdmin(user);
  const profiles = useAllFamilyPolicyProfiles();
  const [editing, setEditing] = useState<Partial<FamilyPolicyProfile> | null>(null);
  const [saving, setSaving] = useState(false);

  const startNew = () =>
    setEditing({
      label: '',
      jurisdictionNote: '',
      enabled: false,
      isPlatformDefault: false,
      consentRequired: true,
      consentStatement: '',
      retentionDays: null,
    });

  const handleSave = async () => {
    if (!editing?.label?.trim() || saving) return;
    setSaving(true);
    await saveFamilyPolicyProfile({
      id: editing.id,
      label: editing.label.trim(),
      jurisdictionNote: editing.jurisdictionNote,
      enabled: editing.enabled ?? false,
      isPlatformDefault: editing.isPlatformDefault ?? false,
      consentRequired: editing.consentRequired ?? true,
      consentStatement: editing.consentStatement ?? '',
      retentionDays: editing.retentionDays ?? null,
      uid: user.uid,
    });
    setSaving(false);
    setEditing(null);
  };

  if (isPlatformAdmin === undefined) return null;

  if (!isPlatformAdmin) {
    return (
      <div className="flex min-h-full flex-col">
        <PageHeader title="Family policy profiles" />
        <p className="px-6 py-4 text-ink-muted">Only a platform administrator can manage this.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col text-ink">
      <PageHeader
        title="Family policy profiles"
        actions={!editing && <Button onClick={startNew}>New profile</Button>}
      />
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {editing ? (
          <div className="flex max-w-md flex-col gap-3">
            <Input
              value={editing.label ?? ''}
              onChange={(e) => setEditing({ ...editing, label: e.target.value })}
              placeholder="Label (e.g. United States default)"
              autoFocus
            />
            <Input
              value={editing.jurisdictionNote ?? ''}
              onChange={(e) => setEditing({ ...editing, jurisdictionNote: e.target.value })}
              placeholder="Jurisdiction note (optional, informational only)"
            />
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={editing.enabled ?? false}
                onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
              />
              Enabled (usable for new family creation)
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={editing.isPlatformDefault ?? false}
                onChange={(e) => setEditing({ ...editing, isPlatformDefault: e.target.checked })}
              />
              Platform default
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={editing.consentRequired ?? true}
                onChange={(e) => setEditing({ ...editing, consentRequired: e.target.checked })}
              />
              Require explicit consent acknowledgment
            </label>
            <textarea
              value={editing.consentStatement ?? ''}
              onChange={(e) => setEditing({ ...editing, consentStatement: e.target.value })}
              placeholder="Consent statement shown at family creation"
              rows={4}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
            />
            <Input
              value={editing.retentionDays?.toString() ?? ''}
              onChange={(e) =>
                setEditing({ ...editing, retentionDays: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="Retention days (blank = no automatic deletion)"
              inputMode="numeric"
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={!editing.label?.trim() || saving}>
                Save
              </Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {profiles.length === 0 ? (
              <p className="text-ink-muted">No profiles configured — family creation fails closed until one exists.</p>
            ) : (
              profiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => setEditing(profile)}
                  className="flex items-center justify-between rounded-lg border border-border-strong bg-surface p-4 text-left"
                >
                  <div>
                    <p className="font-bold">{profile.label}</p>
                    <p className="text-sm text-ink-muted">
                      {profile.enabled ? 'Enabled' : 'Disabled'}
                      {profile.isPlatformDefault ? ' · Platform default' : ''}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
