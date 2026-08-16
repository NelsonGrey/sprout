import 'dart:async';
import 'dart:io' show Platform;

import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import 'apple_sign_in_nonce.dart';
import 'auth_service.dart';

const _kGoogleAuthScopes = <String>['email'];

/// Real [AuthService], generalized from the pattern proven in Modulo
/// Squares' login_screen.dart: Google Sign-In v7's authenticate() +
/// authorizationClient flow, and Sign in with Apple with a hashed nonce,
/// both bridged into Firebase Auth via signInWithCredential.
class FirebaseAuthService implements AuthService {
  FirebaseAuthService({fb.FirebaseAuth? firebaseAuth, GoogleSignIn? googleSignIn})
      : _firebaseAuth = firebaseAuth ?? fb.FirebaseAuth.instance,
        _googleSignIn = googleSignIn ?? GoogleSignIn.instance;

  final fb.FirebaseAuth _firebaseAuth;
  final GoogleSignIn _googleSignIn;
  bool _googleInitialized = false;

  AppUser? _toAppUser(fb.User? user) => user == null
      ? null
      : AppUser(uid: user.uid, displayName: user.displayName, email: user.email);

  @override
  Stream<AppUser?> authStateChanges() =>
      _firebaseAuth.authStateChanges().map(_toAppUser);

  @override
  AppUser? get currentUser => _toAppUser(_firebaseAuth.currentUser);

  Future<void> _ensureGoogleInitialized() async {
    if (_googleInitialized) return;
    try {
      await _googleSignIn.initialize();
      _googleInitialized = true;
    } catch (e) {
      if (kDebugMode) debugPrint('Google Sign-In init failed: $e');
    }
  }

  @override
  Future<AppUser> signInWithGoogle() async {
    await _ensureGoogleInitialized();

    final googleUser = await _googleSignIn.authenticate();
    final auth = googleUser.authentication;
    final idToken = auth.idToken;
    if (idToken == null) {
      throw StateError('No ID token returned from Google.');
    }

    var authorization = await googleUser.authorizationClient
        .authorizationForScopes(_kGoogleAuthScopes);
    authorization ??=
        await googleUser.authorizationClient.authorizeScopes(_kGoogleAuthScopes);

    final credential = fb.GoogleAuthProvider.credential(
      accessToken: authorization.accessToken,
      idToken: idToken,
    );
    final result = await _firebaseAuth.signInWithCredential(credential);
    return _toAppUser(result.user)!;
  }

  @override
  Future<AppUser> signInWithApple() async {
    if (!Platform.isIOS && !Platform.isMacOS) {
      throw UnsupportedError('Sign in with Apple is iOS/macOS only.');
    }

    final rawNonce = generateAppleSignInNonce();
    final appleCredential = await SignInWithApple.getAppleIDCredential(
      scopes: [
        AppleIDAuthorizationScopes.email,
        AppleIDAuthorizationScopes.fullName,
      ],
      nonce: sha256OfString(rawNonce),
    );
    if (appleCredential.identityToken == null) {
      throw StateError('Apple did not return an identity token.');
    }
    final credential = fb.OAuthProvider('apple.com').credential(
      idToken: appleCredential.identityToken,
      rawNonce: rawNonce,
      accessToken: appleCredential.authorizationCode,
    );
    final result = await _firebaseAuth.signInWithCredential(credential);
    return _toAppUser(result.user)!;
  }

  @override
  Future<AppUser> signInWithEmail(String email, String password) async {
    final result = await _firebaseAuth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
    return _toAppUser(result.user)!;
  }

  @override
  Future<AppUser> signUpWithEmail(String email, String password) async {
    final result = await _firebaseAuth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );
    return _toAppUser(result.user)!;
  }

  @override
  Future<void> sendPasswordResetEmail(String email) {
    return _firebaseAuth.sendPasswordResetEmail(email: email);
  }

  @override
  Future<void> signOut() async {
    await Future.wait([
      _firebaseAuth.signOut(),
      _googleSignIn.signOut(),
    ]);
  }
}
