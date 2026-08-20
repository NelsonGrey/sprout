import { z } from 'zod';

// The canonical shape of a starter lesson (Slice 3 — see
// docs/detailed-design/05_IMPLEMENTATION_HANDOFF.md's "lesson contract").
// lessons.ts validates every entry against this schema at module load, so
// an incomplete or malformed lesson fails fast instead of silently shipping
// with a missing inclusion note or reflection prompt. This is the single
// source of truth both packages/web and packages/mobile read from — mobile
// via a generated JSON asset (see scripts/generate-mobile-content.mjs),
// never a hand-typed Dart copy of the lesson bodies themselves.
export const LessonBandSchema = z.enum([
  'Pre-K–K',
  'Grades 1–2',
  'Grades 3–4',
  'Grades 5–6',
]);
export type LessonBand = z.infer<typeof LessonBandSchema>;

export const LessonStrandSchema = z.enum([
  'Plan',
  'Earn',
  'Spend',
  'Save',
  'Protect',
]);
export type LessonStrand = z.infer<typeof LessonStrandSchema>;

export const LessonMissionStepSchema = z.object({
  title: z.string().min(1),
  instructions: z.string().min(1),
});
export type LessonMissionStep = z.infer<typeof LessonMissionStepSchema>;

export const LessonSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  band: LessonBandSchema,
  minutes: z.number().int().positive(),
  strand: LessonStrandSchema,
  buildingBlock: z.string().min(1),
  summary: z.string().min(1),
  objective: z.string().min(1),
  vocabulary: z.array(z.string().min(1)).min(1),
  materials: z.array(z.string().min(1)).min(1),
  warmup: z.string().min(1),
  mission: z.array(LessonMissionStepSchema).min(1),
  reflect: z.array(z.string().min(1)).min(1),
  check: z.string().min(1),
  familyBridge: z.string().min(1),
  productConnection: z.string().min(1),
  // Every lesson must carry both the inclusion/safety note and the
  // standards alignment note — see 01_EXPERIENCE_FOUNDATIONS.md §9's
  // child-safety rules and 04_PERSONA_USE_CASE_TRACEABILITY.md §6's
  // per-lesson "must preserve" clauses. A lesson missing either fails
  // schema validation rather than shipping silently.
  inclusionNote: z.string().min(1),
  standardsNote: z.string().min(1),
});
export type Lesson = z.infer<typeof LessonSchema>;

export const LessonsSchema = z
  .array(LessonSchema)
  .min(1)
  .refine(
    lessons => new Set(lessons.map(l => l.slug)).size === lessons.length,
    { message: 'Lesson slugs must be unique' }
  );
