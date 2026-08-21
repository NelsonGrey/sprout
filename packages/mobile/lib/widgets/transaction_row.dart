import 'package:flutter/material.dart';

import 'package:sprout/core/models/ledger_transaction.dart';

const _months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

String shortDate(DateTime date) => '${_months[date.month - 1]} ${date.day}';

const _tagLabel = {
  SavingsLabel.goal: 'Goal',
  SavingsLabel.justInCase: 'Just in case',
  SpendCategory.need: 'Need',
  SpendCategory.want: 'Want',
  SpendCategory.both: 'It depends',
};

/// 01_EXPERIENCE_FOUNDATIONS.md §10: "Screen readers announce simulated
/// context, transaction type, signed amount, reason, date, and goal/
/// category tag" — the visible layout (a color + a $ sign) doesn't convey
/// earn/spend to TalkBack/VoiceOver on its own, so this composes the full
/// sentence into one [Semantics] label rather than letting the row's
/// child Text widgets announce themselves piecemeal. Dart mirror of
/// packages/web/src/features/student/TransactionRow.tsx.
class TransactionRow extends StatelessWidget {
  const TransactionRow({super.key, required this.transaction});

  final LedgerTransaction transaction;

  String get _label {
    final verb = transaction.type == TransactionType.earn
        ? 'Earned'
        : 'Spent';
    final amount = (transaction.amountCents / 100).toStringAsFixed(2);
    final date = shortDate(transaction.createdAt);
    final tag = transaction.savingsLabel != null
        ? _tagLabel[transaction.savingsLabel]
        : (transaction.spendCategory != null
              ? _tagLabel[transaction.spendCategory]
              : null);
    return '$verb \$$amount, ${transaction.reason}, $date${tag != null ? ', tagged $tag' : ''}';
  }

  @override
  Widget build(BuildContext context) {
    final amount = (transaction.amountCents / 100).toStringAsFixed(2);
    final sign = transaction.type == TransactionType.earn ? '+' : '-';
    final color = transaction.type == TransactionType.earn
        ? Colors.green
        : Colors.red;

    return Semantics(
      label: _label,
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(transaction.reason),
                  Text(
                    shortDate(transaction.createdAt),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            Text(
              '$sign\$$amount',
              style: TextStyle(color: color, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}
