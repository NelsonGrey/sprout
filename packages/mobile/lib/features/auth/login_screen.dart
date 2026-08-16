import 'package:firebase_auth/firebase_auth.dart' show FirebaseAuthException;
import 'package:flutter/foundation.dart'
    show kDebugMode, defaultTargetPlatform, TargetPlatform;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show PlatformException;
import 'package:sign_in_with_apple/sign_in_with_apple.dart'
    show AuthorizationErrorCode, SignInWithAppleAuthorizationException;

import 'package:sprout/core/services/auth/auth_service.dart';

// Dark background matching the app icon's background colour.
const _kBg = Color(0xFF14251B);
const _kAccent = Color(0xFF4CAF50);

/// Sign-in screen backed by [AuthService] — inject the real
/// [FirebaseAuthService] in the app and [FakeAuthService] in tests/widget
/// previews. Google is Android-only, Apple is iOS-only: a deliberate
/// one-provider-per-platform split matching Modulo Squares' auth design, not
/// an oversight. Do not "fix" this to be cross-platform without checking
/// with the app owner first.
///
/// Unlike [AuthService.signInWithGoogle]/[signInWithApple] themselves,
/// cancellation-swallowing and friendly error messages live here rather than
/// in the service, since [FirebaseAuthService] just lets exceptions
/// propagate.
class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key,
    required this.authService,
    this.onAuthenticationComplete,
  });

  final AuthService authService;

  /// Called after a successful sign-in. The app's top-level router normally
  /// relies on [AuthService.authStateChanges] instead of this callback.
  final VoidCallback? onAuthenticationComplete;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _authInProgress = false;

  void _showAuthError(BuildContext context, Object error) {
    if (!context.mounted) return;
    String message;
    if (kDebugMode) {
      if (error is FirebaseAuthException) {
        message = '${error.message ?? error.code}\n\n(code: ${error.code})';
      } else {
        message = error.toString();
      }
    } else {
      if (error is FirebaseAuthException) {
        switch (error.code) {
          case 'user-disabled':
            message = 'This account has been disabled. Please contact support.';
          case 'too-many-requests':
            message = 'Too many attempts. Please wait a moment and try again.';
          case 'network-request-failed':
            message =
                'No internet connection. Please check your network and try again.';
          default:
            message = 'Sign in failed. Please try again.';
        }
      } else {
        message = 'Sign in failed. Please try again.';
      }
    }
    showDialog<void>(
      context: context,
      builder:
          (_) => AlertDialog(
            title: const Text('Sign-in failed'),
            content: Text(message),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('OK'),
              ),
            ],
          ),
    );
  }

  Future<void> _signInWithGoogle(BuildContext context) async {
    if (_authInProgress) return;
    setState(() => _authInProgress = true);
    try {
      await widget.authService.signInWithGoogle();
      widget.onAuthenticationComplete?.call();
    } catch (e) {
      if (e is PlatformException && e.code == 'sign_in_canceled') return;
      _showAuthError(context, e);
    } finally {
      if (mounted) setState(() => _authInProgress = false);
    }
  }

  Future<void> _signInWithApple(BuildContext context) async {
    if (_authInProgress) return;
    setState(() => _authInProgress = true);
    try {
      await widget.authService.signInWithApple();
      widget.onAuthenticationComplete?.call();
    } catch (e) {
      if (e is SignInWithAppleAuthorizationException &&
          e.code == AuthorizationErrorCode.canceled) {
        return;
      }
      _showAuthError(context, e);
    } finally {
      if (mounted) setState(() => _authInProgress = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _kBg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            children: [
              const SizedBox(height: 60),
              // TODO(branding): swap for the real app icon once designed —
              // no assets/icons/icon.png exists yet at scaffold time.
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  color: _kAccent,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(Icons.eco, size: 52, color: Colors.white),
              ),
              const SizedBox(height: 18),
              const Text(
                'Sprout',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Grow good habits together',
                style: TextStyle(fontSize: 15, color: Colors.white54),
              ),
              const SizedBox(height: 48),
              const Text(
                'Sign in to manage your classroom or family account.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Colors.white70),
              ),
              const SizedBox(height: 28),
              if (defaultTargetPlatform == TargetPlatform.android) ...[
                _AuthButton(
                  label: 'Sign in with Google',
                  icon: Icons.g_mobiledata,
                  onPressed:
                      _authInProgress ? null : () => _signInWithGoogle(context),
                ),
                const SizedBox(height: 12),
              ],
              if (defaultTargetPlatform == TargetPlatform.iOS) ...[
                _AuthButton(
                  label: 'Sign in with Apple',
                  icon: Icons.apple,
                  onPressed:
                      _authInProgress ? null : () => _signInWithApple(context),
                ),
                const SizedBox(height: 12),
              ],
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}

class _AuthButton extends StatelessWidget {
  const _AuthButton({
    required this.label,
    required this.icon,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: _kAccent,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
        onPressed: onPressed,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 22, color: Colors.white),
            const SizedBox(width: 10),
            Flexible(
              child: Text(
                label,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Colors.white, fontSize: 15),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
