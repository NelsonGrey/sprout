import 'package:flutter/material.dart';

import 'package:sprout/core/services/auth/auth_service.dart';

/// Placeholder landing screen shown once a user is signed in. Replace with
/// the real classroom/family dashboard as the product takes shape.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.authService, required this.user});

  final AuthService authService;
  final AppUser user;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sprout'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: authService.signOut,
          ),
        ],
      ),
      body: Center(
        child: Text('Signed in as ${user.displayName ?? user.email ?? user.uid}'),
      ),
    );
  }
}
