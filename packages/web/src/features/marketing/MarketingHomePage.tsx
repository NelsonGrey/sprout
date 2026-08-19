import {
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  CircleDollarSign,
  Clock3,
  GraduationCap,
  HeartHandshake,
  Home,
  Landmark,
  School,
  ShieldCheck,
  Sparkles,
  Sprout,
  Users,
} from 'lucide-react';
import { Link } from 'wouter';
import { audiences, lessons } from './content';
import { usePageMeta } from './usePageMeta';

const audienceIcons = [
  Landmark,
  Building2,
  School,
  Users,
  Home,
  GraduationCap,
  Sparkles,
];
const featuredLessons = [lessons[0], lessons[3], lessons[5]];

export function MarketingHomePage() {
  usePageMeta(
    'Money habits that grow with students',
    'A Pre-K–6 financial-learning platform connecting age-aware lessons with everyday classroom and family practice.'
  );

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="marketing-grid absolute inset-0 opacity-60"
          aria-hidden="true"
        />
        <div
          className="absolute -right-36 -top-40 h-[520px] w-[520px] rounded-full bg-mint blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto grid site-container items-center gap-14 py-20 sm:py-24 lg:grid-cols-[1.05fr_.95fr] lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.13em] text-brand shadow-sm">
              <Sprout size={14} /> Pre-launch · Pre-K–6 first
            </div>
            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.055em] text-ink sm:text-6xl lg:text-[76px]">
              Money habits take root in{' '}
              <span className="text-accent">ordinary moments.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
              Sprout Streak is being built to turn everyday choices into
              age-aware practice—so students learn to earn, plan, save, spend,
              and reflect across school and home.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/curriculum"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-black text-on-dark shadow-brand transition hover:-translate-y-0.5 hover:bg-brand-strong"
              >
                Explore the learning library{' '}
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="/readiness"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border-strong bg-surface px-6 py-3.5 text-sm font-black text-ink-soft transition hover:border-border-strong"
              >
                See what is live and planned
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-muted">
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-brand-bright" /> No advertising
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-brand-bright" /> No bank account
                needed
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-brand-bright" /> Honest readiness
                labels
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[610px]">
            <div
              className="absolute -left-8 top-10 h-40 w-40 rounded-full bg-warning-soft blur-3xl"
              aria-hidden="true"
            />
            <div className="relative rotate-1 rounded-[34px] border border-on-dark/80 bg-ink p-4 shadow-panel sm:p-6">
              <div className="rounded-[26px] bg-canvas p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-muted">
                      Today’s mission
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">
                      Build a goal trail
                    </h2>
                  </div>
                  <span className="rounded-full bg-mint px-3 py-1.5 text-xs font-black text-brand">
                    Grades 3–4
                  </span>
                </div>

                <div
                  className="mt-8 flex items-center gap-1.5"
                  aria-label="Four of six goal checkpoints reached"
                >
                  {[0, 1, 2, 3, 4, 5].map(step => (
                    <div
                      key={step}
                      className={`h-3 flex-1 rounded-full ${step < 4 ? 'bg-accent' : 'bg-border'}`}
                    />
                  ))}
                </div>
                <div className="mt-3 flex justify-between text-xs font-bold text-muted">
                  <span>12 saved</span>
                  <span>Goal: 18</span>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-surface p-4">
                    <div className="flex items-center gap-2 text-sm font-black">
                      <CircleDollarSign size={17} className="text-brand-bright" />{' '}
                      Choice check
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      If you use 3 now, what changes on your trail?
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-4">
                    <div className="flex items-center gap-2 text-sm font-black">
                      <HeartHandshake size={17} className="text-accent" />{' '}
                      Reflection
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      There is no shame in changing a plan.
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-mint p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-brand text-on-dark">
                      <Sprout size={19} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-3 text-xs font-black">
                        <span>Goal progress</span>
                        <span>67%</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-surface">
                        <div className="h-2 w-2/3 rounded-full bg-brand" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-7 -left-3 -rotate-3 rounded-2xl border border-warning-soft bg-warning-soft px-4 py-3 shadow-lg sm:-left-10">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-warning">
                Practice → reflect → grow
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface py-20 lg:py-24">
        <div className="mx-auto site-container">
          <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-bright">
                One direction, many responsibilities
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
                Built to answer the question each stakeholder actually asks.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-muted lg:justify-self-end">
              District leaders need evidence and controls. Teachers need less
              friction. Families need respectful continuity. Students need
              agency. The experience should connect those needs without
              confusing them.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {audiences.map((audience, index) => {
              const Icon = audienceIcons[index] ?? Users;
              return (
                <Link
                  key={audience.slug}
                  href={`/${audience.slug}`}
                  className={`group rounded-[24px] border p-5 transition hover:-translate-y-1 hover:shadow-xl ${index === 0 || index === 1 ? 'border-border-strong bg-mint' : 'border-border bg-surface-subtle'}`}
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-surface text-brand shadow-sm">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-5 text-lg font-black tracking-[-0.025em]">
                    {audience.name}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {audience.outcomes[0].title}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-black text-brand">
                    Explore{' '}
                    <ArrowRight
                      size={14}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-ink py-20 text-on-dark lg:py-24">
        <div
          className="marketing-dot-field absolute inset-0 opacity-30"
          aria-hidden="true"
        />
        <div className="relative mx-auto site-container">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-mint-strong">
              The Sprout learning loop
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
              A ledger records a choice. Learning happens around it.
            </h2>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-[28px] bg-surface/10 md:grid-cols-3">
            {[
              {
                number: '01',
                icon: CircleDollarSign,
                title: 'Do',
                body: 'Make a bounded, age-appropriate choice: earn, plan, save, spend, or protect.',
              },
              {
                number: '02',
                icon: BookOpen,
                title: 'Reflect',
                body: 'Name the reason, the tradeoff, and what changed—without shame or public ranking.',
              },
              {
                number: '03',
                icon: Sprout,
                title: 'Grow',
                body: 'Use the next real moment to practice again with more information and confidence.',
              },
            ].map(({ number, icon: Icon, title, body }) => (
              <div key={title} className="bg-deep-surface p-7 sm:p-9">
                <div className="flex items-center justify-between">
                  <Icon className="text-mint-strong" />
                  <span className="text-xs font-black text-on-dark/35">
                    {number}
                  </span>
                </div>
                <h3 className="mt-10 text-3xl font-black">{title}</h3>
                <p className="mt-3 leading-7 text-on-dark/65">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="mx-auto site-container">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-bright">
                Original starter lessons
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
                Open, teach, and adapt.
              </h2>
            </div>
            <Link
              href="/curriculum"
              className="inline-flex items-center gap-2 text-sm font-black text-brand"
            >
              View all {lessons.length} lessons <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {featuredLessons.map((lesson, index) => (
              <Link
                key={lesson.slug}
                href={`/curriculum/${lesson.slug}`}
                className="group overflow-hidden rounded-[28px] border border-border bg-surface shadow-card transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className={`h-2 ${index === 0 ? 'bg-accent' : index === 1 ? 'bg-warning' : 'bg-brand-bright'}`}
                />
                <div className="p-6 sm:p-7">
                  <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.1em] text-muted">
                    <span>{lesson.band}</span>
                    <span className="flex items-center gap-1">
                      <Clock3 size={13} /> {lesson.minutes} min
                    </span>
                  </div>
                  <h3 className="mt-6 text-2xl font-black tracking-[-0.035em]">
                    {lesson.title}
                  </h3>
                  <p className="mt-3 leading-7 text-muted">
                    {lesson.summary}
                  </p>
                  <span className="mt-8 inline-flex items-center gap-2 text-sm font-black text-brand">
                    Open lesson{' '}
                    <ArrowRight
                      size={15}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-mint py-16">
        <div className="mx-auto grid site-container gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex gap-5">
            <div className="hidden h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand text-on-dark sm:grid">
              <ShieldCheck size={26} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-brand">
                Trust before procurement
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                The product foundation is real. District readiness is still in
                progress.
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-muted">
                See a plain-language view of implemented capabilities, active
                gaps, and the gates Sprout Streak must clear before
                school-facing launch.
              </p>
            </div>
          </div>
          <Link
            href="/readiness"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-black text-on-dark"
          >
            Review readiness <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
