/// Minimal, portfolio-wide user shape. Games needing more should wrap this,
/// not fork the auth service to add fields.
class AppUser {
  const AppUser({required this.uid, this.displayName, this.email});
  final String uid;
  final String? displayName;
  final String? email;
}

/// Google/Apple sign-in behind an interface, matching the pattern already
/// proven in Modulo Squares' login_screen.dart, generalized so every game
/// shares one implementation instead of five forks.
abstract class AuthService {
  Stream<AppUser?> authStateChanges();
  AppUser? get currentUser;

  Future<AppUser> signInWithGoogle();

  /// Throws [UnsupportedError] on Android — Sign in with Apple is iOS/macOS
  /// only. Callers should hide the Apple button on other platforms.
  Future<AppUser> signInWithApple();

  Future<void> signOut();
}
