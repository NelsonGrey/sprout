import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/app/feature_flags.dart';

enum StudentDestination { today, history, goals }

/// The student-only four-destination nav — Dart mirror of
/// packages/web/src/features/student/StudentNav.tsx: "Student-only
/// accounts receive at most four primary destinations: Today, History,
/// Goals, Learn" (01_EXPERIENCE_FOUNDATIONS.md §5.2). Deliberately not a
/// reuse of AdaptiveShell — that shell renders no chrome at all for a
/// student-only account (see its own doc comment), by design: students
/// never get school/roster/staff/peer navigation. This is its own small
/// bar embedded directly in each Today/History/Goals screen. Learn links
/// to the same role-aware /learn built in Slice 3.
class StudentBottomNav extends StatelessWidget {
  const StudentBottomNav({super.key, required this.current});

  final StudentDestination current;

  @override
  Widget build(BuildContext context) {
    final items = <(StudentDestination?, String, IconData, String)>[
      (StudentDestination.today, 'Today', Icons.spa_outlined, '/'),
      (StudentDestination.history, 'History', Icons.history, '/me/history'),
      (StudentDestination.goals, 'Goals', Icons.track_changes, '/me/goals'),
      if (isFeatureEnabled(AppFeature.authenticatedLearning))
        (null, 'Learn', Icons.menu_book_outlined, '/learn'),
    ];

    return BottomNavigationBar(
      currentIndex: items.indexWhere((item) => item.$1 == current).clamp(
        0,
        items.length - 1,
      ),
      type: BottomNavigationBarType.fixed,
      onTap: (index) => context.go(items[index].$4),
      items: [
        for (final item in items)
          BottomNavigationBarItem(icon: Icon(item.$3), label: item.$2),
      ],
    );
  }
}
