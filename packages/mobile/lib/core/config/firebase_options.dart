// Real config for the `nelsongrey-sprout-dev` Firebase project, apps
// registered via the Firebase MCP tooling (bundle/package id
// com.sproutstreak.app.{ios,android} — the org-unbranded convention shared
// with vehicle-vitals/wishlist-wizard, not com.nelsongrey.*; the project ID
// itself stays nelsongrey-sprout-dev since GCP project IDs are permanent
// once created — only the app-level bundle/package IDs and product name
// changed when "Sprout" became "Sprout Streak"). Web and macOS remain
// unconfigured — packages/web (React) is the web client, and macOS isn't a
// TRD §1.2-supported platform.
// Environment is selected at build time via `--dart-define=FIREBASE_ENV=dev
// |staging|prod` (matches wishlist-wizard's pattern); only 'dev' is wired up
// so far — staging/prod need their own app registrations before release.
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

  static const FirebaseOptions _dev_android = FirebaseOptions(
    apiKey: 'AIzaSyB7dOjDqUYk5zcXsTX8JVWur4JdRjnGbZY',
    appId: '1:968230602171:android:5b84a930f0940ea930709e',
    messagingSenderId: '968230602171',
    projectId: 'nelsongrey-sprout-dev',
    storageBucket: 'nelsongrey-sprout-dev.firebasestorage.app',
  );

  static const FirebaseOptions _dev_ios = FirebaseOptions(
    apiKey: 'AIzaSyASDDXwQT8SMBzglwoWoLd4iVm5ClEnE20',
    appId: '1:968230602171:ios:b9567a054a95e71430709e',
    messagingSenderId: '968230602171',
    projectId: 'nelsongrey-sprout-dev',
    storageBucket: 'nelsongrey-sprout-dev.firebasestorage.app',
    iosBundleId: 'com.sproutstreak.app.ios',
  );

  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
        'DefaultFirebaseOptions have not been configured for web — use '
        'packages/web (React) instead of the Flutter web target.',
      );
    }
    if (firebaseEnv != 'dev') {
      throw UnsupportedError(
        'DefaultFirebaseOptions have not been configured for '
        '$firebaseEnv — only \'dev\' is wired up so far.',
      );
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return _dev_android;
      case TargetPlatform.iOS:
        return _dev_ios;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for '
          '$defaultTargetPlatform.',
        );
    }
  }
}
