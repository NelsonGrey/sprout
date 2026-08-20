import { ExternalLink, Lightbulb, PackageOpen, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import { getLesson } from '@sprout/shared';
import { PageHeader } from '../../components/ui/page-header';

/** `W-LEARN-02` — an adult's preparation view for one lesson before running
 * it, following the lesson contract exactly (see LessonPage.tsx, the
 * public/marketing equivalent this mirrors). Deliberately stores nothing:
 * no preparation state is persisted anywhere — "the app may store
 * preparation only after a data contract exists" (05_IMPLEMENTATION_HANDOFF.md's
 * Slice 3 stop condition). "View printable version" opens the public
 * lesson page in a new tab rather than duplicating the print layout here. */
export function LearnPreparePage({ lessonSlug }: { lessonSlug: string }) {
  const lesson = getLesson(lessonSlug);

  if (!lesson) {
    return (
      <div className="flex min-h-full flex-col">
        <PageHeader title="Lesson not found" backTo="/app/learn" />
        <div className="px-6 py-6 text-sm text-ink-muted">This lesson doesn't exist.</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={lesson.title}
        backTo="/app/learn"
        actions={
          <a
            href={`/curriculum/${lesson.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-muted"
          >
            View printable version <ExternalLink size={14} />
          </a>
        }
      />
      <div className="px-6 py-6">
        <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-[0.1em] text-ink-muted">
          <span className="rounded-full bg-mint px-3 py-1.5 text-brand">{lesson.band}</span>
          <span>{lesson.strand}</span>
          <span>{lesson.minutes} minutes</span>
        </div>
        <p className="mt-4 max-w-2xl text-ink-muted">{lesson.summary}</p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[.6fr_1fr]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2 font-black text-ink">
                <Lightbulb size={18} className="text-warning" /> Objective
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{lesson.objective}</p>
            </section>
            <section className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2 font-black text-ink">
                <PackageOpen size={18} className="text-brand-bright" /> Materials
              </div>
              <ul className="mt-2 space-y-1.5 text-sm leading-6 text-ink-muted">
                {lesson.materials.map(item => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </section>
            <section className="rounded-2xl border border-accent-soft bg-accent-soft p-5">
              <div className="flex items-center gap-2 font-black text-ink">
                <ShieldCheck size={18} className="text-accent" /> Teach without shame
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{lesson.inclusionNote}</p>
            </section>
          </div>

          <div className="space-y-4">
            <section className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="font-black text-ink">Warm-up</h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{lesson.warmup}</p>
            </section>
            <section className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="font-black text-ink">Mission overview</h2>
              <ol className="mt-3 space-y-3">
                {lesson.mission.map((step, index) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-mint text-xs font-black text-brand">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink">{step.title}</p>
                      <p className="text-sm leading-6 text-ink-muted">{step.instructions}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <section className="rounded-2xl border border-border bg-surface p-5">
              <h2 className="font-black text-ink">Family bridge</h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{lesson.familyBridge}</p>
            </section>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Link
            href={`/app/learn/${lesson.slug}/run`}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-black text-on-dark"
          >
            Start guided lesson
          </Link>
        </div>
      </div>
    </div>
  );
}
