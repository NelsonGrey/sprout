import { ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'wouter';
import { getLesson } from '@sprout/shared';

/** Mounted once in Layout so it applies to any authenticated page — a
 * sticky "back to your lesson" strip when the current URL carries
 * `fromLesson`/`fromStep` (see lessonReturnLink.ts). This is how deep
 * links from the guided lesson runner into a real product feature stay
 * restorable to the exact step, without every target page (goal creation,
 * the transaction composer, the store) needing its own lesson-aware code —
 * see 05_IMPLEMENTATION_HANDOFF.md's Slice 3 step 4. */
export function LessonReturnBanner() {
  const [params] = useSearchParams();
  const lessonSlug = params.get('fromLesson');
  const step = params.get('fromStep');
  if (!lessonSlug || step === null) return null;

  const lesson = getLesson(lessonSlug);
  if (!lesson) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-mint px-4 py-2 text-sm font-semibold text-brand">
      <Link
        href={`/app/learn/${lesson.slug}/run?step=${step}`}
        className="inline-flex items-center gap-2"
      >
        <ArrowLeft size={15} /> Back to “{lesson.title}”
      </Link>
    </div>
  );
}
