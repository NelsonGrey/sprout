import 'package:sprout/core/models/bulk_transaction_result.dart';
import 'package:sprout/core/models/classroom_context.dart';
import 'package:sprout/core/models/goal.dart';
import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/models/store_item.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/models/student_import_row.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';

/// In-memory [ClassroomRepository] for widget tests — mirrors
/// FakeAuthService's role for AuthService.
class FakeClassroomRepository implements ClassroomRepository {
  final Map<String, ClassroomContext> _contexts = {};
  final Map<String, Student> _students = {};
  final Map<String, List<LedgerTransaction>> _transactionsByStudent = {};
  final Map<String, Set<String>> _studentIdsByContext = {};
  final Map<String, PendingStudentLink> _pendingStudentLinksByEmail = {};
  final Map<String, List<Goal>> _goalsByStudent = {};
  final Map<String, List<StoreItem>> _storeItemsByContext = {};
  // '$idempotencyKey:$studentId' pairs already applied by
  // recordBulkTransaction — mirrors the real endpoint's per-recipient
  // deterministic-doc-id idempotency so widget tests can exercise retry
  // behavior without a live emulator.
  final Set<String> _processedBulkKeys = {};

  String _normalizeEmail(String email) => email.trim().toLowerCase();

  int _nextId = 0;
  String _newId() => 'fake-${_nextId++}';

  @override
  Stream<List<ClassroomContext>> myClassrooms(String ownerUid) {
    return Stream.value(
      _contexts.values.where((c) => c.ownerUids.contains(ownerUid)).toList(),
    );
  }

  @override
  Stream<List<ClassroomContext>> classroomsInSchool(
    String schoolId, {
    List<String>? gradeLevels,
  }) {
    return Stream.value(
      _contexts.values
          .where(
            (c) =>
                c.schoolId == schoolId &&
                (gradeLevels == null || gradeLevels.contains(c.gradeLevel)),
          )
          .toList(),
    );
  }

  @override
  Stream<ClassroomContext?> classroom(String contextId) {
    return Stream.value(_contexts[contextId]);
  }

  @override
  Future<void> updateClassroom(
    String contextId, {
    String? name,
    String? gradeLevel,
  }) async {
    final current = _contexts[contextId];
    if (current == null) return;
    _contexts[contextId] = ClassroomContext(
      id: current.id,
      name: name ?? current.name,
      ownerUids: current.ownerUids,
      schoolId: current.schoolId,
      gradeLevel: gradeLevel ?? current.gradeLevel,
    );
  }

  @override
  Future<void> deleteClassroom(String contextId) async {
    _contexts.remove(contextId);
    _studentIdsByContext.remove(contextId);
  }

  @override
  Future<ClassroomContext> createClassroom({
    required String name,
    required String ownerUid,
    String? ownerDisplayName,
    String? ownerEmail,
    String? schoolId,
    String? gradeLevel,
  }) async {
    final context = ClassroomContext(
      id: _newId(),
      name: name,
      ownerUids: [ownerUid],
      schoolId: schoolId,
      gradeLevel: gradeLevel,
    );
    _contexts[context.id] = context;
    _studentIdsByContext[context.id] = {};
    return context;
  }

  @override
  Stream<List<Student>> studentsInClassroom(String contextId) {
    final ids = _studentIdsByContext[contextId] ?? {};
    return Stream.value(
      ids
          .map((id) => _students[id]!)
          .where((s) => s.archivedAt == null)
          .toList(),
    );
  }

  @override
  Stream<List<Student>> studentsInSchool(String schoolId) {
    return Stream.value(
      _students.values.where((s) => s.schoolId == schoolId).toList(),
    );
  }

  @override
  Future<Student> addStudent({
    required String contextId,
    required String firstName,
    required String lastName,
    required List<String> ownerUids,
    String? studentId,
    String? schoolId,
    String? gradeLevel,
    String? contextName,
  }) async {
    final student = Student(
      id: _newId(),
      firstName: firstName,
      lastName: lastName,
      displayName: combineDisplayName(firstName, lastName),
      studentId: studentId,
      balanceCents: 0,
      ownerUids: ownerUids,
      schoolId: schoolId,
      gradeLevel: gradeLevel,
      contextId: contextId,
      contextName: contextName,
    );
    _students[student.id] = student;
    _studentIdsByContext.putIfAbsent(contextId, () => {}).add(student.id);
    _transactionsByStudent[student.id] = [];
    return student;
  }

  @override
  Future<void> updateStudent(
    String id, {
    String? firstName,
    String? lastName,
    String? studentId,
    String? gradeLevel,
  }) async {
    final current = _students[id];
    if (current == null) return;
    final newFirst = firstName ?? current.firstName;
    final newLast = lastName ?? current.lastName;
    _students[id] = Student(
      id: current.id,
      firstName: newFirst,
      lastName: newLast,
      displayName: firstName != null && lastName != null
          ? combineDisplayName(newFirst, newLast)
          : current.displayName,
      studentId: studentId ?? current.studentId,
      balanceCents: current.balanceCents,
      ownerUids: current.ownerUids,
      schoolId: current.schoolId,
      gradeLevel: gradeLevel ?? current.gradeLevel,
      contextId: current.contextId,
      contextName: current.contextName,
      linkedUid: current.linkedUid,
      archivedAt: current.archivedAt,
    );
  }

  @override
  Future<void> deleteStudent(String studentId) async {
    _students.remove(studentId);
    _transactionsByStudent.remove(studentId);
    for (final ids in _studentIdsByContext.values) {
      ids.remove(studentId);
    }
  }

  void _reassignContext(String studentId, String contextId) {
    for (final ids in _studentIdsByContext.values) {
      ids.remove(studentId);
    }
    _studentIdsByContext.putIfAbsent(contextId, () => {}).add(studentId);
  }

  @override
  Future<void> bulkMoveStudents(
    List<String> studentIds, {
    required String contextId,
    required List<String> ownerUids,
    String? schoolId,
    String? gradeLevel,
    String? contextName,
  }) async {
    for (final id in studentIds) {
      final current = _students[id];
      if (current == null) continue;
      _students[id] = Student(
        id: current.id,
        firstName: current.firstName,
        lastName: current.lastName,
        displayName: current.displayName,
        studentId: current.studentId,
        balanceCents: current.balanceCents,
        ownerUids: ownerUids,
        schoolId: schoolId ?? current.schoolId,
        gradeLevel: gradeLevel ?? current.gradeLevel,
        contextId: contextId,
        contextName: contextName ?? current.contextName,
        linkedUid: current.linkedUid,
        archivedAt: current.archivedAt,
      );
      _reassignContext(id, contextId);
    }
  }

  @override
  Future<void> bulkArchiveStudents(List<String> studentIds) async {
    for (final id in studentIds) {
      final current = _students[id];
      if (current == null) continue;
      _students[id] = Student(
        id: current.id,
        firstName: current.firstName,
        lastName: current.lastName,
        displayName: current.displayName,
        studentId: current.studentId,
        balanceCents: current.balanceCents,
        ownerUids: current.ownerUids,
        schoolId: current.schoolId,
        gradeLevel: current.gradeLevel,
        contextId: current.contextId,
        contextName: current.contextName,
        linkedUid: current.linkedUid,
        archivedAt: DateTime.now(),
      );
    }
  }

  @override
  Future<void> restoreStudents(
    List<String> studentIds, {
    required String contextId,
    required List<String> ownerUids,
    String? schoolId,
    String? gradeLevel,
    String? contextName,
  }) async {
    for (final id in studentIds) {
      final current = _students[id];
      if (current == null) continue;
      _students[id] = Student(
        id: current.id,
        firstName: current.firstName,
        lastName: current.lastName,
        displayName: current.displayName,
        studentId: current.studentId,
        balanceCents: current.balanceCents,
        ownerUids: ownerUids,
        schoolId: schoolId ?? current.schoolId,
        gradeLevel: gradeLevel ?? current.gradeLevel,
        contextId: contextId,
        contextName: contextName ?? current.contextName,
        linkedUid: current.linkedUid,
        archivedAt: null,
      );
      _reassignContext(id, contextId);
    }
  }

  @override
  Future<void> bulkDeleteStudents(List<String> studentIds) async {
    for (final id in studentIds) {
      await deleteStudent(id);
    }
  }

  @override
  Future<void> commitStudentImport(
    List<StudentImportRow> rows, {
    required String contextId,
    required List<String> ownerUids,
    required String schoolId,
    String? gradeLevel,
    required String contextName,
  }) async {
    for (final row in rows) {
      final effectiveGrade = row.gradeLevel ?? gradeLevel;
      if (row.existingId != null) {
        final current = _students[row.existingId];
        if (current == null) continue;
        _students[current.id] = Student(
          id: current.id,
          firstName: row.firstName,
          lastName: row.lastName,
          displayName: combineDisplayName(row.firstName, row.lastName),
          studentId: row.studentId ?? current.studentId,
          balanceCents: current.balanceCents,
          ownerUids: current.ownerUids,
          schoolId: current.schoolId,
          gradeLevel: effectiveGrade ?? current.gradeLevel,
          contextId: current.contextId,
          contextName: current.contextName,
          linkedUid: current.linkedUid,
          archivedAt: current.archivedAt,
        );
      } else {
        final student = Student(
          id: _newId(),
          firstName: row.firstName,
          lastName: row.lastName,
          displayName: combineDisplayName(row.firstName, row.lastName),
          studentId: row.studentId,
          balanceCents: 0,
          ownerUids: ownerUids,
          schoolId: schoolId,
          gradeLevel: effectiveGrade,
          contextId: contextId,
          contextName: contextName,
        );
        _students[student.id] = student;
        _studentIdsByContext.putIfAbsent(contextId, () => {}).add(student.id);
        _transactionsByStudent[student.id] = [];
      }
    }
  }

  @override
  Stream<List<LedgerTransaction>> transactionsForStudent({
    required String contextId,
    required String studentId,
  }) {
    return Stream.value(List.of(_transactionsByStudent[studentId] ?? const []));
  }

  @override
  Future<void> recordTransaction({
    required String contextId,
    required String studentId,
    required TransactionType type,
    required int amountCents,
    required String reason,
    required String createdByUid,
    required List<String> ownerUids,
    String? schoolId,
    String? gradeLevel,
    SavingsLabel? savingsLabel,
    String? goalId,
    SpendCategory? spendCategory,
  }) async {
    final effectiveSavingsLabel = type == TransactionType.earn
        ? (goalId != null ? SavingsLabel.goal : savingsLabel)
        : null;
    final transaction = LedgerTransaction(
      id: _newId(),
      studentId: studentId,
      type: type,
      amountCents: amountCents,
      reason: reason,
      createdByUid: createdByUid,
      createdAt: DateTime.now(),
      savingsLabel: effectiveSavingsLabel,
      goalId: type == TransactionType.earn ? goalId : null,
      spendCategory: type == TransactionType.spend ? spendCategory : null,
    );
    _transactionsByStudent
        .putIfAbsent(studentId, () => [])
        .insert(0, transaction);

    final current = _students[studentId]!;
    final delta = type == TransactionType.earn ? amountCents : -amountCents;
    _students[studentId] = Student(
      id: current.id,
      firstName: current.firstName,
      lastName: current.lastName,
      displayName: current.displayName,
      studentId: current.studentId,
      balanceCents: current.balanceCents + delta,
      ownerUids: current.ownerUids,
      schoolId: current.schoolId,
      gradeLevel: current.gradeLevel,
      contextId: current.contextId,
      contextName: current.contextName,
      linkedUid: current.linkedUid,
      archivedAt: current.archivedAt,
    );

    if (type == TransactionType.earn && goalId != null) {
      final goals = _goalsByStudent[studentId];
      if (goals != null) {
        final index = goals.indexWhere((g) => g.id == goalId);
        if (index != -1) {
          final goal = goals[index];
          goals[index] = Goal(
            id: goal.id,
            studentId: goal.studentId,
            name: goal.name,
            targetCents: goal.targetCents,
            savedCents: goal.savedCents + amountCents,
            createdByUid: goal.createdByUid,
            createdAt: goal.createdAt,
          );
        }
      }
    }
  }

  @override
  Future<BulkTransactionResult> recordBulkTransaction({
    required String contextId,
    required String idempotencyKey,
    required TransactionType type,
    required int amountCentsEach,
    required String reason,
    required List<String> recipientStudentIds,
    SavingsLabel? savingsLabel,
    SpendCategory? spendCategory,
  }) async {
    final succeeded = <String>[];
    final failed = <BulkTransactionFailure>[];

    for (final studentId in recipientStudentIds) {
      final key = '$idempotencyKey:$studentId';
      if (_processedBulkKeys.contains(key)) {
        // Idempotent replay — already applied by an earlier attempt.
        succeeded.add(studentId);
        continue;
      }

      final current = _students[studentId];
      if (current == null) {
        failed.add(BulkTransactionFailure(studentId: studentId, error: 'Student not found'));
        continue;
      }
      if (current.contextId != contextId) {
        failed.add(BulkTransactionFailure(studentId: studentId, error: 'Student is not in this classroom'));
        continue;
      }
      if (current.archivedAt != null) {
        failed.add(BulkTransactionFailure(studentId: studentId, error: 'Student is archived'));
        continue;
      }

      final delta = type == TransactionType.earn ? amountCentsEach : -amountCentsEach;
      _transactionsByStudent.putIfAbsent(studentId, () => []).insert(
        0,
        LedgerTransaction(
          id: _newId(),
          studentId: studentId,
          type: type,
          amountCents: amountCentsEach,
          reason: reason,
          createdByUid: 'bulk',
          createdAt: DateTime.now(),
          savingsLabel: type == TransactionType.earn ? savingsLabel : null,
          spendCategory: type == TransactionType.spend ? spendCategory : null,
        ),
      );
      _students[studentId] = Student(
        id: current.id,
        firstName: current.firstName,
        lastName: current.lastName,
        displayName: current.displayName,
        studentId: current.studentId,
        balanceCents: current.balanceCents + delta,
        ownerUids: current.ownerUids,
        schoolId: current.schoolId,
        gradeLevel: current.gradeLevel,
        contextId: current.contextId,
        contextName: current.contextName,
        linkedUid: current.linkedUid,
        archivedAt: current.archivedAt,
      );
      _processedBulkKeys.add(key);
      succeeded.add(studentId);
    }

    return BulkTransactionResult(succeeded: succeeded, failed: failed);
  }

  // ---- Goals ----

  @override
  Stream<List<Goal>> goalsForStudent(String studentId) {
    return Stream.value(List.of(_goalsByStudent[studentId] ?? const []));
  }

  @override
  Future<Goal> createGoal({
    required String studentId,
    required String name,
    required int targetCents,
    required String createdByUid,
  }) async {
    final goal = Goal(
      id: _newId(),
      studentId: studentId,
      name: name,
      targetCents: targetCents,
      savedCents: 0,
      createdByUid: createdByUid,
      createdAt: DateTime.now(),
    );
    _goalsByStudent.putIfAbsent(studentId, () => []).add(goal);
    return goal;
  }

  @override
  Future<void> deleteGoal(String studentId, String goalId) async {
    _goalsByStudent[studentId]?.removeWhere((g) => g.id == goalId);
  }

  // ---- Classroom store ----

  @override
  Stream<List<StoreItem>> storeItemsForContext(String contextId) {
    return Stream.value(List.of(_storeItemsByContext[contextId] ?? const []));
  }

  /// Test-only seeding hook, not part of [ClassroomRepository] — mobile has
  /// no catalog-management UI yet (target M-CLASS-05), so there is no real
  /// write path to fake here. Widget tests that need an existing store item
  /// (e.g. to verify a quick-choice chip prefills amount/reason) call this
  /// directly against a [FakeClassroomRepository] instance.
  StoreItem seedStoreItem({
    required String contextId,
    required String name,
    required int priceCents,
  }) {
    final item = StoreItem(
      id: _newId(),
      contextId: contextId,
      name: name,
      priceCents: priceCents,
      createdByUid: 'seed',
      createdAt: DateTime.now(),
    );
    _storeItemsByContext.putIfAbsent(contextId, () => []).add(item);
    return item;
  }

  @override
  Future<void> linkStudentAccount({
    required String studentId,
    required String email,
    required String invitedByUid,
  }) async {
    final normalized = _normalizeEmail(email);
    _pendingStudentLinksByEmail[normalized] = PendingStudentLink(
      email: normalized,
      studentId: studentId,
      invitedByUid: invitedByUid,
    );
  }

  @override
  Future<void> cancelStudentLink(String email) async {
    _pendingStudentLinksByEmail.remove(_normalizeEmail(email));
  }

  @override
  Stream<PendingStudentLink?> pendingStudentLinkForStudent(String studentId) {
    final matches = _pendingStudentLinksByEmail.values.where(
      (l) => l.studentId == studentId,
    );
    return Stream.value(matches.isEmpty ? null : matches.first);
  }

  @override
  Future<void> unlinkStudentAccount(String studentId) async {
    final current = _students[studentId];
    if (current == null) return;
    _students[studentId] = Student(
      id: current.id,
      firstName: current.firstName,
      lastName: current.lastName,
      displayName: current.displayName,
      studentId: current.studentId,
      balanceCents: current.balanceCents,
      ownerUids: current.ownerUids,
      schoolId: current.schoolId,
      gradeLevel: current.gradeLevel,
      contextId: current.contextId,
      contextName: current.contextName,
      linkedUid: null,
      archivedAt: current.archivedAt,
    );
  }

  @override
  Future<void> claimPendingStudentLinkIfAny({
    required String uid,
    required String email,
  }) async {
    final normalized = _normalizeEmail(email);
    final link = _pendingStudentLinksByEmail[normalized];
    if (link == null) return;
    final current = _students[link.studentId];
    if (current == null) return;
    _students[link.studentId] = Student(
      id: current.id,
      firstName: current.firstName,
      lastName: current.lastName,
      displayName: current.displayName,
      studentId: current.studentId,
      balanceCents: current.balanceCents,
      ownerUids: current.ownerUids,
      schoolId: current.schoolId,
      gradeLevel: current.gradeLevel,
      contextId: current.contextId,
      contextName: current.contextName,
      linkedUid: uid,
      archivedAt: current.archivedAt,
    );
    _pendingStudentLinksByEmail.remove(normalized);
  }

  @override
  Stream<Student?> linkedStudentForUser(String uid) {
    final matches = _students.values.where((s) => s.linkedUid == uid);
    return Stream.value(matches.isEmpty ? null : matches.first);
  }
}
