// GENERATED PLACEHOLDER — replace by running `flutterfire configure` once
// the real sprout-dev/sprout-staging/sprout-prod Firebase projects exist.
// Environment is selected at build time via `--dart-define=FIREBASE_ENV=dev
// |staging|prod` (matches wishlist-wizard's pattern), defaulting to 'dev' so
// an unconfigured build fails safe toward throwaway data rather than prod.
//
// ignore_for_file: type=lint
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static const String firebaseEnv = String.fromEnvironment(
    'FIREBASE_ENV',
    defaultValue: 'dev',
  );

  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
        'DefaultFirebaseOptions have not been configured for web — run '
        '`flutterfire configure` once sprout-$firebaseEnv exists.',
      );
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
      case TargetPlatform.iOS:
      case TargetPlatform.macOS:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for '
          '$defaultTargetPlatform ($firebaseEnv) — run `flutterfire '
          'configure` once sprout-$firebaseEnv exists.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }
}
