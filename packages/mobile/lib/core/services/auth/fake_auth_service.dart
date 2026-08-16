import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart' show FirebaseAuthException;

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

  // email -> password, simulating Firebase Auth's email/password provider
  // well enough to test sign-up/sign-in/wrong-password without a real
  // backend.
  final Map<String, String> _emailUsers = {};

  @override
  Future<AppUser> signInWithEmail(String email, String password) async {
    if (_emailUsers[email] != password) {
      throw FirebaseAuthException(code: 'invalid-credential');
    }
    final user = AppUser(uid: 'fake-email-$email', displayName: null, email: email);
    _currentUser = user;
    _controller.add(user);
    return user;
  }

  @override
  Future<AppUser> signUpWithEmail(String email, String password) async {
    if (_emailUsers.containsKey(email)) {
      throw FirebaseAuthException(code: 'email-already-in-use');
    }
    _emailUsers[email] = password;
    final user = AppUser(uid: 'fake-email-$email', displayName: null, email: email);
    _currentUser = user;
    _controller.add(user);
    return user;
  }

  @override
  Future<void> sendPasswordResetEmail(String email) async {}

  @override
  Future<void> signOut() async {
    _currentUser = null;
    _controller.add(null);
  }
}
