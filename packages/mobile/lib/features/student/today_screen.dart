import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/core/models/goal.dart';
import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/features/student/student_bottom_nav.dart';
import 'package:sprout/widgets/account_menu_button.dart';
import 'package:sprout/widgets/goal_progress_card.dart';
import 'package:sprout/widgets/reflection_prompt.dart';
import 'package:sprout/widgets/sprout_app_bar.dart';
import 'package:sprout/widgets/transaction_row.dart';

/// `M-STUDENT-01` — the student-only "Today" home: balance, one current
/// goal, the last three transactions, a neutral reflection prompt, and a
/// link into full history. Read-only throughout — no earn/spend controls,
/// no goal create/delete (firestore.rules never grants a linked student
/// write access to a goal or transaction, only staff/award-scoped
/// adults). Mirrors packages/web/src/features/student/TodayPage.tsx.
class TodayScreen extends StatelessWidget {
  const TodayScreen({
    super.key,
    required this.classroomRepository,
    required this.authService,
    required this.student,
  });

  final ClassroomRepository classroomRepository;
  final AuthService authService;
  final Student student;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: SproutAppBar(
        title: student.contextName ?? 'Today',
        actions: [AccountMenuButton(authService: authService)],
      ),
      body: StreamBuilder<List<LedgerTransaction>>(
        stream: classroomRepository.transactionsForStudent(
          contextId: student.contextId!,
          studentId: student.id,
        ),
        builder: (context, txSnapshot) {
          final transactions = txSnapshot.data ?? const <LedgerTransaction>[];
          final recent = transactions.take(3).toList();

          return StreamBuilder<List<Goal>>(
            stream: classroomRepository.goalsForStudent(student.id),
            builder: (context, goalSnapshot) {
              final goals = goalSnapshot.data ?? const <Goal>[];
              final currentGoal = goals.isNotEmpty ? goals.first : null;

              return ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.inverseSurface,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Your Sprout balance',
                          style: TextStyle(
                            color: Theme.of(
                              context,
                            ).colorScheme.onInverseSurface.withValues(
                              alpha: 0.7,
                            ),
                          ),
                        ),
                        Text(
                          '\$${(student.balanceCents / 100).toStringAsFixed(2)}',
                          style: Theme.of(context).textTheme.headlineMedium
                              ?.copyWith(
                                color: Theme.of(
                                  context,
                                ).colorScheme.onInverseSurface,
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        Text(
                          'Practice money—not real money.',
                          style: TextStyle(
                            color: Theme.of(
                              context,
                            ).colorScheme.onInverseSurface.withValues(
                              alpha: 0.7,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (currentGoal != null) ...[
                    const SizedBox(height: 12),
                    GoalProgressCard(goal: currentGoal),
                  ],
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Recent',
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      TextButton(
                        key: const Key('seeAllHistoryButton'),
                        onPressed: () => context.go('/me/history'),
                        child: const Text('See all history'),
                      ),
                    ],
                  ),
                  if (recent.isEmpty)
                    const Text('No transactions yet.')
                  else
                    for (final transaction in recent)
                      TransactionRow(transaction: transaction),
                  const SizedBox(height: 16),
                  const ReflectionPrompt(
                    prompts: ['What happened today?', 'What might you try next?'],
                  ),
                ],
              );
            },
          );
        },
      ),
      bottomNavigationBar: const StudentBottomNav(
        current: StudentDestination.today,
      ),
    );
  }
}
