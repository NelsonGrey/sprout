import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'wouter';
import type { User } from 'firebase/auth';
import { getLesson } from '@sprout/shared';
import { PageHeader } from '../../components/ui/page-header';
import { useCapabilities, useIsLinkedStudent } from '../../app/roleContext';
import { activityLinkLabel } from './lessonActivityLinks';
import { withLessonReturn } from './lessonReturnLink';

type RunStep =
  | { kind: 'warmup' }
  | { kind: 'mission'; index: number }
  | { kind: 'reflect' }
  | { kind: 'check' }
  | { kind: 'familyBridge' };

/** `W-LEARN-03` — the guided step runner: Warm-up → Mission 1..N → Reflect
 * → Check → Family bridge, one step at a time, with the current step kept
 * in the URL (`?step=`) so a deep link restores to the exact step (see
 * lessonReturnLink.ts / 05_IMPLEMENTATION_HANDOFF.md's Slice 3 step 4).
 * Reflect and Check are display-only prompts for spoken discussion — no
 * free-text input is collected or stored anywhere, since no reflection
 * data contract (minimization/access/retention/export/deletion) has been
 * approved yet (Slice 3 stop condition). */
export function LearnRunPage({ user, lessonSlug }: { user: User; lessonSlug: string }) {
  const lesson = getLesson(lessonSlug);
  const [, navigate] = useLocation();
  const [params] = useSearchParams();
  const { hasAnyStaffAccess } = useCapabilities(user);
  const isLinkedStudent = useIsLinkedStudent(user);
  const isStudentOnly = isLinkedStudent === true && !hasAnyStaffAccess;

  if (!lesson) {
    return (
      <div className="flex min-h-full flex-col">
        <PageHeader title="Lesson not found" backTo="/app/learn" />
        <div className="px-6 py-6 text-sm text-ink-muted">This lesson doesn't exist.</div>
      </div>
    );
  }

  const steps: RunStep[] = [
    { kind: 'warmup' },
    ...lesson.mission.map((_, index) => ({ kind: 'mission' as const, index })),
    { kind: 'reflect' },
    { kind: 'check' },
    { kind: 'familyBridge' },
  ];

  const requestedStep = Number(params.get('step'));
  const currentIndex = Number.isInteger(requestedStep)
    ? Math.min(Math.max(requestedStep, 0), steps.length - 1)
    : 0;
  const step = steps[currentIndex];
  const basePath = `/app/learn/${lesson.slug}/run`;
  const goToStep = (index: number) => navigate(`${basePath}?step=${index}`);

  const activityLabel = activityLinkLabel(lesson.slug);
  const activityTarget = withLessonReturn(isStudentOnly ? '/app/me' : '/app', lesson.slug, currentIndex);

  const stepLabel = (s: RunStep) => {
    if (s.kind === 'warmup') return 'Warm-up';
    if (s.kind === 'mission') return `Mission ${s.index + 1}`;
    if (s.kind === 'reflect') return 'Reflect';
    if (s.kind === 'check') return 'Check';
    return 'Family bridge';
  };

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title={lesson.title} backTo={`/app/learn/${lesson.slug}/prepare`} />
      <div className="flex flex-1 flex-col px-6 py-6">
        <nav aria-label="Lesson progress" className="flex flex-wrap gap-2">
          {steps.map((s, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToStep(index)}
              aria-current={index === currentIndex ? 'step' : undefined}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                index === currentIndex
                  ? 'bg-ink text-on-dark'
                  : index < currentIndex
                    ? 'bg-mint text-brand'
                    : 'border border-border-strong bg-surface text-ink-muted'
              }`}
            >
              {stepLabel(s)}
            </button>
          ))}
        </nav>

        <div className="mt-6 flex-1 rounded-2xl border border-border bg-surface p-6">
          {step.kind === 'warmup' && (
            <>
              <h2 className="text-xl font-black text-ink">Warm-up</h2>
              <p className="mt-3 leading-7 text-ink-muted">{lesson.warmup}</p>
            </>
          )}
          {step.kind === 'mission' && (
            <>
              <h2 className="text-xl font-black text-ink">{lesson.mission[step.index].title}</h2>
              <p className="mt-3 leading-7 text-ink-muted">{lesson.mission[step.index].instructions}</p>
              {activityLabel && (
                <Link
                  href={activityTarget}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-black text-brand"
                >
                  {activityLabel} <ArrowRight size={15} />
                </Link>
              )}
            </>
          )}
          {step.kind === 'reflect' && (
            <>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-brand">
                <Sparkles size={15} /> Reflect
              </div>
              <p className="mt-2 text-sm text-ink-muted">Discuss aloud — nothing typed here is saved.</p>
              <ul className="mt-4 space-y-3">
                {lesson.reflect.map(question => (
                  <li key={question} className="flex gap-2 leading-7 text-ink">
                    <span className="text-brand">→</span>
                    <span>{question}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {step.kind === 'check' && (
            <>
              <h2 className="text-xl font-black text-ink">Quick learning check</h2>
              <p className="mt-3 leading-7 text-ink-muted">{lesson.check}</p>
            </>
          )}
          {step.kind === 'familyBridge' && (
            <>
              <h2 className="text-xl font-black text-ink">Family bridge</h2>
              <p className="mt-3 leading-7 text-ink-muted">{lesson.familyBridge}</p>
            </>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => goToStep(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-4 py-2 text-sm font-bold text-ink disabled:opacity-40"
          >
            <ArrowLeft size={15} /> Back
          </button>
          {currentIndex < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => goToStep(currentIndex + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-black text-on-dark"
            >
              Next <ArrowRight size={15} />
            </button>
          ) : (
            <Link
              href="/app/learn"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-black text-on-dark"
            >
              Finish
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
