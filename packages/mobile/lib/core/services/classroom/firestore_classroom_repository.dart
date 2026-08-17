import 'package:cloud_firestore/cloud_firestore.dart';

import 'package:sprout/core/models/classroom_context.dart';
import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/models/student.dart';
import 'package:sprout/core/services/classroom/classroom_repository.dart';

class FirestoreClassroomRepository implements ClassroomRepository {
  FirestoreClassroomRepository({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _firestore;

  CollectionReference<Map<String, dynamic>> get _contexts =>
      _firestore.collection('contexts');
  CollectionReference<Map<String, dynamic>> get _students =>
      _firestore.collection('students');

  @override
  Stream<List<ClassroomContext>> myClassrooms(String ownerUid) {
    return _contexts
        .where('ownerUids', arrayContains: ownerUid)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs.map(_contextFromDoc).toList());
  }

  @override
  Stream<List<ClassroomContext>> classroomsInSchool(String schoolId, {List<String>? gradeLevels}) {
    Query<Map<String, dynamic>> query = _contexts.where('schoolId', isEqualTo: schoolId);
    if (gradeLevels != null) {
      query = query.where('gradeLevel', whereIn: gradeLevels);
    }
    return query.snapshots().map((snapshot) => snapshot.docs.map(_contextFromDoc).toList());
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
        .where('contextIds', arrayContains: contextId)
        .orderBy('displayName')
        .snapshots()
        .map((snapshot) => snapshot.docs.map(_studentFromDoc).toList());
  }

  @override
  Future<Student> addStudent({
    required String contextId,
    required String displayName,
    required List<String> ownerUids,
    String? schoolId,
    String? gradeLevel,
  }) async {
    final ref = _students.doc();
    await ref.set({
      'displayName': displayName,
      'balanceCents': 0,
      'contexts': {
        contextId: {'type': 'classroom', 'role': 'member'},
      },
      'contextIds': [contextId],
      'ownerUids': ownerUids,
      if (schoolId != null) 'schoolId': schoolId,
      if (gradeLevel != null) 'gradeLevel': gradeLevel,
      'createdAt': FieldValue.serverTimestamp(),
    });
    return Student(
      id: ref.id,
      displayName: displayName,
      balanceCents: 0,
      ownerUids: ownerUids,
      schoolId: schoolId,
      gradeLevel: gradeLevel,
    );
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
  }) async {
    // A WriteBatch (not runTransaction) is enough here: FieldValue.increment
    // is itself atomic and this write doesn't depend on reading the current
    // balance first, so there's nothing a transaction's read-then-write
    // retry semantics would add.
    final batch = _firestore.batch();

    final transactionRef = _contexts.doc(contextId).collection('transactions').doc();
    batch.set(transactionRef, {
      'studentId': studentId,
      'type': type == TransactionType.earn ? 'earn' : 'spend',
      'amountCents': amountCents,
      'reason': reason,
      'createdByUid': createdByUid,
      'createdAt': FieldValue.serverTimestamp(),
      'ownerUids': ownerUids,
    });

    final delta = type == TransactionType.earn ? amountCents : -amountCents;
    batch.update(_students.doc(studentId), {'balanceCents': FieldValue.increment(delta)});

    await batch.commit();
  }

  ClassroomContext _contextFromDoc(QueryDocumentSnapshot<Map<String, dynamic>> doc) {
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
      displayName: data['displayName'] as String,
      balanceCents: (data['balanceCents'] as num).toInt(),
      ownerUids: List<String>.from(data['ownerUids'] as List),
      schoolId: data['schoolId'] as String?,
      gradeLevel: data['gradeLevel'] as String?,
    );
  }

  LedgerTransaction _transactionFromDoc(QueryDocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data();
    final createdAt = data['createdAt'] as Timestamp?;
    return LedgerTransaction(
      id: doc.id,
      studentId: data['studentId'] as String,
      type: data['type'] == 'earn' ? TransactionType.earn : TransactionType.spend,
      amountCents: (data['amountCents'] as num).toInt(),
      reason: data['reason'] as String,
      createdByUid: data['createdByUid'] as String,
      // Pending server timestamps read back as null immediately after a
      // local write, before the server round-trip lands — fall back to
      // "now" so a freshly-recorded transaction doesn't crash the list.
      createdAt: createdAt?.toDate() ?? DateTime.now(),
    );
  }
}
