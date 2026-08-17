import 'package:flutter/material.dart';

/// Shared AppBar for every non-root screen, so back-button/title/actions
/// styling has exactly one code path. go_router already auto-supplies the
/// back chevron when a route isn't top-of-stack; this centralizes
/// everything else around it.
class SproutAppBar extends StatelessWidget implements PreferredSizeWidget {
  const SproutAppBar({super.key, required this.title, this.actions});

  final String title;
  final List<Widget>? actions;

  @override
  Widget build(BuildContext context) {
    return AppBar(title: Text(title), actions: actions);
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}
