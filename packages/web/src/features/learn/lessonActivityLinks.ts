/** Which lessons have a real, currently-shipped product feature to deep-link
 * a mission step to, and what that link should say — UI-only presentation
 * metadata, deliberately kept out of @sprout/shared's canonical Lesson
 * contract (05_IMPLEMENTATION_HANDOFF.md's Slice 3 step 2: preserve every
 * field, don't add to it).
 *
 * Only 5 of the 8 lessons get one: `the-waiting-garden`'s own
 * productConnection text says it "works without an account or device";
 * `interest-joins-the-team` and `the-opportunity-cost-challenge`'s
 * productConnection text says their product mechanic is "not yet complete"
 * / a "can" (future), not built. Linking those to real screens would imply
 * a feature that doesn't exist — see the design doc's rule against
 * changing/misrepresenting canonical content, and the same "don't claim
 * queued success you can't back" principle behind the offline-notice work
 * in Slice 2. */
export const LESSON_ACTIVITY_LINKS: Record<string, string> = {
  'need-want-or-both': 'Try tagging a spend as need, want, or it depends',
  'three-path-plan': 'Try recording an earn and choosing where it goes',
  'goal-trail': 'Try creating or checking a savings goal',
  'classroom-store-budget': 'Try the classroom store',
  'plan-for-the-unexpected': "Try labeling a saved amount as “just in case”",
};

export function activityLinkLabel(slug: string): string | undefined {
  return LESSON_ACTIVITY_LINKS[slug];
}
