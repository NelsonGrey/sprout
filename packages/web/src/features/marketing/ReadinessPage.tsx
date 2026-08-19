import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDotDashed,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'wouter';
import { usePageMeta } from './usePageMeta';

const readiness = [
  {
    area: 'Core product',
    status: 'Working foundation',
    tone: 'ready',
    detail:
      'Web and mobile foundations include sign-in, school and classroom setup, student rosters, a student balance/history view, and earn/spend ledger workflows.',
  },
  {
    area: 'School operations',
    status: 'Working on web',
    tone: 'ready',
    detail:
      'Grades, staff access, scoped specialist roles, bulk student import, promotion, and archive workflows are implemented on web. Mobile parity is incomplete.',
  },
  {
    area: 'Learning content',
    status: 'Foundation implemented',
    tone: 'ready',
    detail:
      'Eight original Pre-K–6 starter lessons are available for review. They still need educator review, classroom pilots, and local standards mapping.',
  },
  {
    area: 'Family continuity',
    status: 'Planned',
    tone: 'planned',
    detail:
      'The BRD calls for one student identity across separate classroom and family contexts. The full family-mode workflow is not yet implemented.',
  },
  {
    area: 'Accessibility',
    status: 'Not yet verified',
    tone: 'blocked',
    detail:
      'Accessibility is a launch requirement, but formal WCAG and assistive-technology testing has not been completed.',
  },
  {
    area: 'Privacy & procurement',
    status: 'Launch gate open',
    tone: 'blocked',
    detail:
      'The privacy program, district contracting materials, data-retention schedule, and independent review are not complete. The product is not presented as district-procurement ready.',
  },
  {
    area: 'District administration',
    status: 'Planned',
    tone: 'planned',
    detail:
      'Centralized district controls, cross-school analytics, rostering interoperability, and enterprise support processes remain future work.',
  },
  {
    area: 'Grades 7–12',
    status: 'Expansion path',
    tone: 'planned',
    detail:
      'The curriculum model anticipates middle and high school. No complete 7–12 offering is claimed today.',
  },
];

const gates = [
  'Complete child-data inventory, minimization rules, retention schedule, and deletion procedures.',
  'Publish plain-language privacy, school privacy, security, and accessibility statements backed by actual controls.',
  'Prepare district data-processing and security-review materials with qualified legal and privacy review.',
  'Verify core journeys with keyboard, screen reader, contrast, zoom, reduced-motion, and mobile assistive technologies.',
  'Run educator and student pilots with defined learning, workload, usability, and equity measures.',
  'Document incident response, support ownership, uptime expectations, and a public product-update cadence.',
];

export function ReadinessPage() {
  usePageMeta(
    'Readiness center',
    'A transparent view of what Sprout Streak has built, what remains planned, and what must happen before district procurement.'
  );

  return (
    <>
      <section className="relative overflow-hidden border-b border-border py-20 lg:py-24">
        <div
          className="marketing-grid absolute inset-0 opacity-45"
          aria-hidden="true"
        />
        <div className="relative mx-auto site-container">
          <div className="inline-flex items-center gap-2 rounded-full border border-warning-soft bg-warning-soft px-3 py-1.5 text-xs font-black uppercase tracking-[0.13em] text-warning">
            <AlertTriangle size={14} /> Pre-launch transparency
          </div>
          <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[1.02] tracking-[-0.052em] sm:text-6xl lg:text-7xl">
            Trust starts with saying what is not ready.
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-muted sm:text-xl">
            Sprout Streak has a working product foundation and an original
            learning library. It has not completed the privacy, accessibility,
            operational, or district-control work required for institutional
            procurement.
          </p>
        </div>
      </section>

      <section className="bg-surface py-16 lg:py-20">
        <div className="mx-auto site-container">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-bright">
                Capability map
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.045em]">
                Working, planned, and gated.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted">
              Status reflects the repository implementation and planning
              documents as of August 2026.
            </p>
          </div>
          <div className="mt-10 overflow-hidden rounded-[26px] border border-border">
            {readiness.map((item, index) => {
              const Icon =
                item.tone === 'ready'
                  ? CheckCircle2
                  : item.tone === 'blocked'
                    ? LockKeyhole
                    : CircleDotDashed;
              const tone =
                item.tone === 'ready'
                  ? 'bg-mint text-brand'
                  : item.tone === 'blocked'
                    ? 'bg-accent-soft text-danger'
                    : 'bg-surface-subtle text-muted';
              return (
                <div
                  key={item.area}
                  className={`grid gap-4 bg-surface p-5 sm:grid-cols-[1fr_190px_1.5fr] sm:items-start sm:p-6 ${index ? 'border-t border-border' : ''}`}
                >
                  <div className="flex items-center gap-3 font-black">
                    <Icon
                      size={18}
                      className={
                        item.tone === 'ready'
                          ? 'text-brand-bright'
                          : item.tone === 'blocked'
                            ? 'text-danger'
                            : 'text-muted'
                      }
                    />
                    {item.area}
                  </div>
                  <div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${tone}`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-muted">
                    {item.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="mx-auto grid site-container gap-12 lg:grid-cols-[.68fr_1.32fr]">
          <div>
            <ShieldCheck size={30} className="text-brand-bright" />
            <h2 className="mt-5 text-4xl font-black tracking-[-0.045em]">
              District launch gates
            </h2>
            <p className="mt-4 leading-7 text-muted">
              These are product obligations, not paperwork decorations. A pilot
              involving student data should not begin until its applicable gates
              are satisfied and documented.
            </p>
          </div>
          <ol className="space-y-3">
            {gates.map((gate, index) => (
              <li
                key={gate}
                className="grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-[42px_1fr] sm:items-start"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-sm font-black text-brand">
                  {index + 1}
                </span>
                <p className="pt-1 text-sm font-semibold leading-7 text-muted">
                  {gate}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-ink py-16 text-on-dark">
        <div className="mx-auto grid site-container gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-mint-strong">
              Review what can be reviewed now
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">
              Start with the learning approach, not a sales promise.
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-on-dark/65">
              Educators and curriculum teams can inspect, print, and critique
              the starter lessons while readiness work continues.
            </p>
          </div>
          <Link
            href="/curriculum"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-surface px-6 py-3.5 text-sm font-black text-ink"
          >
            Explore lessons <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
