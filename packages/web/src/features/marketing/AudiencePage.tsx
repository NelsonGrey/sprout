import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Compass,
  Sprout,
} from 'lucide-react';
import { Link } from 'wouter';
import type { Audience } from './content';
import { usePageMeta } from './usePageMeta';

const ctaRoutes: Record<string, string> = {
  districts: '/readiness',
  schools: '/curriculum',
  educators: '/curriculum',
  families: '/curriculum/need-want-or-both',
  students: '/curriculum/goal-trail',
};

const notes: Record<string, string> = {
  districts:
    'District administration and curriculum teams can evaluate the same learning progression from different responsibilities.',
  schools:
    'Principals, office teams, specialists, counselors, and classroom staff each need access that matches their actual work.',
  educators:
    'Designed for classroom teachers, specialists, co-teachers, substitutes, and instructional support staff.',
  families:
    'For parents, guardians, caregivers, and the many different ways families talk about resources and goals.',
  students:
    'Student pages use direct language and protect the idea that a financial choice is not a measure of a child’s worth.',
};

export function AudiencePage({ audience }: { audience: Audience }) {
  usePageMeta(audience.shortName, audience.summary);

  return (
    <>
      <section className="relative overflow-hidden border-b border-[#dfe9dd] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div
          className="marketing-grid absolute inset-0 opacity-50"
          aria-hidden="true"
        />
        <div
          className="absolute right-[-10%] top-[-30%] h-[520px] w-[520px] rounded-full bg-[#ddefdf] blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-[1200px]">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#16805b]">
            {audience.eyebrow}
          </p>
          <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[1.02] tracking-[-0.052em] sm:text-6xl lg:text-7xl">
            {audience.headline}
          </h1>
          <p className="mt-7 max-w-3xl text-lg leading-8 text-[#526f66] sm:text-xl">
            {audience.summary}
          </p>
          <div className="mt-8 max-w-3xl rounded-2xl border border-[#cfe0d1] bg-white/75 px-5 py-4 text-sm font-semibold leading-6 text-[#49665d] shadow-sm">
            {notes[audience.slug]}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-4 md:grid-cols-3">
            {audience.outcomes.map((outcome, index) => (
              <article
                key={outcome.title}
                className="rounded-[26px] border border-[#dce7dc] bg-[#fbfcf9] p-6"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e3f3e7] text-sm font-black text-[#166b4f]">
                  0{index + 1}
                </span>
                <h2 className="mt-8 text-xl font-black tracking-[-0.025em]">
                  {outcome.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#5b746c]">
                  {outcome.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#102a26] px-5 py-20 text-white sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[.72fr_1.28fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8ed2a6]">
              A practical rhythm
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.045em]">
              Start small enough to learn what works.
            </h2>
            <p className="mt-5 leading-7 text-white/65">
              Sprout Streak is designed around repeatable practice, not a
              one-time assembly or a dashboard nobody revisits.
            </p>
          </div>
          <div className="grid gap-4">
            {audience.workflow.map(item => (
              <div
                key={item.step}
                className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 sm:grid-cols-[52px_1fr] sm:items-start"
              >
                <span className="text-sm font-black text-[#8ed2a6]">
                  {item.step}
                </span>
                <div>
                  <h3 className="text-lg font-black">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
            <div>
              <CircleHelp className="text-[#e56845]" size={30} />
              <h2 className="mt-5 text-4xl font-black tracking-[-0.045em]">
                Questions worth answering early.
              </h2>
              <p className="mt-4 leading-7 text-[#5b746c]">
                Clear expectations are part of the product. These answers
                distinguish today’s foundation from the intended future
                platform.
              </p>
            </div>
            <div className="divide-y divide-[#dce7dc] border-y border-[#dce7dc]">
              {audience.questions.map(item => (
                <details key={item.question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-lg font-black">
                    {item.question}
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e5f2e7] text-[#166b4f] transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="max-w-3xl pt-4 leading-7 text-[#5a736a]">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1200px] overflow-hidden rounded-[30px] bg-[#e5f3e8] p-7 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex gap-4">
              <span className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#166b4f] text-white sm:grid">
                <Compass size={23} />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#16805b]">
                  Your next useful step
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  {audience.cta}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#587168]">
                  Explore concrete material now. Pilot requests will stay gated
                  by the readiness work described on the site.
                </p>
              </div>
            </div>
            <Link
              href={ctaRoutes[audience.slug]}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#102a26] px-6 py-3.5 text-sm font-black text-white"
            >
              Continue{' '}
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 border-t border-[#cfe0d1] pt-6 text-xs font-bold text-[#547067]">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Age-aware
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Context respectful
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Practice centered
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sprout size={14} /> Designed to grow
            </span>
          </div>
        </div>
      </section>
    </>
  );
}
