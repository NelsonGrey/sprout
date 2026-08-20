enum TransactionType { earn, spend }

/// Optional intent tag on an 'earn' transaction — lets a student/teacher
/// mark part of a balance as saved toward something specific vs. held in
/// reserve (the Build a Goal Trail / Plan for the Unexpected starter
/// lessons). Never valid on a 'spend' (see firestore.rules). Mirrors
/// packages/shared/src/index.ts's SavingsLabel.
enum SavingsLabel { goal, justInCase }

SavingsLabel? savingsLabelFromJson(String? value) {
  switch (value) {
    case 'goal':
      return SavingsLabel.goal;
    case 'just_in_case':
      return SavingsLabel.justInCase;
    default:
      return null;
  }
}

String savingsLabelToJson(SavingsLabel value) =>
    value == SavingsLabel.goal ? 'goal' : 'just_in_case';

/// Optional intent tag on a 'spend' transaction — the need/want/it-depends
/// sort from the Need, Want, or Both? starter lesson. Never valid on an
/// 'earn' (see firestore.rules). Mirrors packages/shared/src/index.ts's
/// SpendCategory.
enum SpendCategory { need, want, both }

SpendCategory? spendCategoryFromJson(String? value) {
  switch (value) {
    case 'need':
      return SpendCategory.need;
    case 'want':
      return SpendCategory.want;
    case 'both':
      return SpendCategory.both;
    default:
      return null;
  }
}

String spendCategoryToJson(SpendCategory value) => value.name;

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
    this.savingsLabel,
    this.goalId,
    this.spendCategory,
  });

  final String id;
  final String studentId;
  final TransactionType type;
  final int amountCents;
  final String reason;
  final String createdByUid;
  final DateTime createdAt;
  final SavingsLabel? savingsLabel;

  /// Set alongside savingsLabel: goal when this earn was recorded toward a
  /// specific Goal rather than the generic "goal" label.
  final String? goalId;
  final SpendCategory? spendCategory;
}
