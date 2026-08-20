/// Base URL for the sprout-functions `api` Cloud Function, reached through
/// Firebase Hosting's `/api/**` rewrite (see firebase.json in the sprout
/// repo) rather than the function's raw Cloud Run URL, matching how the
/// web client calls it as a same-origin relative path. Only one Firebase
/// project is configured for mobile so far (see firebase_options.dart —
/// there's no staging/prod option block yet), so this stays a single
/// constant until mobile gets real per-environment build flavors.
abstract final class ApiConfig {
  static const baseUrl = 'https://nelsongrey-sprout-dev.web.app';
}
