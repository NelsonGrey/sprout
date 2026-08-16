import 'dart:async';

import 'auth_service.dart';

/// Deterministic in-memory [AuthService] for tests and local development
/// without hitting real Google/Apple/Firebase endpoints.
class FakeAuthService implements AuthService {
  final _controller = StreamController<AppUser?>.broadcast();
  AppUser? _currentUser;

  @override
  Stream<AppUser?> authStateChanges() => _controller.stream;

  @override
  AppUser? get currentUser => _currentUser;

  @override
  Future<AppUser> signInWithGoogle() async {
    final user = const AppUser(
      uid: 'fake-google-uid',
      displayName: 'Test Player',
      email: 'test@example.com',
    );
    _currentUser = user;
    _controller.add(user);
    return user;
  }

  @override
  Future<AppUser> signInWithApple() async {
    final user = const AppUser(uid: 'fake-apple-uid', displayName: 'Test Player');
    _currentUser = user;
    _controller.add(user);
    return user;
  }

  @override
  Future<void> signOut() async {
    _currentUser = null;
    _controller.add(null);
  }
}
