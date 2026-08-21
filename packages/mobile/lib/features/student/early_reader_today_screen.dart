import 'package:flutter/material.dart';

import 'package:sprout/core/models/goal.dart';
import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/widgets/account_menu_button.dart';
import 'package:sprout/widgets/goal_progress_card.dart';
import 'package:sprout/widgets/read_aloud_button.dart';
import 'package:sprout/widgets/sprout_app_bar.dart';

/// The Pre-K–2 presentation — 01_EXPERIENCE_FOUNDATIONS.md §5.2: "Pre-K–2
/// may collapse these into one scrollable Today view with adult-guided
/// cards." No History/Goals/Learn destinations exist here at all. Short
/// sentences paired with icons and read-aloud per §9, no dense
/// transaction table — just the single most recent change. Selected by
/// isEarlyReaderPresentation(), never a self-reported age. Mirrors
/// packages/web/src/features/student/EarlyReaderTodayPage.tsx.
class EarlyReaderTodayScreen extends StatelessWidget {
  const EarlyReaderTodayScreen({
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
    final balanceText =
        'You have ${(student.balanceCents / 100).toStringAsFixed(2)} dollars.';

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
          final latest = transactions.isNotEmpty ? transactions.first : null;
          final latestText = latest == null
              ? null
              : 'You ${latest.type == TransactionType.earn ? 'earned' : 'spent'} '
                    '${(latest.amountCents / 100).toStringAsFixed(2)} dollars for ${latest.reason}.';

          return StreamBuilder<List<Goal>>(
            stream: classroomRepository.goalsForStudent(student.id),
            builder: (context, goalSnapshot) {
              final goals = goalSnapshot.data ?? const <Goal>[];

              return ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.inverseSurface,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            balanceText,
                            style: Theme.of(context).textTheme.titleLarge
                                ?.copyWith(
                                  color: Theme.of(
                                    context,
                                  ).colorScheme.onInverseSurface,
                                ),
                          ),
                        ),
                        ReadAloudButton(text: balanceText),
                      ],
                    ),
                  ),
                  if (goals.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    GoalProgressCard(goal: goals.first),
                  ],
                  if (latest != null && latestText != null) ...[
                    const SizedBox(height: 12),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            Icon(
                              latest.type == TransactionType.earn
                                  ? Icons.add_circle
                                  : Icons.remove_circle,
                              color: latest.type == TransactionType.earn
                                  ? Colors.green
                                  : Colors.deepOrange,
                            ),
                            const SizedBox(width: 8),
                            Expanded(child: Text(latestText)),
                            ReadAloudButton(text: latestText),
                          ],
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: const [
                              Icon(Icons.auto_awesome, size: 16),
                              SizedBox(width: 6),
                              Text(
                                'Pause · Choose · Grow',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          const Text('Ask a grown-up: What happened today?'),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          );
        },
      ),
    );
  }
}
