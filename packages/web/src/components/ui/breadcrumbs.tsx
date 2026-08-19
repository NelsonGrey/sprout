import { ChevronRight } from 'lucide-react';
import { Link } from 'wouter';

export interface BreadcrumbItem {
  label: string;
  href: string;
}

/** A trail of links above a page's title — "how do I get back to where I
 * was" for pages nested more than one level deep (Home > School > Staff),
 * distinct from PageHeader's `backTo` single-step back arrow, which both
 * can use at once. */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-xs font-semibold text-ink-muted">
      {items.map((item, index) => (
        <span key={item.href} className="flex items-center gap-1">
          {index > 0 && <ChevronRight size={12} aria-hidden="true" />}
          <Link href={item.href} className="hover:text-ink hover:underline">
            {item.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}
