import 'package:cloud_firestore/cloud_firestore.dart';

import 'package:sprout/core/models/classroom_context.dart';
import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/models/school.dart';
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
  Future<void> updateClassroom(String contextId, {String? name, String? gradeLevel}) async {
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
      if (firstName != null && lastName != null) 'displayName': combineDisplayName(firstName, lastName),
      if (studentId != null) 'studentId': studentId,
      if (gradeLevel != null) 'gradeLevel': gradeLevel,
    });
  }

  @override
  Future<void> deleteStudent(String studentId) async {
    await _students.doc(studentId).delete();
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
      if (schoolId != null) 'schoolId': schoolId,
      if (gradeLevel != null) 'gradeLevel': gradeLevel,
    });

    final delta = type == TransactionType.earn ? amountCents : -amountCents;
    batch.update(_students.doc(studentId), {'balanceCents': FieldValue.increment(delta)});

    await batch.commit();
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
        .map((snapshot) => snapshot.docs.isEmpty ? null : _pendingStudentLinkFromDoc(snapshot.docs.first));
  }

  @override
  Future<void> unlinkStudentAccount(String studentId) async {
    await _students.doc(studentId).update({'linkedUid': FieldValue.delete()});
  }

  @override
  Future<void> claimPendingStudentLinkIfAny({required String uid, required String email}) async {
    final normalized = _normalizeEmail(email);
    final linkRef = _pendingStudentLinks.doc(normalized);
    final linkSnapshot = await linkRef.get();
    final link = linkSnapshot.data();
    if (link == null) return;

    final batch = _firestore.batch();
    batch.update(_students.doc(link['studentId'] as String), {'linkedUid': uid});
    batch.delete(linkRef);
    await batch.commit();
  }

  @override
  Stream<Student?> linkedStudentForUser(String uid) {
    return _students
        .where('linkedUid', isEqualTo: uid)
        .snapshots()
        .map((snapshot) => snapshot.docs.isEmpty ? null : _studentFromDoc(snapshot.docs.first));
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
    );
  }

  PendingStudentLink _pendingStudentLinkFromDoc(QueryDocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data();
    return PendingStudentLink(
      email: doc.id,
      studentId: data['studentId'] as String,
      invitedByUid: data['invitedByUid'] as String,
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
