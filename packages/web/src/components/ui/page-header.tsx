import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { IconButton } from './icon-button';

/** Shared page header: consistent title styling, an optional back button
 * (fixes pages that previously had zero back-navigation), and a trailing
 * actions slot. Uses wouter's `navigate` directly rather than a `<Link>`,
 * matching every page's existing programmatic-navigation convention. */
export function PageHeader({
  title,
  backTo,
  actions,
}: {
  title: string;
  backTo?: string;
  actions?: ReactNode;
}) {
  const [, navigate] = useLocation();

  return (
    <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
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
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
