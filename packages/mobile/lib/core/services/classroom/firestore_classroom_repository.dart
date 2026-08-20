import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

import 'package:sprout/core/config/api_config.dart';
import 'package:sprout/core/models/bulk_transaction_result.dart';
import 'package:sprout/core/models/classroom_context.dart';
import 'package:sprout/core/models/goal.dart';
import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/models/store_item.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/models/student_import_row.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';

class FirestoreClassroomRepository implements ClassroomRepository {
  FirestoreClassroomRepository({FirebaseFirestore? firestore})
    : _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _firestore;

  // Firestore's WriteBatch hard-caps at 500 operations; 400 leaves headroom
  // since each id in a bulk operation maps to exactly one write. Matches
  // web's BULK_CHUNK_SIZE (packages/web/src/lib/firestore.ts). None of the
  // bulk methods below get() a document inside the same batch they write to,
  // so they don't hit the pre-commit-state gotcha documented on
  // createSchool in firestore_school_repository.dart.
  static const _bulkChunkSize = 400;

  CollectionReference<Map<String, dynamic>> get _contexts =>
      _firestore.collection('contexts');
  CollectionReference<Map<String, dynamic>> get _students =>
      _firestore.collection('students');
  CollectionReference<Map<String, dynamic>> get _pendingStudentLinks =>
      _firestore.collection('pendingStudentLinks');

  String _normalizeEmail(String email) => email.trim().toLowerCase();

  @override
  Stream<List<ClassroomContext>> myClassrooms(String ownerUid) {
    return _contexts
        .where('ownerUids', arrayContains: ownerUid)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs.map(_contextFromDoc).toList());
  }

  @override
  Stream<List<ClassroomContext>> classroomsInSchool(
    String schoolId, {
    List<String>? gradeLevels,
  }) {
    Query<Map<String, dynamic>> query = _contexts.where(
      'schoolId',
      isEqualTo: schoolId,
    );
    if (gradeLevels != null) {
      query = query.where('gradeLevel', whereIn: gradeLevels);
    }
    return query.snapshots().map(
      (snapshot) => snapshot.docs.map(_contextFromDoc).toList(),
    );
  }

  @override
  Stream<ClassroomContext?> classroom(String contextId) {
    return _contexts.doc(contextId).snapshots().map((snapshot) {
      if (!snapshot.exists) return null;
      final data = snapshot.data()!;
      return ClassroomContext(
        id: snapshot.id,
        name: data['name'] as String,
        ownerUids: List<String>.from(data['ownerUids'] as List),
        schoolId: data['schoolId'] as String?,
        gradeLevel: data['gradeLevel'] as String?,
      );
    });
  }

  @override
  Future<void> updateClassroom(
    String contextId, {
    String? name,
    String? gradeLevel,
  }) async {
    await _contexts.doc(contextId).update({
      if (name != null) 'name': name,
      if (gradeLevel != null) 'gradeLevel': gradeLevel,
    });
  }

  @override
  Future<void> deleteClassroom(String contextId) async {
    await _contexts.doc(contextId).delete();
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
    final batch = _firestore.batch();

    final userRef = _firestore.collection('users').doc(ownerUid);
    batch.set(userRef, {
      'displayName': ownerDisplayName,
      'email': ownerEmail,
      'createdAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));

    final contextRef = _contexts.doc();
    final ownerUids = [ownerUid];
    batch.set(contextRef, {
      'type': 'classroom',
      'name': name,
      'ownerUids': ownerUids,
      if (schoolId != null) 'schoolId': schoolId,
      if (gradeLevel != null) 'gradeLevel': gradeLevel,
      'createdAt': FieldValue.serverTimestamp(),
    });

    await batch.commit();
    return ClassroomContext(
      id: contextRef.id,
      name: name,
      ownerUids: ownerUids,
      schoolId: schoolId,
      gradeLevel: gradeLevel,
    );
  }

  @override
  Stream<List<Student>> studentsInClassroom(String contextId) {
    return _students
        .where('contextId', isEqualTo: contextId)
        .orderBy('displayName')
        .snapshots()
        .map(
          (snapshot) => snapshot.docs
              .map(_studentFromDoc)
              .where((s) => s.archivedAt == null)
              .toList(),
        );
  }

  @override
  Stream<List<Student>> studentsInSchool(String schoolId) {
    return _students
        .where('schoolId', isEqualTo: schoolId)
        .snapshots()
        .map((snapshot) => snapshot.docs.map(_studentFromDoc).toList());
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
    final ref = _students.doc();
    final displayName = combineDisplayName(firstName, lastName);
    await ref.set({
      'firstName': firstName,
      'lastName': lastName,
      'displayName': displayName,
      if (studentId != null) 'studentId': studentId,
      'balanceCents': 0,
      'contexts': {
        contextId: {'type': 'classroom', 'role': 'member'},
      },
      'contextId': contextId,
      'ownerUids': ownerUids,
      if (schoolId != null) 'schoolId': schoolId,
      if (gradeLevel != null) 'gradeLevel': gradeLevel,
      if (contextName != null) 'contextName': contextName,
      'createdAt': FieldValue.serverTimestamp(),
    });
    return Student(
      id: ref.id,
      firstName: firstName,
      lastName: lastName,
      displayName: displayName,
      studentId: studentId,
      balanceCents: 0,
      ownerUids: ownerUids,
      schoolId: schoolId,
      gradeLevel: gradeLevel,
      contextId: contextId,
      contextName: contextName,
    );
  }

  /// [firstName]/[lastName] must be updated together (both or neither) — a
  /// partial name update would leave displayName recombined from a stale
  /// half.
  @override
  Future<void> updateStudent(
    String id, {
    String? firstName,
    String? lastName,
    String? studentId,
    String? gradeLevel,
  }) async {
    await _students.doc(id).update({
      if (firstName != null) 'firstName': firstName,
      if (lastName != null) 'lastName': lastName,
      if (firstName != null && lastName != null)
        'displayName': combineDisplayName(firstName, lastName),
      if (studentId != null) 'studentId': studentId,
      if (gradeLevel != null) 'gradeLevel': gradeLevel,
    });
  }

  @override
  Future<void> deleteStudent(String studentId) async {
    await _students.doc(studentId).delete();
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
    for (var i = 0; i < studentIds.length; i += _bulkChunkSize) {
      final batch = _firestore.batch();
      for (final id in studentIds.skip(i).take(_bulkChunkSize)) {
        batch.update(_students.doc(id), {
          'contextId': contextId,
          'contexts': {
            contextId: {'type': 'classroom', 'role': 'member'},
          },
          'ownerUids': ownerUids,
          if (schoolId != null) 'schoolId': schoolId,
          if (gradeLevel != null) 'gradeLevel': gradeLevel,
          if (contextName != null) 'contextName': contextName,
        });
      }
      await batch.commit();
    }
  }

  @override
  Future<void> bulkArchiveStudents(List<String> studentIds) async {
    for (var i = 0; i < studentIds.length; i += _bulkChunkSize) {
      final batch = _firestore.batch();
      for (final id in studentIds.skip(i).take(_bulkChunkSize)) {
        batch.update(_students.doc(id), {
          'archivedAt': FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
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
    for (var i = 0; i < studentIds.length; i += _bulkChunkSize) {
      final batch = _firestore.batch();
      for (final id in studentIds.skip(i).take(_bulkChunkSize)) {
        batch.update(_students.doc(id), {
          'contextId': contextId,
          'contexts': {
            contextId: {'type': 'classroom', 'role': 'member'},
          },
          'ownerUids': ownerUids,
          if (schoolId != null) 'schoolId': schoolId,
          if (gradeLevel != null) 'gradeLevel': gradeLevel,
          if (contextName != null) 'contextName': contextName,
          'archivedAt': FieldValue.delete(),
        });
      }
      await batch.commit();
    }
  }

  @override
  Future<void> bulkDeleteStudents(List<String> studentIds) async {
    for (var i = 0; i < studentIds.length; i += _bulkChunkSize) {
      final batch = _firestore.batch();
      for (final id in studentIds.skip(i).take(_bulkChunkSize)) {
        batch.delete(_students.doc(id));
      }
      await batch.commit();
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
    for (var i = 0; i < rows.length; i += _bulkChunkSize) {
      final batch = _firestore.batch();
      for (final row in rows.skip(i).take(_bulkChunkSize)) {
        final displayName = combineDisplayName(row.firstName, row.lastName);
        final effectiveGrade = row.gradeLevel ?? gradeLevel;
        if (row.existingId != null) {
          batch.update(_students.doc(row.existingId), {
            'firstName': row.firstName,
            'lastName': row.lastName,
            'displayName': displayName,
            if (row.studentId != null) 'studentId': row.studentId,
            if (effectiveGrade != null) 'gradeLevel': effectiveGrade,
          });
        } else {
          batch.set(_students.doc(), {
            'firstName': row.firstName,
            'lastName': row.lastName,
            'displayName': displayName,
            if (row.studentId != null) 'studentId': row.studentId,
            'balanceCents': 0,
            'contexts': {
              contextId: {'type': 'classroom', 'role': 'member'},
            },
            'contextId': contextId,
            'ownerUids': ownerUids,
            'schoolId': schoolId,
            if (effectiveGrade != null) 'gradeLevel': effectiveGrade,
            'contextName': contextName,
            'createdAt': FieldValue.serverTimestamp(),
          });
        }
      }
      await batch.commit();
    }
  }

  @override
  Stream<List<LedgerTransaction>> transactionsForStudent({
    required String contextId,
    required String studentId,
  }) {
    return _contexts
        .doc(contextId)
        .collection('transactions')
        .where('studentId', isEqualTo: studentId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs.map(_transactionFromDoc).toList());
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
    // A WriteBatch (not runTransaction) is enough here: FieldValue.increment
    // is itself atomic and this write doesn't depend on reading the current
    // balance first, so there's nothing a transaction's read-then-write
    // retry semantics would add. Mirrors
    // packages/web/src/lib/firestore.ts's recordTransaction exactly.
    final batch = _firestore.batch();

    final effectiveSavingsLabel = type == TransactionType.earn
        ? (goalId != null ? SavingsLabel.goal : savingsLabel)
        : null;

    final transactionRef = _contexts
        .doc(contextId)
        .collection('transactions')
        .doc();
    batch.set(transactionRef, {
      'studentId': studentId,
      'type': type == TransactionType.earn ? 'earn' : 'spend',
      'amountCents': amountCents,
      'reason': reason,
      'createdByUid': createdByUid,
      'createdAt': FieldValue.serverTimestamp(),
      'ownerUids': ownerUids,
      if (schoolId != null) 'schoolId': schoolId,
      if (gradeLevel != null) 'gradeLevel': gradeLevel,
      if (effectiveSavingsLabel != null)
        'savingsLabel': savingsLabelToJson(effectiveSavingsLabel),
      if (type == TransactionType.earn && goalId != null) 'goalId': goalId,
      if (type == TransactionType.spend && spendCategory != null)
        'spendCategory': spendCategoryToJson(spendCategory),
    });

    final delta = type == TransactionType.earn ? amountCents : -amountCents;
    batch.update(_students.doc(studentId), {
      'balanceCents': FieldValue.increment(delta),
    });

    if (type == TransactionType.earn && goalId != null) {
      batch.update(_students.doc(studentId).collection('goals').doc(goalId), {
        'savedCents': FieldValue.increment(amountCents),
      });
    }

    await batch.commit();
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
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) throw StateError('Not signed in');
    final token = await user.getIdToken();

    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/api/classrooms/$contextId/transactions/bulk'),
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
      body: jsonEncode({
        'idempotencyKey': idempotencyKey,
        'type': type == TransactionType.earn ? 'earn' : 'spend',
        'amountCentsEach': amountCentsEach,
        'reason': reason,
        'recipientStudentIds': recipientStudentIds,
        if (savingsLabel != null) 'savingsLabel': savingsLabelToJson(savingsLabel),
        if (spendCategory != null) 'spendCategory': spendCategoryToJson(spendCategory),
      }),
    );

    final data = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw StateError(data['error'] as String? ?? 'Request failed with status ${response.statusCode}');
    }
    return BulkTransactionResult.fromJson(data);
  }

  @override
  Future<void> linkStudentAccount({
    required String studentId,
    required String email,
    required String invitedByUid,
  }) async {
    await _pendingStudentLinks.doc(_normalizeEmail(email)).set({
      'studentId': studentId,
      'invitedByUid': invitedByUid,
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  @override
  Future<void> cancelStudentLink(String email) =>
      _pendingStudentLinks.doc(_normalizeEmail(email)).delete();

  @override
  Stream<PendingStudentLink?> pendingStudentLinkForStudent(String studentId) {
    return _pendingStudentLinks
        .where('studentId', isEqualTo: studentId)
        .snapshots()
        .map(
          (snapshot) => snapshot.docs.isEmpty
              ? null
              : _pendingStudentLinkFromDoc(snapshot.docs.first),
        );
  }

  @override
  Future<void> unlinkStudentAccount(String studentId) async {
    await _students.doc(studentId).update({'linkedUid': FieldValue.delete()});
  }

  @override
  Future<void> claimPendingStudentLinkIfAny({
    required String uid,
    required String email,
  }) async {
    final normalized = _normalizeEmail(email);
    final linkRef = _pendingStudentLinks.doc(normalized);
    final linkSnapshot = await linkRef.get();
    final link = linkSnapshot.data();
    if (link == null) return;

    final batch = _firestore.batch();
    batch.update(_students.doc(link['studentId'] as String), {
      'linkedUid': uid,
    });
    batch.delete(linkRef);
    await batch.commit();
  }

  @override
  Stream<Student?> linkedStudentForUser(String uid) {
    return _students
        .where('linkedUid', isEqualTo: uid)
        .snapshots()
        .map(
          (snapshot) => snapshot.docs.isEmpty
              ? null
              : _studentFromDoc(snapshot.docs.first),
        );
  }

  ClassroomContext _contextFromDoc(
    QueryDocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final data = doc.data();
    return ClassroomContext(
      id: doc.id,
      name: data['name'] as String,
      ownerUids: List<String>.from(data['ownerUids'] as List),
      schoolId: data['schoolId'] as String?,
      gradeLevel: data['gradeLevel'] as String?,
    );
  }

  Student _studentFromDoc(QueryDocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data();
    return Student(
      id: doc.id,
      firstName: data['firstName'] as String? ?? '',
      lastName: data['lastName'] as String? ?? '',
      displayName: data['displayName'] as String,
      studentId: data['studentId'] as String?,
      balanceCents: (data['balanceCents'] as num).toInt(),
      ownerUids: List<String>.from(data['ownerUids'] as List),
      schoolId: data['schoolId'] as String?,
      gradeLevel: data['gradeLevel'] as String?,
      contextId: data['contextId'] as String?,
      contextName: data['contextName'] as String?,
      linkedUid: data['linkedUid'] as String?,
      archivedAt: (data['archivedAt'] as Timestamp?)?.toDate(),
    );
  }

  PendingStudentLink _pendingStudentLinkFromDoc(
    QueryDocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final data = doc.data();
    return PendingStudentLink(
      email: doc.id,
      studentId: data['studentId'] as String,
      invitedByUid: data['invitedByUid'] as String,
    );
  }

  LedgerTransaction _transactionFromDoc(
    QueryDocumentSnapshot<Map<String, dynamic>> doc,
  ) {
    final data = doc.data();
    final createdAt = data['createdAt'] as Timestamp?;
    return LedgerTransaction(
      id: doc.id,
      studentId: data['studentId'] as String,
      type: data['type'] == 'earn'
          ? TransactionType.earn
          : TransactionType.spend,
      amountCents: (data['amountCents'] as num).toInt(),
      reason: data['reason'] as String,
      createdByUid: data['createdByUid'] as String,
      // Pending server timestamps read back as null immediately after a
      // local write, before the server round-trip lands — fall back to
      // "now" so a freshly-recorded transaction doesn't crash the list.
      createdAt: createdAt?.toDate() ?? DateTime.now(),
      savingsLabel: savingsLabelFromJson(data['savingsLabel'] as String?),
      goalId: data['goalId'] as String?,
      spendCategory: spendCategoryFromJson(data['spendCategory'] as String?),
    );
  }

  Goal _goalFromDoc(QueryDocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data();
    final createdAt = data['createdAt'] as Timestamp?;
    return Goal(
      id: doc.id,
      studentId: data['studentId'] as String,
      name: data['name'] as String,
      targetCents: (data['targetCents'] as num).toInt(),
      savedCents: (data['savedCents'] as num).toInt(),
      createdByUid: data['createdByUid'] as String,
      createdAt: createdAt?.toDate() ?? DateTime.now(),
    );
  }

  StoreItem _storeItemFromDoc(QueryDocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data();
    final createdAt = data['createdAt'] as Timestamp?;
    return StoreItem(
      id: doc.id,
      contextId: data['contextId'] as String,
      name: data['name'] as String,
      priceCents: (data['priceCents'] as num).toInt(),
      createdByUid: data['createdByUid'] as String,
      createdAt: createdAt?.toDate() ?? DateTime.now(),
    );
  }

  // ---- Goals ----

  @override
  Stream<List<Goal>> goalsForStudent(String studentId) {
    return _students
        .doc(studentId)
        .collection('goals')
        .orderBy('createdAt')
        .snapshots()
        .map((snapshot) => snapshot.docs.map(_goalFromDoc).toList());
  }

  @override
  Future<Goal> createGoal({
    required String studentId,
    required String name,
    required int targetCents,
    required String createdByUid,
  }) async {
    final ref = _students.doc(studentId).collection('goals').doc();
    await ref.set({
      'studentId': studentId,
      'name': name,
      'targetCents': targetCents,
      'savedCents': 0,
      'createdByUid': createdByUid,
      'createdAt': FieldValue.serverTimestamp(),
    });
    return Goal(
      id: ref.id,
      studentId: studentId,
      name: name,
      targetCents: targetCents,
      savedCents: 0,
      createdByUid: createdByUid,
      createdAt: DateTime.now(),
    );
  }

  @override
  Future<void> deleteGoal(String studentId, String goalId) =>
      _students.doc(studentId).collection('goals').doc(goalId).delete();

  // ---- Classroom store ----

  @override
  Stream<List<StoreItem>> storeItemsForContext(String contextId) {
    return _contexts
        .doc(contextId)
        .collection('storeItems')
        .orderBy('createdAt')
        .snapshots()
        .map((snapshot) => snapshot.docs.map(_storeItemFromDoc).toList());
  }
}
