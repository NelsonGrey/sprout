import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Home,
  Lightbulb,
  PackageOpen,
  Printer,
  ShieldCheck,
  Sparkles,
  Sprout,
} from 'lucide-react';
import { Link } from 'wouter';
import type { Lesson } from './content';
import { usePageMeta } from './usePageMeta';

export function LessonPage({ lesson }: { lesson: Lesson }) {
  usePageMeta(`${lesson.title} lesson`, lesson.summary);

  return (
    <article>
      <header className="border-b border-border bg-surface py-12">
        <div className="mx-auto reading-container">
          <Link
            href="/curriculum"
            className="inline-flex items-center gap-2 text-sm font-black text-brand"
          >
            <ArrowLeft size={16} /> All lessons
          </Link>
          <div className="mt-10 flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-[0.12em] text-muted">
            <span className="rounded-full bg-mint px-3 py-1.5 text-brand">
              {lesson.band}
            </span>
            <span>{lesson.strand}</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Clock3 size={13} /> {lesson.minutes} minutes
            </span>
          </div>
          <h1 className="mt-5 text-5xl font-black tracking-[-0.052em] sm:text-6xl">
            {lesson.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
            {lesson.summary}
          </p>
          <div data-no-print className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-black text-on-dark"
            >
              <Printer size={16} /> Print lesson
            </button>
            <span className="inline-flex items-center gap-2 rounded-full border border-border-strong px-5 py-3 text-sm font-bold text-muted">
              <Sprout size={16} /> {lesson.buildingBlock}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid reading-container gap-10 py-12 lg:grid-cols-[.67fr_1.33fr] lg:py-16">
        <aside className="space-y-5">
          <section className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 font-black">
              <Lightbulb size={18} className="text-warning" /> Learning
              objective
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              {lesson.objective}
            </p>
          </section>
          <section className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 font-black">
              <PackageOpen size={18} className="text-brand-bright" /> Materials
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
              {lesson.materials.map(item => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-border bg-surface p-5">
            <div className="font-black">Words to grow</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {lesson.vocabulary.map(word => (
                <span
                  key={word}
                  className="rounded-full bg-mint px-3 py-1.5 text-xs font-bold text-muted"
                >
                  {word}
                </span>
              ))}
            </div>
          </section>
        </aside>

        <div className="space-y-10">
          <section>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-brand-bright">
              Open the conversation
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              Warm-up
            </h2>
            <p className="mt-4 leading-8 text-muted">{lesson.warmup}</p>
          </section>

          <section>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-accent">
              Student mission
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              Try it together
            </h2>
            <div className="mt-6 space-y-4">
              {lesson.mission.map((step, index) => (
                <div
                  key={step.title}
                  className="grid gap-4 rounded-2xl border border-border-strong bg-surface p-5 sm:grid-cols-[42px_1fr]"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-sm font-black text-accent">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-black">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {step.instructions}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[26px] bg-ink p-6 text-on-dark sm:p-8">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-mint-strong">
              <Sparkles size={15} /> Reflect
            </div>
            <ul className="mt-5 space-y-4">
              {lesson.reflect.map(question => (
                <li key={question} className="flex gap-3 leading-7">
                  <span className="text-mint-strong">→</span>
                  <span>{question}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black tracking-[-0.035em]">
              Quick learning check
            </h2>
            <p className="mt-3 leading-7 text-muted">{lesson.check}</p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface p-5">
              <Home size={20} className="text-accent" />
              <h2 className="mt-4 font-black">Family bridge</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {lesson.familyBridge}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5">
              <Sprout size={20} className="text-brand-bright" />
              <h2 className="mt-4 font-black">Inside Sprout Streak</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {lesson.productConnection}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-accent-soft bg-accent-soft p-5">
            <div className="flex items-center gap-2 font-black">
              <ShieldCheck size={18} className="text-accent" /> Teach without
              shame
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              {lesson.inclusionNote}
            </p>
          </section>

          <section className="border-t border-border pt-8">
            <div className="flex items-start gap-3">
              <CheckCircle2
                size={19}
                className="mt-1 shrink-0 text-brand-bright"
              />
              <div>
                <h2 className="font-black">Framework connection</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {lesson.standardsNote}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted">
              This is a design alignment note, not a state-standards
              certification. Curriculum teams should complete local review.
            </p>
            <div
              data-no-print
              className="mt-5 flex flex-wrap gap-4 text-xs font-bold text-brand"
            >
              <a
                href="https://www.consumerfinance.gov/consumer-tools/educator-tools/youth-financial-education/learn/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1"
              >
                CFPB framework <ExternalLink size={12} />
              </a>
              <a
                href="https://www.councilforeconed.org/policy-advocacy/k-12-standards/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1"
              >
                National standards <ExternalLink size={12} />
              </a>
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}
