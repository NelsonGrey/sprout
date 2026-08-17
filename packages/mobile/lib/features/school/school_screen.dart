import 'package:flutter/material.dart';

import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/school/school_repository.dart';
import 'package:sprout/features/school/create_school_screen.dart';
import 'package:sprout/features/school/school_admin_screen.dart';

/// Routed at /school. A signed-in user with no school yet can found one;
/// otherwise shows their school. Multi-school membership/switching is
/// deferred — the first schoolId wins (mirrors web's SchoolPage).
class SchoolScreen extends StatelessWidget {
  const SchoolScreen({super.key, required this.schoolRepository, required this.user});

  final SchoolRepository schoolRepository;
  final AppUser user;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<String>>(
      stream: schoolRepository.schoolIdsForUser(user.uid),
      builder: (context, snapshot) {
        final schoolIds = snapshot.data ?? const <String>[];
        if (schoolIds.isEmpty) {
          return CreateSchoolScreen(schoolRepository: schoolRepository, user: user);
        }
        return SchoolAdminScreen(
          schoolRepository: schoolRepository,
          user: user,
          schoolId: schoolIds.first,
        );
      },
    );
  }
}
