import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { Pencil } from 'lucide-react';
import { getSchool, updateSchool, useMyMembership } from '../../lib/school';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';
import { IconButton } from '../../components/ui/icon-button';
import { Input } from '../../components/ui/input';
import { roleLabel, scopeSummary } from './shared';

/** Shown at /school to a member of a school — a lightweight hub: the
 * viewer's own role/scope, header-level actions (Manage/Promote/Archive
 * Students, rename school), and nav links into the focused pages that
 * used to be sections on this one page (Staff, Access Requests, Invite a
 * Teacher, Grades Offered, Delegate Admin Access) — split up since it had
 * grown to hold too much on one screen. */
export function SchoolAdminPage({ user, schoolId }: { user: User; schoolId: string }) {
  const [, navigate] = useLocation();
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const membership = useMyMembership(schoolId, user.uid);

  const [renamingSchool, setRenamingSchool] = useState(false);
  const [schoolNameDraft, setSchoolNameDraft] = useState('');

  useEffect(() => {
    getSchool(schoolId).then((school) => setSchoolName(school?.name ?? null));
  }, [schoolId]);

  const isAtLeastAdmin = membership?.role === 'admin' || membership?.role === 'super_admin';
  const isSuperAdmin = membership?.role === 'super_admin';

  const startRenamingSchool = () => {
    setSchoolNameDraft(schoolName ?? '');
    setRenamingSchool(true);
  };

  const saveSchoolName = async () => {
    const trimmed = schoolNameDraft.trim();
    if (trimmed) {
      await updateSchool(schoolId, { name: trimmed });
      setSchoolName(trimmed);
    }
    setRenamingSchool(false);
  };

  const navLinks = [
    { label: 'Staff', to: '/app/school/staff', show: isAtLeastAdmin },
    { label: 'Access Requests', to: '/app/school/requests', show: isAtLeastAdmin },
    { label: 'Grades Offered', to: '/app/school/grades', show: isAtLeastAdmin },
  ].filter((link) => link.show);

  return (
    <div className="flex min-h-full flex-col text-ink">
      {renamingSchool ? (
        <header className="flex items-center gap-3 border-b border-border px-6 py-4">
          <Input
            value={schoolNameDraft}
            onChange={(e) => setSchoolNameDraft(e.target.value)}
            autoFocus
            className="flex-1"
          />
          <Button size="sm" onClick={saveSchoolName}>
            Save
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setRenamingSchool(false)}>
            Cancel
          </Button>
        </header>
      ) : (
        <PageHeader
          title={schoolName ?? 'School'}
          backTo="/app"
          actions={
            <>
              {isAtLeastAdmin && (
                <Button variant="secondary" size="sm" onClick={() => navigate('/app/students')}>
                  Manage Students
                </Button>
              )}
              {isAtLeastAdmin && (
                <Button variant="secondary" size="sm" onClick={() => navigate('/app/students/promote')}>
                  Promote Students
                </Button>
              )}
              {isAtLeastAdmin && (
                <Button variant="secondary" size="sm" onClick={() => navigate('/app/students/archive')}>
                  Archive Students
                </Button>
              )}
              {isSuperAdmin && (
                <IconButton label="Rename school" variant="secondary" onClick={startRenamingSchool}>
                  <Pencil size={16} />
                </IconButton>
              )}
            </>
          }
        />
      )}

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
        <section className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold text-ink-muted">Your access</h2>
          <p className="mt-1">
            {membership && roleLabel(membership.role)}
            {membership?.role === 'teacher' && ` — ${scopeSummary(membership.scope)}`}
          </p>
        </section>

        {navLinks.length > 0 && (
          <ul className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <li key={link.to}>
                <button
                  type="button"
                  onClick={() => navigate(link.to)}
                  className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-left hover:bg-bg"
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
