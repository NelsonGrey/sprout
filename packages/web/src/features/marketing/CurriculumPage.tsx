import { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Clock3,
  ExternalLink,
  Heart,
  Layers3,
  Sprout,
} from 'lucide-react';
import { Link } from 'wouter';
import { gradeBands, lessons } from './content';
import { usePageMeta } from './usePageMeta';

const strandColors: Record<string, string> = {
  Plan: 'bg-[#dff0e5] text-[#166b4f]',
  Earn: 'bg-[#e1eef9] text-[#2c6791]',
  Spend: 'bg-[#fff0e9] text-[#b75032]',
  Save: 'bg-[#fff4d8] text-[#8a6518]',
  Protect: 'bg-[#ece8f8] text-[#6850a0]',
};

export function CurriculumPage() {
  const [band, setBand] = useState<(typeof gradeBands)[number]>('All');
  const visibleLessons =
    band === 'All' ? lessons : lessons.filter(lesson => lesson.band === band);

  usePageMeta(
    'Learning library',
    'Original Pre-K–6 financial education lessons for planning, spending, saving, decision-making, and reflection.'
  );

  return (
    <>
      <section className="relative overflow-hidden border-b border-[#dfe9dd] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div
          className="marketing-grid absolute inset-0 opacity-50"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-[1280px]">
          <div className="max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#16805b]">
              Sprout learning library · Foundation release
            </p>
            <h1 className="mt-5 text-5xl font-black leading-[1.02] tracking-[-0.052em] sm:text-6xl lg:text-7xl">
              Practice before the stakes are real.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-[#526f66] sm:text-xl">
              Eight original starter lessons help Pre-K–6 students build
              planning, habits, vocabulary, and decision-making through safe
              simulations and everyday reflection.
            </p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#d8e6d8] bg-white/85 p-5">
              <Brain className="text-[#16805b]" />
              <h2 className="mt-4 font-black">Plan & pause</h2>
              <p className="mt-1 text-sm leading-6 text-[#627a72]">
                Build focus, patience, and future thinking.
              </p>
            </div>
            <div className="rounded-2xl border border-[#d8e6d8] bg-white/85 p-5">
              <Heart className="text-[#e56845]" />
              <h2 className="mt-4 font-black">Practice habits</h2>
              <p className="mt-1 text-sm leading-6 text-[#627a72]">
                Make values and routines visible without shame.
              </p>
            </div>
            <div className="rounded-2xl border border-[#d8e6d8] bg-white/85 p-5">
              <Layers3 className="text-[#b17c19]" />
              <h2 className="mt-4 font-black">Decide with evidence</h2>
              <p className="mt-1 text-sm leading-6 text-[#627a72]">
                Compare, calculate, choose, and adjust.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-[1280px]">
          <div className="flex flex-col gap-5 border-b border-[#dbe6dc] pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#617970]">
                Filter by grade band
              </p>
              <p className="mt-2 text-sm text-[#657d75]">
                {visibleLessons.length} lesson
                {visibleLessons.length === 1 ? '' : 's'} shown
              </p>
            </div>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Filter lessons by grade band"
            >
              {gradeBands.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setBand(item)}
                  aria-pressed={band === item}
                  className={`rounded-full px-4 py-2 text-xs font-black transition ${band === item ? 'bg-[#102a26] text-white' : 'border border-[#ceddcf] bg-white text-[#46645b] hover:border-[#88aa91]'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {visibleLessons.map(lesson => (
              <Link
                key={lesson.slug}
                href={`/curriculum/${lesson.slug}`}
                className="group flex flex-col rounded-[26px] border border-[#dbe7dc] bg-white p-6 shadow-[0_10px_30px_rgba(24,65,52,0.05)] transition hover:-translate-y-1 hover:border-[#9cbea4] hover:shadow-xl sm:p-7"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-black ${strandColors[lesson.strand]}`}
                  >
                    {lesson.strand}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[#687e77]">
                    <Clock3 size={13} /> {lesson.minutes} minutes
                  </span>
                </div>
                <div className="mt-7 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.13em] text-[#16805b]">
                    {lesson.band}
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.035em]">
                    {lesson.title}
                  </h2>
                  <p className="mt-3 leading-7 text-[#5c746c]">
                    {lesson.summary}
                  </p>
                </div>
                <div className="mt-7 flex items-center justify-between border-t border-[#e5ece4] pt-5">
                  <span className="text-xs font-bold text-[#6a8078]">
                    {lesson.buildingBlock}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm font-black text-[#166b4f]">
                    Open lesson{' '}
                    <ArrowRight
                      size={15}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#dce7dc] bg-white px-5 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[.75fr_1.25fr]">
          <div>
            <BookOpen size={30} className="text-[#e56845]" />
            <h2 className="mt-5 text-3xl font-black tracking-[-0.04em]">
              Framework-informed, not certified.
            </h2>
            <p className="mt-4 leading-7 text-[#5a736a]">
              The library uses national frameworks as design inputs. Local
              curriculum teams still need to map lessons to state and district
              requirements.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <a
              href="https://www.consumerfinance.gov/consumer-tools/educator-tools/youth-financial-education/learn/"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-[#dbe7dc] bg-[#f8fbf5] p-5 transition hover:border-[#9cb9a1]"
            >
              <div className="flex items-center justify-between">
                <Sprout className="text-[#16805b]" />
                <ExternalLink size={15} className="text-[#70857e]" />
              </div>
              <h3 className="mt-5 font-black">CFPB building blocks</h3>
              <p className="mt-2 text-sm leading-6 text-[#617970]">
                Executive function, financial habits and norms, and knowledge
                and decision-making.
              </p>
            </a>
            <a
              href="https://www.councilforeconed.org/policy-advocacy/k-12-standards/"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-[#dbe7dc] bg-[#f8fbf5] p-5 transition hover:border-[#9cb9a1]"
            >
              <div className="flex items-center justify-between">
                <Layers3 className="text-[#b17c19]" />
                <ExternalLink size={15} className="text-[#70857e]" />
              </div>
              <h3 className="mt-5 font-black">CEE / Jump$tart standards</h3>
              <p className="mt-2 text-sm leading-6 text-[#617970]">
                Six K–12 topic areas with expectations at grades 4, 8, and 12.
              </p>
            </a>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1280px] rounded-[28px] bg-[#102a26] p-7 text-white sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8ed2a6]">
            What comes next
          </p>
          <div className="mt-3 grid gap-8 lg:grid-cols-[1fr_.8fr] lg:items-end">
            <div>
              <h2 className="text-3xl font-black tracking-[-0.04em]">
                Grades 7–8 and 9–12 are expansion paths—not finished offerings.
              </h2>
              <p className="mt-4 leading-7 text-white/65">
                The architecture anticipates credit, investing, risk, income,
                taxes, and real-world financial information. Those bands require
                their own research, educator review, and classroom pilots before
                release.
              </p>
            </div>
            <Link
              href="/readiness"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-black text-[#102a26] lg:justify-self-end"
            >
              Review the roadmap <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
