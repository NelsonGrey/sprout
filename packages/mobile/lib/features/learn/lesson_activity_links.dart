/// Which lessons have a real, currently-shipped product feature to deep-link
/// a mission step to, and what that link should say — UI-only presentation
/// metadata kept out of the canonical lesson content. Dart mirror of
/// packages/web/src/features/learn/lessonActivityLinks.ts — see that file's
/// doc comment for why only 5 of the 8 lessons appear here.
const Map<String, String> lessonActivityLinks = {
  'need-want-or-both': 'Try tagging a spend as need, want, or it depends',
  'three-path-plan': 'Try recording an earn and choosing where it goes',
  'goal-trail': 'Try creating or checking a savings goal',
  'classroom-store-budget': 'Try the classroom store',
  'plan-for-the-unexpected': 'Try labeling a saved amount as "just in case"',
};

String? activityLinkLabel(String slug) => lessonActivityLinks[slug];
