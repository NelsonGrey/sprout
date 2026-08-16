import 'package:cloud_firestore/cloud_firestore.dart';

import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/services/school/school_repository.dart';

class FirestoreSchoolRepository implements SchoolRepository {
  FirestoreSchoolRepository({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _firestore;

  CollectionReference<Map<String, dynamic>> get _schools => _firestore.collection('schools');
  CollectionReference<Map<String, dynamic>> get _invites =>
      _firestore.collection('pendingInvites');

  String _normalizeEmail(String email) => email.trim().toLowerCase();

  @override
  Future<School> createSchool({
    required String name,
    required String principalUid,
    String? principalDisplayName,
    String? principalEmail,
  }) async {
    final batch = _firestore.batch();

    final schoolRef = _schools.doc();
    batch.set(schoolRef, {
      'name': name,
      'principalUid': principalUid,
      'createdAt': FieldValue.serverTimestamp(),
    });

    batch.set(schoolRef.collection('members').doc(principalUid), {
      'role': 'admin',
      'displayName': principalDisplayName,
      'email': principalEmail,
      'addedByUid': principalUid,
      'createdAt': FieldValue.serverTimestamp(),
    });

    final userRef = _firestore.collection('users').doc(principalUid);
    batch.set(userRef, {
      'displayName': principalDisplayName,
      'email': principalEmail,
      'schoolIds': FieldValue.arrayUnion([schoolRef.id]),
      'createdAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));

    await batch.commit();
    return School(id: schoolRef.id, name: name, principalUid: principalUid);
  }

  @override
  Stream<List<String>> schoolIdsForUser(String uid) {
    return _firestore.collection('users').doc(uid).snapshots().map((snapshot) {
      final data = snapshot.data();
      if (data == null) return const [];
      return List<String>.from(data['schoolIds'] as List? ?? const []);
    });
  }

  @override
  Future<School?> getSchool(String schoolId) async {
    final snapshot = await _schools.doc(schoolId).get();
    final data = snapshot.data();
    if (data == null) return null;
    return School(id: snapshot.id, name: data['name'] as String, principalUid: data['principalUid'] as String);
  }

  @override
  Stream<SchoolMember?> myMembership(String schoolId, String uid) {
    return _schools.doc(schoolId).collection('members').doc(uid).snapshots().map((snapshot) {
      final data = snapshot.data();
      if (data == null) return null;
      return _memberFromData(uid, data);
    });
  }

  @override
  Stream<List<SchoolMember>> membersOfSchool(String schoolId) {
    return _schools.doc(schoolId).collection('members').snapshots().map(
          (snapshot) => snapshot.docs.map((doc) => _memberFromData(doc.id, doc.data())).toList(),
        );
  }

  @override
  Future<void> removeMember(String schoolId, String uid) =>
      _schools.doc(schoolId).collection('members').doc(uid).delete();

  @override
  Future<void> inviteMember({
    required String schoolId,
    required String email,
    required MemberRole role,
    MemberScope? scope,
    required String invitedByUid,
  }) async {
    await _invites.doc(_normalizeEmail(email)).set({
      'schoolId': schoolId,
      'role': role.name,
      if (scope != null) 'scope': scope.toJson(),
      'invitedByUid': invitedByUid,
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  @override
  Stream<List<PendingInvite>> pendingInvitesForSchool(String schoolId) {
    return _invites.where('schoolId', isEqualTo: schoolId).snapshots().map(
          (snapshot) => snapshot.docs.map((doc) => _inviteFromData(doc.id, doc.data())).toList(),
        );
  }

  @override
  Future<void> cancelInvite(String email) => _invites.doc(_normalizeEmail(email)).delete();

  @override
  Future<void> claimPendingInviteIfAny({
    required String uid,
    required String email,
    String? displayName,
  }) async {
    final inviteRef = _invites.doc(_normalizeEmail(email));
    final inviteSnapshot = await inviteRef.get();
    final invite = inviteSnapshot.data();
    if (invite == null) return;

    final schoolId = invite['schoolId'] as String;
    final batch = _firestore.batch();

    batch.set(_schools.doc(schoolId).collection('members').doc(uid), {
      'role': invite['role'],
      'displayName': displayName,
      'email': email,
      if (invite['scope'] != null) 'scope': invite['scope'],
      'addedByUid': uid,
      'createdAt': FieldValue.serverTimestamp(),
    });

    batch.set(_firestore.collection('users').doc(uid), {
      'schoolIds': FieldValue.arrayUnion([schoolId]),
    }, SetOptions(merge: true));

    batch.delete(inviteRef);

    await batch.commit();
  }

  SchoolMember _memberFromData(String uid, Map<String, dynamic> data) {
    return SchoolMember(
      uid: uid,
      role: data['role'] == 'admin' ? MemberRole.admin : MemberRole.teacher,
      displayName: data['displayName'] as String? ?? '',
      email: data['email'] as String? ?? '',
      scope: data['scope'] != null
          ? MemberScope.fromJson(Map<String, dynamic>.from(data['scope'] as Map))
          : null,
    );
  }

  PendingInvite _inviteFromData(String email, Map<String, dynamic> data) {
    return PendingInvite(
      email: email,
      schoolId: data['schoolId'] as String,
      role: data['role'] == 'admin' ? MemberRole.admin : MemberRole.teacher,
      scope: data['scope'] != null
          ? MemberScope.fromJson(Map<String, dynamic>.from(data['scope'] as Map))
          : null,
    );
  }
}
