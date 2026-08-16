import 'package:sprout/core/models/classroom_context.dart';
import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/models/student.dart';

/// Firestore-backed classroom data access, behind an interface so screens
/// can be tested against [FakeClassroomRepository] — same shape as
/// AuthService/FirebaseAuthService/FakeAuthService.
abstract class ClassroomRepository {
  Stream<List<ClassroomContext>> myClassrooms(String ownerUid);

  /// Also upserts `users/{ownerUid}` with [ownerDisplayName]/[ownerEmail] —
  /// the first classroom a teacher creates is when their profile doc is
  /// written.
  Future<ClassroomContext> createClassroom({
    required String name,
    required String ownerUid,
    String? ownerDisplayName,
    String? ownerEmail,
  });

  Stream<List<Student>> studentsInClassroom(String contextId);

  Future<Student> addStudent({
    required String contextId,
    required String displayName,
    required List<String> ownerUids,
  });

  Stream<List<LedgerTransaction>> transactionsForStudent({
    required String contextId,
    required String studentId,
  });

  /// Atomically creates the transaction and updates the student's
  /// [Student.balanceCents] — never two separate writes.
  Future<void> recordTransaction({
    required String contextId,
    required String studentId,
    required TransactionType type,
    required int amountCents,
    required String reason,
    required String createdByUid,
    required List<String> ownerUids,
  });
}
