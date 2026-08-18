import 'package:firebase_auth/firebase_auth.dart' show FirebaseAuthException;
import 'package:flutter_test/flutter_test.dart';

import 'package:sprout/core/services/auth/fake_auth_service.dart';

/// Confirms the self-service account deletion fakes added to
/// [FakeAuthService] are callable and can be made to throw for error-path
/// widget tests (see delete_account_screen_test.dart), mirroring how
/// _emailUsers already simulates sign-in failure.
void main() {
  group('reauthenticate*', () {
    test('reauthenticateWithGoogle succeeds and records the call', () async {
      final service = FakeAuthService();
      await service.reauthenticateWithGoogle();
      expect(service.reauthenticateCalled, isTrue);
    });

    test('reauthenticateWithApple succeeds and records the call', () async {
      final service = FakeAuthService();
      await service.reauthenticateWithApple();
      expect(service.reauthenticateCalled, isTrue);
    });

    test('reauthenticateWithEmail succeeds and records the call', () async {
      final service = FakeAuthService();
      await service.reauthenticateWithEmail('correct-password');
      expect(service.reauthenticateCalled, isTrue);
    });

    test('reauthenticateError makes every reauthenticate* method throw', () async {
      final service = FakeAuthService()
        ..reauthenticateError = FirebaseAuthException(code: 'wrong-password');

      await expectLater(service.reauthenticateWithEmail('nope'), throwsA(isA<FirebaseAuthException>()));
      await expectLater(service.reauthenticateWithGoogle(), throwsA(isA<FirebaseAuthException>()));
      await expectLater(service.reauthenticateWithApple(), throwsA(isA<FirebaseAuthException>()));
    });
  });

  group('deleteAccount', () {
    test('succeeds, records the call, and clears the current user', () async {
      final service = FakeAuthService();
      await service.signInWithGoogle();
      expect(service.currentUser, isNotNull);

      await service.deleteAccount();

      expect(service.deleteAccountCalled, isTrue);
      expect(service.currentUser, isNull);
    });

    test('deleteAccountError makes deleteAccount throw', () async {
      final service = FakeAuthService()..deleteAccountError = FirebaseAuthException(code: 'requires-recent-login');
      await expectLater(service.deleteAccount(), throwsA(isA<FirebaseAuthException>()));
    });
  });
}
