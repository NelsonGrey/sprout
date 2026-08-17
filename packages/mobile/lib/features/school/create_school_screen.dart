import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/school/school_repository.dart';
import 'package:sprout/widgets/sprout_app_bar.dart';

/// Shown at /school to a signed-in user who isn't a member of any school
/// yet — founding a school makes them its super_admin (BR-1.3.11/1.3.12),
/// with no gating, the same as creating a classroom today. Manual name
/// entry only — web's NCES public-school-directory search has no mobile
/// equivalent yet (follow-up, not this pass).
class CreateSchoolScreen extends StatefulWidget {
  const CreateSchoolScreen({super.key, required this.schoolRepository, required this.user});

  final SchoolRepository schoolRepository;
  final AppUser user;

  @override
  State<CreateSchoolScreen> createState() => _CreateSchoolScreenState();
}

class _CreateSchoolScreenState extends State<CreateSchoolScreen> {
  final _nameController = TextEditingController();
  bool _creating = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final name = _nameController.text.trim();
    if (name.isEmpty || _creating) return;
    setState(() => _creating = true);
    await widget.schoolRepository.createSchool(
      name: name,
      founderUid: widget.user.uid,
      founderDisplayName: widget.user.displayName,
      founderEmail: widget.user.email,
    );
    if (mounted) context.go('/school');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const SproutAppBar(title: 'Set up your school'),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              "You'll be the super admin — the only one who can grant or revoke admin access "
              'for this school. You can delegate day-to-day staff management to someone else '
              'afterward.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            TextField(
              key: const Key('schoolNameField'),
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'School name'),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              key: const Key('createSchoolButton'),
              onPressed: _creating ? null : _create,
              child: const Text('Create School'),
            ),
          ],
        ),
      ),
    );
  }
}
