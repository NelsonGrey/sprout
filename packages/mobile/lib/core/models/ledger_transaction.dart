enum TransactionType { earn, spend }

/// One immutable earn/spend ledger entry against a single student.
class LedgerTransaction {
  const LedgerTransaction({
    required this.id,
    required this.studentId,
    required this.type,
    required this.amountCents,
    required this.reason,
    required this.createdByUid,
    required this.createdAt,
  });

  final String id;
  final String studentId;
  final TransactionType type;
  final int amountCents;
  final String reason;
  final String createdByUid;
  final DateTime createdAt;
}
