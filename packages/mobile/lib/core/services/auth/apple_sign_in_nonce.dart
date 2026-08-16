import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';

const _kNonceCharset =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';

/// A cryptographically random nonce for the Sign in with Apple replay-attack
/// protection flow: pass the raw nonce to Firebase, the sha256 of it to
/// Apple.
String generateAppleSignInNonce([int length = 32]) {
  final random = Random.secure();
  return List.generate(
    length,
    (_) => _kNonceCharset[random.nextInt(_kNonceCharset.length)],
  ).join();
}

String sha256OfString(String input) {
  final bytes = utf8.encode(input);
  return sha256.convert(bytes).toString();
}
