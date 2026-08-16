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
  Future<ClassroomContext> createClassroom({
    required String name,
    required String ownerUid,
    String? ownerDisplayName,
    String? ownerEmail,
  }) async {
    final context = ClassroomContext(id: _newId(), name: name, ownerUids: [ownerUid]);
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
    required String displayName,
    required List<String> ownerUids,
  }) async {
    final student = Student(
      id: _newId(),
      displayName: displayName,
      balanceCents: 0,
      ownerUids: ownerUids,
    );
    _students[student.id] = student;
    _studentIdsByContext.putIfAbsent(contextId, () => {}).add(student.id);
    _transactionsByStudent[student.id] = [];
    return student;
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
      displayName: current.displayName,
      balanceCents: current.balanceCents + delta,
      ownerUids: current.ownerUids,
    );
  }
}
