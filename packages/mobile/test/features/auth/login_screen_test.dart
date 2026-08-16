import 'package:flutter/foundation.dart' show TargetPlatform, debugDefaultTargetPlatformOverride;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/auth/fake_auth_service.dart';
import 'package:sprout/features/auth/login_screen.dart';

// debugDefaultTargetPlatformOverride must be reset as the LAST statement of
// each test body, not via tearDown()/addTearDown() — flutter_test's
// _verifyInvariants() runs immediately after the test body returns, before
// any registered teardown callback fires.
void main() {
  testWidgets('shows only the Google button on Android', (tester) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    await tester.pumpWidget(
      MaterialApp(home: LoginScreen(authService: FakeAuthService())),
    );

    expect(find.text('Sign in with Google'), findsOneWidget);
    expect(find.text('Sign in with Apple'), findsNothing);
    debugDefaultTargetPlatformOverride = null;
  });

  testWidgets('shows only the Apple button on iOS', (tester) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    await tester.pumpWidget(
      MaterialApp(home: LoginScreen(authService: FakeAuthService())),
    );

    expect(find.text('Sign in with Apple'), findsOneWidget);
    expect(find.text('Sign in with Google'), findsNothing);
    debugDefaultTargetPlatformOverride = null;
  });

  testWidgets('Google sign-in calls onAuthenticationComplete and updates authStateChanges', (
    tester,
  ) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.android;
    final authService = FakeAuthService();
    var completed = false;
    AppUser? latestUser;
    final subscription = authService.authStateChanges().listen((u) => latestUser = u);

    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          authService: authService,
          onAuthenticationComplete: () => completed = true,
        ),
      ),
    );

    // A single bare pump() rather than pumpAndSettle() or a timed pump():
    // FakeAuthService resolves synchronously and pump() already drains
    // pending microtasks, and advancing animation time further risks
    // triggering the button's ink-splash compositing, which appears to
    // hang under this environment's software Skia renderer.
    await tester.tap(find.text('Sign in with Google'));
    await tester.pump();

    expect(completed, isTrue);
    expect(authService.currentUser, isNotNull);
    expect(latestUser, isNotNull);

    await subscription.cancel();
    debugDefaultTargetPlatformOverride = null;
  });
}
