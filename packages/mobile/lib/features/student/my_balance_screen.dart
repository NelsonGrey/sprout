import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'package:sprout/app/feature_flags.dart';
import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/services/auth/auth_service.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/widgets/account_menu_button.dart';
import 'package:sprout/widgets/sprout_app_bar.dart';

/// A student's own read-only balance and transaction history — no
/// earn/spend controls. This is the entire student-facing experience
/// (BR-1.3.3/1.4.1): sign in with the same real account a teacher would
/// use, land here automatically instead of "My Classrooms" (see the
/// routing decision in [LandingScreen]). The one navigation entry point is
/// the learning library (Slice 3) — full student nav is Slice 4 scope, not
/// built here.
class MyBalanceScreen extends StatelessWidget {
  const MyBalanceScreen({
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
        title: student.contextName ?? 'My Balance',
        actions: [
          if (isFeatureEnabled(AppFeature.authenticatedLearning))
            IconButton(
              icon: const Icon(Icons.menu_book_rounded),
              tooltip: 'Learning library',
              onPressed: () => context.push('/learn'),
            ),
          AccountMenuButton(authService: authService),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              '\$${(student.balanceCents / 100).toStringAsFixed(2)}',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ),
          Expanded(
            child: StreamBuilder<List<LedgerTransaction>>(
              stream: classroomRepository.transactionsForStudent(
                contextId: student.contextId!,
                studentId: student.id,
              ),
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }
                final transactions = snapshot.data!;
                if (transactions.isEmpty) {
                  return const Center(child: Text('No transactions yet.'));
                }
                return ListView.builder(
                  itemCount: transactions.length,
                  itemBuilder: (context, index) {
                    final transaction = transactions[index];
                    final sign = transaction.type == TransactionType.earn ? '+' : '-';
                    return ListTile(
                      title: Text(transaction.reason),
                      trailing: Text('$sign\$${(transaction.amountCents / 100).toStringAsFixed(2)}'),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
