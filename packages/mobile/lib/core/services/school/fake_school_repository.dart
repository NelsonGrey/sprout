import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/services/school/school_repository.dart';

/// In-memory [SchoolRepository] for widget tests — mirrors
/// FakeClassroomRepository's role for ClassroomRepository.
class FakeSchoolRepository implements SchoolRepository {
  final Map<String, School> _schools = {};
  final Map<String, Map<String, SchoolMember>> _membersBySchool = {};
  final Map<String, List<String>> _schoolIdsByUser = {};
  final Map<String, PendingInvite> _invitesByEmail = {};
  final Map<String, AccessRequest> _accessRequestsById = {};

  int _nextId = 0;
  String _newId() => 'fake-school-${_nextId++}';

  @override
  Future<School> createSchool({
    required String name,
    required String founderUid,
    String? founderDisplayName,
    String? founderEmail,
  }) async {
    final school = School(id: _newId(), name: name);
    _schools[school.id] = school;
    _membersBySchool[school.id] = {
      founderUid: SchoolMember(
        uid: founderUid,
        role: MemberRole.superAdmin,
        displayName: founderDisplayName ?? '',
        email: founderEmail ?? '',
      ),
    };
    _schoolIdsByUser.putIfAbsent(founderUid, () => []).add(school.id);
    return school;
  }

  @override
  Stream<List<String>> schoolIdsForUser(String uid) {
    return Stream.value(List.of(_schoolIdsByUser[uid] ?? const []));
  }

  @override
  Future<School?> getSchool(String schoolId) async => _schools[schoolId];

  @override
  Future<void> updateSchool(String schoolId, {String? name, List<String>? enabledGrades}) async {
    final existing = _schools[schoolId];
    if (existing == null) return;
    _schools[schoolId] = School(
      id: existing.id,
      name: name ?? existing.name,
      enabledGrades: enabledGrades ?? existing.enabledGrades,
    );
  }

  @override
  Stream<SchoolMember?> myMembership(String schoolId, String uid) {
    return Stream.value(_membersBySchool[schoolId]?[uid]);
  }

  @override
  Stream<List<SchoolMember>> membersOfSchool(String schoolId) {
    return Stream.value(List.of(_membersBySchool[schoolId]?.values ?? const []));
  }

  @override
  Future<void> removeMember(String schoolId, String uid) async {
    _membersBySchool[schoolId]?.remove(uid);
  }

  @override
  Future<void> updateMemberScope(String schoolId, String uid, MemberScope scope) async {
    final member = _membersBySchool[schoolId]?[uid];
    if (member == null) return;
    _membersBySchool[schoolId]![uid] = member.copyWith(scope: scope);
  }

  @override
  Future<void> inviteMember({
    required String schoolId,
    required String email,
    required MemberRole role,
    MemberScope? scope,
    String? firstName,
    String? lastName,
    String? staffId,
    required String invitedByUid,
  }) async {
    final normalized = email.trim().toLowerCase();
    _invitesByEmail[normalized] = PendingInvite(
      email: normalized,
      schoolId: schoolId,
      role: role,
      scope: scope,
      firstName: firstName,
      lastName: lastName,
      staffId: staffId,
    );
  }

  @override
  Stream<List<PendingInvite>> pendingInvitesForSchool(String schoolId) {
    return Stream.value(
      _invitesByEmail.values.where((invite) => invite.schoolId == schoolId).toList(),
    );
  }

  @override
  Future<void> cancelInvite(String email) async {
    _invitesByEmail.remove(email.trim().toLowerCase());
  }

  @override
  Future<void> claimPendingInviteIfAny({
    required String uid,
    required String email,
    String? displayName,
  }) async {
    final normalized = email.trim().toLowerCase();
    final invite = _invitesByEmail[normalized];
    if (invite == null) return;

    _membersBySchool.putIfAbsent(invite.schoolId, () => {})[uid] = SchoolMember(
      uid: uid,
      role: invite.role,
      displayName: displayName ?? '',
      email: normalized,
      firstName: invite.firstName,
      lastName: invite.lastName,
      staffId: invite.staffId,
      scope: invite.scope,
    );
    _schoolIdsByUser.putIfAbsent(uid, () => []).add(invite.schoolId);
    _invitesByEmail.remove(normalized);
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
    final id = _newId();
    _accessRequestsById[id] = AccessRequest(
      id: id,
      schoolId: schoolId,
      contextId: contextId,
      contextName: contextName,
      requestedByUid: requestedByUid,
      requestedByDisplayName: requestedByDisplayName,
      targetUid: targetUid,
      targetDisplayName: targetDisplayName,
      level: level,
      status: AccessRequestStatus.pending,
    );
  }

  @override
  Stream<List<AccessRequest>> pendingAccessRequestsForSchool(String schoolId) {
    return Stream.value(
      _accessRequestsById.values
          .where((r) => r.schoolId == schoolId && r.status == AccessRequestStatus.pending)
          .toList(),
    );
  }

  @override
  Stream<List<AccessRequest>> accessRequestsForContext(String contextId) {
    return Stream.value(
      _accessRequestsById.values.where((r) => r.contextId == contextId).toList(),
    );
  }

  @override
  Future<void> approveAccessRequest(AccessRequest request, {required String resolvedByUid}) async {
    _accessRequestsById[request.id] = request.copyWith(
      status: AccessRequestStatus.approved,
      resolvedByUid: resolvedByUid,
    );
    final member = _membersBySchool[request.schoolId]?[request.targetUid];
    if (member != null) {
      _membersBySchool[request.schoolId]![request.targetUid] = member.copyWith(
        classroomGrants: {...member.classroomGrants, request.contextId: request.level},
      );
    }
  }

  @override
  Future<void> declineAccessRequest(String requestId, {required String resolvedByUid}) async {
    final request = _accessRequestsById[requestId];
    if (request == null) return;
    _accessRequestsById[requestId] = request.copyWith(
      status: AccessRequestStatus.declined,
      resolvedByUid: resolvedByUid,
    );
  }

  @override
  Future<void> cancelAccessRequest(String requestId) async {
    _accessRequestsById.remove(requestId);
  }

  @override
  Future<void> revokeClassroomGrant(String schoolId, String uid, String contextId) async {
    final member = _membersBySchool[schoolId]?[uid];
    if (member == null) return;
    final updatedGrants = {...member.classroomGrants}..remove(contextId);
    _membersBySchool[schoolId]![uid] = member.copyWith(classroomGrants: updatedGrants);
  }
}
