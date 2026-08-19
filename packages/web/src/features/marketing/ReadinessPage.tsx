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
      <section className="relative overflow-hidden border-b border-[#dfe9dd] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div
          className="marketing-grid absolute inset-0 opacity-45"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-[1200px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e7c39c] bg-[#fff5df] px-3 py-1.5 text-xs font-black uppercase tracking-[0.13em] text-[#8c5b1e]">
            <AlertTriangle size={14} /> Pre-launch transparency
          </div>
          <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[1.02] tracking-[-0.052em] sm:text-6xl lg:text-7xl">
            Trust starts with saying what is not ready.
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-[#526f66] sm:text-xl">
            Sprout Streak has a working product foundation and an original
            learning library. It has not completed the privacy, accessibility,
            operational, or district-control work required for institutional
            procurement.
          </p>
        </div>
      </section>

      <section className="bg-white px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#16805b]">
                Capability map
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.045em]">
                Working, planned, and gated.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-[#627a72]">
              Status reflects the repository implementation and planning
              documents as of August 2026.
            </p>
          </div>
          <div className="mt-10 overflow-hidden rounded-[26px] border border-[#dce7dc]">
            {readiness.map((item, index) => {
              const Icon =
                item.tone === 'ready'
                  ? CheckCircle2
                  : item.tone === 'blocked'
                    ? LockKeyhole
                    : CircleDotDashed;
              const tone =
                item.tone === 'ready'
                  ? 'bg-[#e4f3e8] text-[#166b4f]'
                  : item.tone === 'blocked'
                    ? 'bg-[#fff0e8] text-[#b65033]'
                    : 'bg-[#eef1ef] text-[#5b7069]';
              return (
                <div
                  key={item.area}
                  className={`grid gap-4 bg-white p-5 sm:grid-cols-[1fr_190px_1.5fr] sm:items-start sm:p-6 ${index ? 'border-t border-[#e2ebe2]' : ''}`}
                >
                  <div className="flex items-center gap-3 font-black">
                    <Icon
                      size={18}
                      className={
                        item.tone === 'ready'
                          ? 'text-[#16805b]'
                          : item.tone === 'blocked'
                            ? 'text-[#d45f3d]'
                            : 'text-[#6a7e77]'
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
                  <p className="text-sm leading-6 text-[#5c746c]">
                    {item.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[.68fr_1.32fr]">
          <div>
            <ShieldCheck size={30} className="text-[#16805b]" />
            <h2 className="mt-5 text-4xl font-black tracking-[-0.045em]">
              District launch gates
            </h2>
            <p className="mt-4 leading-7 text-[#5b746c]">
              These are product obligations, not paperwork decorations. A pilot
              involving student data should not begin until its applicable gates
              are satisfied and documented.
            </p>
          </div>
          <ol className="space-y-3">
            {gates.map((gate, index) => (
              <li
                key={gate}
                className="grid gap-4 rounded-2xl border border-[#dce7dc] bg-white p-5 sm:grid-cols-[42px_1fr] sm:items-start"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e3f3e7] text-sm font-black text-[#166b4f]">
                  {index + 1}
                </span>
                <p className="pt-1 text-sm font-semibold leading-7 text-[#4f6b62]">
                  {gate}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[#102a26] px-5 py-16 text-white sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1200px] gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8ed2a6]">
              Review what can be reviewed now
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">
              Start with the learning approach, not a sales promise.
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-white/65">
              Educators and curriculum teams can inspect, print, and critique
              the starter lessons while readiness work continues.
            </p>
          </div>
          <Link
            href="/curriculum"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-black text-[#102a26]"
          >
            Explore lessons <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
