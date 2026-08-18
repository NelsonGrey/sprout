import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/services/auth/auth_service.dart';

enum _AccountMenuAction { signOut, deleteAccount }

/// Replaces the bare sign-out IconButton previously in every top-level
/// screen's [SproutAppBar] actions with a small menu that also surfaces
/// self-service account deletion (Apple/Google app store compliance — see
/// delete_account_screen.dart).
class AccountMenuButton extends StatelessWidget {
  const AccountMenuButton({super.key, required this.authService});

  final AuthService authService;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<_AccountMenuAction>(
      key: const Key('accountMenuButton'),
      icon: const Icon(Icons.account_circle),
      tooltip: 'Account',
      onSelected: (action) {
        switch (action) {
          case _AccountMenuAction.signOut:
            authService.signOut();
          case _AccountMenuAction.deleteAccount:
            context.push('/account/delete');
        }
      },
      itemBuilder: (context) => const [
        PopupMenuItem(
          key: Key('signOutMenuItem'),
          value: _AccountMenuAction.signOut,
          child: Text('Sign out'),
        ),
        PopupMenuItem(
          key: Key('deleteAccountMenuItem'),
          value: _AccountMenuAction.deleteAccount,
          child: Text('Delete account'),
        ),
      ],
    );
  }
}
