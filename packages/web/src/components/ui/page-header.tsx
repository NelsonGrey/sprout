import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { Breadcrumbs, type BreadcrumbItem } from './breadcrumbs';
import { IconButton } from './icon-button';

/** Shared page header: an optional breadcrumb trail, consistent title
 * styling, an optional back button (fixes pages that previously had zero
 * back-navigation), and a trailing actions slot. `breadcrumbs` and
 * `backTo` can both be set — the trail shows the full path, the back
 * arrow is the single-tap "up one level" shortcut. Uses wouter's
 * `navigate` directly rather than a `<Link>`, matching every page's
 * existing programmatic-navigation convention. */
export function PageHeader({
  title,
  backTo,
  breadcrumbs,
  actions,
}: {
  title: string;
  backTo?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
}) {
  const [, navigate] = useLocation();

  return (
    <header className="border-b border-border px-6 py-4">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {backTo && (
            <IconButton
              variant="secondary"
              label="Back"
              onClick={() => navigate(backTo)}
            >
              <ArrowLeft size={18} />
            </IconButton>
          )}
          <h1 className="text-xl font-bold text-ink">{title}</h1>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
