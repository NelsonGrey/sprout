import 'package:sprout/core/models/classroom_context.dart';
import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/models/school.dart';
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
  Stream<List<ClassroomContext>> classroomsInSchool(String schoolId, {List<String>? gradeLevels}) {
    return Stream.value(
      _contexts.values
          .where((c) =>
              c.schoolId == schoolId && (gradeLevels == null || gradeLevels.contains(c.gradeLevel)))
          .toList(),
    );
  }

  @override
  Stream<ClassroomContext?> classroom(String contextId) {
    return Stream.value(_contexts[contextId]);
  }

  @override
  Future<void> updateClassroom(String contextId, {String? name, String? gradeLevel}) async {
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
      ids.map((id) => _students[id]!).where((s) => s.archivedAt == null).toList(),
    );
  }

  @override
  Stream<List<Student>> studentsInSchool(String schoolId) {
    return Stream.value(_students.values.where((s) => s.schoolId == schoolId).toList());
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
      displayName:
          firstName != null && lastName != null ? combineDisplayName(newFirst, newLast) : current.displayName,
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
  }) async {
    final transaction = LedgerTransaction(
      id: _newId(),
      studentId: studentId,
      type: type,
      amountCents: amountCents,
      reason: reason,
      createdByUid: createdByUid,
      createdAt: DateTime.now(),
    );
    _transactionsByStudent.putIfAbsent(studentId, () => []).insert(0, transaction);

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
    final matches = _pendingStudentLinksByEmail.values.where((l) => l.studentId == studentId);
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
  Future<void> claimPendingStudentLinkIfAny({required String uid, required String email}) async {
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
