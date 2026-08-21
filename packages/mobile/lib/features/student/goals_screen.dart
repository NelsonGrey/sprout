import 'package:flutter/material.dart';

import 'package:sprout/core/models/goal.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/features/student/student_bottom_nav.dart';
import 'package:sprout/widgets/goal_progress_card.dart';
import 'package:sprout/widgets/spend_detour_preview.dart';
import 'package:sprout/widgets/sprout_app_bar.dart';

/// `M-STUDENT-02` — every active and achieved goal, read-only (creation
/// stays adult-only — see firestore.rules). Each unachieved goal gets a
/// spend-detour preview so a student can see how a hypothetical spend
/// would change their trail "without blocking the choice or applying
/// shame." Mirrors packages/web/src/features/student/GoalsPage.tsx.
class GoalsScreen extends StatelessWidget {
  const GoalsScreen({
    super.key,
    required this.classroomRepository,
    required this.student,
  });

  final ClassroomRepository classroomRepository;
  final Student student;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const SproutAppBar(title: 'Goals'),
      body: StreamBuilder<List<Goal>>(
        stream: classroomRepository.goalsForStudent(student.id),
        builder: (context, snapshot) {
          final goals = snapshot.data ?? const <Goal>[];
          if (goals.isEmpty) {
            return const Center(
              child: Text('No goals yet — ask an adult to set one up with you.'),
            );
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              for (final goal in goals)
                GoalProgressCard(
                  goal: goal,
                  footer: goal.savedCents < goal.targetCents
                      ? SpendDetourPreview(goal: goal)
                      : null,
                ),
            ],
          );
        },
      ),
      bottomNavigationBar: const StudentBottomNav(
        current: StudentDestination.goals,
      ),
    );
  }
}
