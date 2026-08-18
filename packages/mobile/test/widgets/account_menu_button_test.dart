import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/services/auth/fake_auth_service.dart';
import 'package:sprout/widgets/account_menu_button.dart';

/// Routed harness so tapping "Delete account" (context.push('/account/delete'))
/// has a GoRouter ancestor to push onto, same pattern as
/// classroom_detail_screen_test.dart's _routedHarness.
Widget _routedHarness(FakeAuthService authService) {
  final router = GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) =>
            Scaffold(appBar: AppBar(actions: [AccountMenuButton(authService: authService)])),
      ),
      GoRoute(
        path: '/account/delete',
        builder: (context, state) => const Scaffold(body: Text('Delete Account Page')),
      ),
    ],
  );
  return MaterialApp.router(routerConfig: router);
}

void main() {
  testWidgets('sign out calls AuthService.signOut', (tester) async {
    final authService = FakeAuthService();
    await authService.signInWithGoogle();
    expect(authService.currentUser, isNotNull);

    await tester.pumpWidget(_routedHarness(authService));

    await tester.tap(find.byKey(const Key('accountMenuButton')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('signOutMenuItem')));
    await tester.pumpAndSettle();

    expect(authService.currentUser, isNull);
  });

  testWidgets('delete account navigates to /account/delete', (tester) async {
    final authService = FakeAuthService();

    await tester.pumpWidget(_routedHarness(authService));

    await tester.tap(find.byKey(const Key('accountMenuButton')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('deleteAccountMenuItem')));
    await tester.pumpAndSettle();

    expect(find.text('Delete Account Page'), findsOneWidget);
  });
}
