/// Planned-feature flags — Dart mirror of
/// packages/web/src/app/featureFlags.ts. See
/// docs/detailed-design/05_IMPLEMENTATION_HANDOFF.md §4. A flag controls
/// discoverability only; the server-enforced capability check (Firestore
/// rules) is the actual authorization boundary regardless of flag state.
/// All planned features default to disabled until their production data
/// path exists.
enum AppFeature {
  authenticatedLearning,
  massTransactions,
  studentGoals,
  familyContexts,
  districtWorkspace,
}

const Set<AppFeature> _enabledFeatures = {AppFeature.authenticatedLearning};

bool isFeatureEnabled(AppFeature feature) => _enabledFeatures.contains(feature);
