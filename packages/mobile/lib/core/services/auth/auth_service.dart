/// Minimal, portfolio-wide user shape. Games needing more should wrap this,
/// not fork the auth service to add fields.
class AppUser {
  const AppUser({required this.uid, this.displayName, this.email, this.providerId});
  final String uid;
  final String? displayName;
  final String? email;

  /// 'google.com' / 'apple.com' / 'password', mirroring Firebase Auth's
  /// User.providerData[0].providerId — which sign-in provider to
  /// reauthenticate with before a self-service account deletion (Firebase
  /// throws requires-recent-login otherwise). Null only if this AppUser
  /// wasn't sourced from a real sign-in (shouldn't happen in practice).
  final String? providerId;
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

  /// Email/password, available on every platform alongside the
  /// platform-specific OS sign-in above.
  Future<AppUser> signInWithEmail(String email, String password);
  Future<AppUser> signUpWithEmail(String email, String password);
  Future<void> sendPasswordResetEmail(String email);

  Future<void> signOut();

  // ---- Self-service account deletion (Apple/Google app store compliance)

  /// Re-proves identity via the matching provider immediately before
  /// [deleteAccount] — Firebase Auth's delete() throws
  /// auth/requires-recent-login otherwise. Callers pick which of these
  /// three to call based on [AppUser.providerId].
  Future<void> reauthenticateWithGoogle();

  /// Throws [UnsupportedError] on Android, same restriction as
  /// [signInWithApple].
  Future<void> reauthenticateWithApple();

  Future<void> reauthenticateWithEmail(String password);

  /// Deletes the Firebase Auth account itself. Must be called last in the
  /// deletion sequence — every Firestore cleanup step needs to still be
  /// authenticated as this uid — and must be immediately preceded by one of
  /// the reauthenticate* calls above.
  Future<void> deleteAccount();
}
