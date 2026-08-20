/// The sprout-functions bulk-transaction endpoint's response shape —
/// mirrors packages/web/src/lib/api.ts's BulkTransactionOutcome. Never
/// collapse this into a single success/failure boolean: a partial result
/// (some recipients succeeded, some failed) must stay visible so the UI
/// never says "Done" when it wasn't.
class BulkTransactionResult {
  const BulkTransactionResult({required this.succeeded, required this.failed});

  final List<String> succeeded;
  final List<BulkTransactionFailure> failed;

  factory BulkTransactionResult.fromJson(Map<String, dynamic> json) {
    return BulkTransactionResult(
      succeeded: List<String>.from(json['succeeded'] as List? ?? const []),
      failed: (json['failed'] as List? ?? const [])
          .map((f) => BulkTransactionFailure.fromJson(f as Map<String, dynamic>))
          .toList(),
    );
  }
}

class BulkTransactionFailure {
  const BulkTransactionFailure({required this.studentId, required this.error});

  final String studentId;
  final String error;

  factory BulkTransactionFailure.fromJson(Map<String, dynamic> json) {
    return BulkTransactionFailure(studentId: json['studentId'] as String, error: json['error'] as String);
  }
}
