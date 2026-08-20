/** Planned-feature flags — see docs/detailed-design/05_IMPLEMENTATION_HANDOFF.md
 * §4. A flag controls discoverability only; the server-enforced capability
 * check (Firestore rules) is the actual authorization boundary regardless
 * of flag state. All planned features default to disabled in every
 * environment until their production data path exists — there is no
 * query-string override, so a flag can never be flipped on by a URL. */
export type AppFeature =
  | 'authenticatedLearning'
  | 'massTransactions'
  | 'studentGoals'
  | 'familyContexts'
  | 'districtWorkspace';

const ENABLED_FEATURES: ReadonlySet<AppFeature> = new Set(['authenticatedLearning']);

export function isFeatureEnabled(feature: AppFeature): boolean {
  return ENABLED_FEATURES.has(feature);
}
