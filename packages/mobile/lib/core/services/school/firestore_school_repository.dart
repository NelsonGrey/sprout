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
  CollectionReference<Map<String, dynamic>> get _accessRequests =>
      _firestore.collection('accessRequests');

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
      classroomGrants: SchoolMember.classroomGrantsFromJson(data['classroomGrants']),
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

  AccessRequest _accessRequestFromData(String id, Map<String, dynamic> data) {
    return AccessRequest(
      id: id,
      schoolId: data['schoolId'] as String,
      contextId: data['contextId'] as String,
      contextName: data['contextName'] as String,
      requestedByUid: data['requestedByUid'] as String,
      requestedByDisplayName: data['requestedByDisplayName'] as String,
      targetUid: data['targetUid'] as String,
      targetDisplayName: data['targetDisplayName'] as String,
      level: AccessRequest.levelFromJson(data['level'] as String),
      status: AccessRequest.statusFromJson(data['status'] as String),
      resolvedByUid: data['resolvedByUid'] as String?,
    );
  }

  @override
  Future<void> createAccessRequest({
    required String schoolId,
    required String contextId,
    required String contextName,
    required String requestedByUid,
    required String requestedByDisplayName,
    required String targetUid,
    required String targetDisplayName,
    required ClassroomGrantLevel level,
  }) async {
    await _accessRequests.doc().set({
      'schoolId': schoolId,
      'contextId': contextId,
      'contextName': contextName,
      'requestedByUid': requestedByUid,
      'requestedByDisplayName': requestedByDisplayName,
      'targetUid': targetUid,
      'targetDisplayName': targetDisplayName,
      'level': level.name,
      'status': 'pending',
      'createdAt': FieldValue.serverTimestamp(),
    });
  }

  @override
  Stream<List<AccessRequest>> pendingAccessRequestsForSchool(String schoolId) {
    return _accessRequests
        .where('schoolId', isEqualTo: schoolId)
        .where('status', isEqualTo: 'pending')
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => _accessRequestFromData(doc.id, doc.data())).toList());
  }

  @override
  Stream<List<AccessRequest>> accessRequestsForContext(String contextId) {
    return _accessRequests
        .where('contextId', isEqualTo: contextId)
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => _accessRequestFromData(doc.id, doc.data())).toList());
  }

  @override
  Future<void> approveAccessRequest(AccessRequest request, {required String resolvedByUid}) async {
    final batch = _firestore.batch();
    batch.update(_accessRequests.doc(request.id), {
      'status': 'approved',
      'resolvedByUid': resolvedByUid,
      'resolvedAt': FieldValue.serverTimestamp(),
    });
    batch.update(_schools.doc(request.schoolId).collection('members').doc(request.targetUid), {
      'classroomGrants.${request.contextId}': request.level.name,
    });
    await batch.commit();
  }

  @override
  Future<void> declineAccessRequest(String requestId, {required String resolvedByUid}) async {
    await _accessRequests.doc(requestId).update({
      'status': 'declined',
      'resolvedByUid': resolvedByUid,
      'resolvedAt': FieldValue.serverTimestamp(),
    });
  }

  @override
  Future<void> cancelAccessRequest(String requestId) => _accessRequests.doc(requestId).delete();

  @override
  Future<void> revokeClassroomGrant(String schoolId, String uid, String contextId) async {
    await _schools.doc(schoolId).collection('members').doc(uid).update({
      'classroomGrants.$contextId': FieldValue.delete(),
    });
  }
}
