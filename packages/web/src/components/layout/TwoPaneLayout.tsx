import type { ReactNode } from 'react';

/** Generic two-pane shell — a persistent left list alongside a larger right
 * detail/action pane. At `lg` (1024px) and up, both panes always show side
 * by side. Below `lg`, the default is to stack them in one column — fine
 * while nothing is selected, since the list is still the first thing shown.
 * Once `detailSelected` is true, the list is hidden below `lg` instead:
 * without it, a picked item's detail (e.g. a student's earn/spend form)
 * stacks *below* the entire list rather than replacing it, so backing out
 * means scrolling past the whole form with no visible way to do so — see
 * 02_RESPONSIVE_WEB_APP.md's `WEB-PHONE`/`WEB-TABLET` spec for W-CLASS-01/
 * W-SCHOOL-02, which calls for a distinct full-screen detail view instead.
 * The caller is responsible for rendering its own back control inside
 * `right` (shown only below `lg`, since the list is already visible
 * alongside `right` at `lg`+) — this component deliberately has no
 * domain concerns (no student/classroom/staff knowledge, no navigation),
 * so any list+detail page can reuse it. */
export function TwoPaneLayout({
  left,
  right,
  detailSelected,
}: {
  left: ReactNode;
  right: ReactNode;
  detailSelected?: boolean;
}) {
  return (
    <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden px-6 py-4 lg:grid-cols-12">
      <div
        className={`flex-col overflow-y-auto lg:col-span-4 lg:flex lg:border-r lg:border-border lg:pr-4 ${
          detailSelected ? 'hidden' : 'flex'
        }`}
      >
        {left}
      </div>
      <div className="overflow-y-auto lg:col-span-8">{right}</div>
    </div>
  );
}
