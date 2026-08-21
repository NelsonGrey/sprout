import 'package:flutter/material.dart';

import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';
import 'package:sprout/features/student/student_bottom_nav.dart';
import 'package:sprout/widgets/reflection_prompt.dart';
import 'package:sprout/widgets/sprout_app_bar.dart';
import 'package:sprout/widgets/transaction_row.dart';

const _spendPrompts = ['What happened?', 'What would you try next time?'];
const _earnPrompts = ['What did you do to earn this?', 'What might you do with it?'];

class _HistoryRow extends StatefulWidget {
  const _HistoryRow({required this.transaction});

  final LedgerTransaction transaction;

  @override
  State<_HistoryRow> createState() => _HistoryRowState();
}

class _HistoryRowState extends State<_HistoryRow> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      key: Key('historyRow-${widget.transaction.id}'),
      onTap: () => setState(() => _open = !_open),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TransactionRow(transaction: widget.transaction),
          if (_open)
            ReflectionPrompt(
              prompts: widget.transaction.type == TransactionType.earn
                  ? _earnPrompts
                  : _spendPrompts,
              defaultOpen: true,
            ),
        ],
      ),
    );
  }
}

/// `M-STUDENT-01`'s "See all history" destination — every past
/// transaction, each expandable into a discussion-only reflection prompt.
/// Mirrors packages/web/src/features/student/HistoryPage.tsx.
class HistoryScreen extends StatelessWidget {
  const HistoryScreen({
    super.key,
    required this.classroomRepository,
    required this.student,
  });

  final ClassroomRepository classroomRepository;
  final Student student;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const SproutAppBar(title: 'History'),
      body: StreamBuilder<List<LedgerTransaction>>(
        stream: classroomRepository.transactionsForStudent(
          contextId: student.contextId!,
          studentId: student.id,
        ),
        builder: (context, snapshot) {
          final transactions = snapshot.data ?? const <LedgerTransaction>[];
          if (transactions.isEmpty) {
            return const Center(child: Text('No transactions yet.'));
          }
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              for (final transaction in transactions)
                _HistoryRow(transaction: transaction),
            ],
          );
        },
      ),
      bottomNavigationBar: const StudentBottomNav(
        current: StudentDestination.history,
      ),
    );
  }
}
