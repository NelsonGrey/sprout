import type { ReactNode } from 'react';

/** Generic two-pane shell — a persistent left list alongside a larger right
 * detail/action pane, collapsing to one stacked column below `lg` (1024px).
 * Deliberately has no domain concerns (no student/classroom knowledge) so
 * any list+detail page can reuse it. */
export function TwoPaneLayout({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden px-6 py-4 lg:grid-cols-12">
      <div className="flex flex-col overflow-y-auto lg:col-span-4 lg:border-r lg:border-border lg:pr-4">
        {left}
      </div>
      <div className="overflow-y-auto lg:col-span-8">{right}</div>
    </div>
  );
}
