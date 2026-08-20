import { useState } from 'react';
import type { User } from 'firebase/auth';
import { ArrowRight, Clock3 } from 'lucide-react';
import { Link } from 'wouter';
import { lessons, LessonBandSchema, type LessonBand } from '@sprout/shared';
import { PageHeader } from '../../components/ui/page-header';
import { useCapabilities, useIsLinkedStudent } from '../../app/roleContext';
import { useLinkedStudent } from '../../lib/firestore';
import { gradeLevelToBand } from './gradeBand';

const BAND_FILTERS = ['All', ...LessonBandSchema.options] as const;

const strandColors: Record<string, string> = {
  Plan: 'bg-mint text-brand',
  Earn: 'bg-info-soft text-info',
  Spend: 'bg-accent-soft text-accent',
  Save: 'bg-warning-soft text-warning',
  Protect: 'bg-purple-soft text-purple',
};

/** `W-LEARN-01` — the authenticated learning library, gated behind the
 * `authenticatedLearning` flag (see app/featureFlags.ts). Uses the same
 * eight lessons as the public /curriculum, but the call to action per card
 * depends on who's looking: an adult gets "Prepare lesson"; a student-only
 * account gets "Start mission" directly into the guided runner only when
 * the lesson is within their own grade band, otherwise a disabled "Ask an
 * adult" note — never a self-reported-age judgment call. See
 * 05_IMPLEMENTATION_HANDOFF.md's Slice 3 / W-LEARN-01 spec. */
export function LearnListPage({ user }: { user: User }) {
  const [band, setBand] = useState<'All' | LessonBand>('All');
  const { hasAnyStaffAccess } = useCapabilities(user);
  const isLinkedStudent = useIsLinkedStudent(user);
  const linkedStudent = useLinkedStudent(user.uid);

  const isStudentOnly = isLinkedStudent === true && !hasAnyStaffAccess;
  const studentBand = isStudentOnly ? gradeLevelToBand(linkedStudent?.gradeLevel ?? undefined) : undefined;

  const visibleLessons = band === 'All' ? lessons : lessons.filter(lesson => lesson.band === band);

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Learning library" backTo="/app" />
      <div className="px-6 py-6">
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-ink-muted">
              {visibleLessons.length} lesson{visibleLessons.length === 1 ? '' : 's'} shown
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Grades 7–12 are a planned expansion, not a finished offering.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter lessons by grade band">
            {BAND_FILTERS.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setBand(item)}
                aria-pressed={band === item}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  band === item ? 'bg-ink text-on-dark' : 'border border-border-strong bg-surface text-ink-soft'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {visibleLessons.map(lesson => {
            const withinStudentBand = studentBand !== undefined && studentBand === lesson.band;
            return (
              <div
                key={lesson.slug}
                className="flex flex-col rounded-2xl border border-border-strong bg-surface p-5 shadow-card"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${strandColors[lesson.strand]}`}>
                    {lesson.strand}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-ink-muted">
                    <Clock3 size={13} /> {lesson.minutes} minutes
                  </span>
                </div>
                <p className="mt-4 text-xs font-black uppercase tracking-[0.1em] text-brand">{lesson.band}</p>
                <h2 className="mt-1 text-lg font-black tracking-[-0.02em] text-ink">{lesson.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-ink-muted">{lesson.summary}</p>

                <div className="mt-5 border-t border-border pt-4">
                  {isStudentOnly ? (
                    withinStudentBand ? (
                      <Link
                        href={`/app/learn/${lesson.slug}/run`}
                        className="inline-flex items-center gap-1.5 text-sm font-black text-brand"
                      >
                        Start mission <ArrowRight size={15} />
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-ink-muted">Ask an adult to guide this lesson.</p>
                    )
                  ) : (
                    <Link
                      href={`/app/learn/${lesson.slug}/prepare`}
                      className="inline-flex items-center gap-1.5 text-sm font-black text-brand"
                    >
                      Prepare lesson <ArrowRight size={15} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
