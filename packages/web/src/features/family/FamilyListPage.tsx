import type { User } from 'firebase/auth';
import { useLocation } from 'wouter';
import { HeartHandshake } from 'lucide-react';
import { useMyFamilyContexts } from '../../lib/family';
import { PageHeader } from '../../components/ui/page-header';
import { Button } from '../../components/ui/button';

/** `/app/family` — every family this account manages (owner or
 * co-manager). Mirrors DashboardPage's classroom-card-grid pattern. */
export function FamilyListPage({ user }: { user: User }) {
  const [, navigate] = useLocation();
  const families = useMyFamilyContexts(user.uid);

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Family" actions={<Button onClick={() => navigate('/app/family/new')}>Create a family</Button>} />

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {families.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border-strong p-8">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-mint text-brand">
              <HeartHandshake size={22} />
            </span>
            <div>
              <p className="font-bold text-ink">No families yet</p>
              <p className="mt-1 text-sm text-ink-muted">Create one to keep family activity separate from school.</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {families.map((family) => (
              <button
                key={family.id}
                type="button"
                onClick={() => navigate(`/app/family/${family.id}`)}
                className="flex flex-col items-start gap-3 rounded-2xl border border-border-strong bg-surface p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-brand"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-brand">
                  <HeartHandshake size={18} />
                </span>
                <p className="font-bold text-ink">{family.name}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
