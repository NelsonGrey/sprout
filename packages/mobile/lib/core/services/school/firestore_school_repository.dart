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

  String _roleToJson(MemberRole role) {
    switch (role) {
      case MemberRole.superAdmin:
        return 'super_admin';
      case MemberRole.admin:
        return 'admin';
      case MemberRole.teacher:
        return 'teacher';
    }
  }

  MemberRole _roleFromJson(Object? value) {
    switch (value) {
      case 'super_admin':
        return MemberRole.superAdmin;
      case 'admin':
        return MemberRole.admin;
      default:
        return MemberRole.teacher;
    }
  }

  @override
  Future<School> createSchool({
    required String name,
    required String founderUid,
    String? founderDisplayName,
    String? founderEmail,
  }) async {
    final batch = _firestore.batch();

    final schoolRef = _schools.doc();
    // founderUid/superAdminCount are rules bootstrap/invariant plumbing —
    // see firestore.rules' isFoundingSuperAdmin — not modeled on School.
    batch.set(schoolRef, {
      'name': name,
      'founderUid': founderUid,
      'superAdminCount': 1,
      'createdAt': FieldValue.serverTimestamp(),
    });

    batch.set(schoolRef.collection('members').doc(founderUid), {
      'role': 'super_admin',
      'displayName': founderDisplayName,
      'email': founderEmail,
      'addedByUid': founderUid,
      'createdAt': FieldValue.serverTimestamp(),
    });

    final userRef = _firestore.collection('users').doc(founderUid);
    batch.set(userRef, {
      'displayName': founderDisplayName,
      'email': founderEmail,
      'schoolIds': FieldValue.arrayUnion([schoolRef.id]),
      'createdAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));

    await batch.commit();
    return School(id: schoolRef.id, name: name);
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
    return School(id: snapshot.id, name: data['name'] as String);
  }

  @override
  Future<void> updateSchool(String schoolId, {String? name}) async {
    await _schools.doc(schoolId).update({if (name != null) 'name': name});
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
  Future<void> removeMember(String schoolId, String uid) async {
    final memberRef = _schools.doc(schoolId).collection('members').doc(uid);
    final memberSnapshot = await memberRef.get();
    final role = memberSnapshot.data()?['role'];

    if (role == 'super_admin') {
      // Paired with firestore.rules' superAdminCount > 1 check — kept in
      // sync here, not independently re-derived by the rules (see the
      // rules file's trust note).
      final batch = _firestore.batch();
      batch.delete(memberRef);
      batch.update(_schools.doc(schoolId), {'superAdminCount': FieldValue.increment(-1)});
      await batch.commit();
    } else {
      await memberRef.delete();
    }
  }

  @override
  Future<void> updateMemberScope(String schoolId, String uid, MemberScope scope) async {
    await _schools.doc(schoolId).collection('members').doc(uid).update({'scope': scope.toJson()});
  }

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
      'role': _roleToJson(role),
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

    if (invite['role'] == 'super_admin') {
      batch.update(_schools.doc(schoolId), {'superAdminCount': FieldValue.increment(1)});
    }

    batch.set(_firestore.collection('users').doc(uid), {
      'schoolIds': FieldValue.arrayUnion([schoolId]),
    }, SetOptions(merge: true));

    batch.delete(inviteRef);

    await batch.commit();
  }

  SchoolMember _memberFromData(String uid, Map<String, dynamic> data) {
    return SchoolMember(
      uid: uid,
      role: _roleFromJson(data['role']),
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
      role: _roleFromJson(data['role']),
      scope: data['scope'] != null
          ? MemberScope.fromJson(Map<String, dynamic>.from(data['scope'] as Map))
          : null,
    );
  }
}
