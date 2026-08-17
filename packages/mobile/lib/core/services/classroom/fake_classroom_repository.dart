import 'package:sprout/core/models/classroom_context.dart';
import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';

/// In-memory [ClassroomRepository] for widget tests — mirrors
/// FakeAuthService's role for AuthService.
class FakeClassroomRepository implements ClassroomRepository {
  final Map<String, ClassroomContext> _contexts = {};
  final Map<String, Student> _students = {};
  final Map<String, List<LedgerTransaction>> _transactionsByStudent = {};
  final Map<String, Set<String>> _studentIdsByContext = {};

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
    return Stream.value(ids.map((id) => _students[id]!).toList());
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
    );
  }
}
