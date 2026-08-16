import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/services/school/school_repository.dart';

/// In-memory [SchoolRepository] for widget tests — mirrors
/// FakeClassroomRepository's role for ClassroomRepository.
class FakeSchoolRepository implements SchoolRepository {
  final Map<String, School> _schools = {};
  final Map<String, Map<String, SchoolMember>> _membersBySchool = {};
  final Map<String, List<String>> _schoolIdsByUser = {};
  final Map<String, PendingInvite> _invitesByEmail = {};

  int _nextId = 0;
  String _newId() => 'fake-school-${_nextId++}';

  @override
  Future<School> createSchool({
    required String name,
    required String principalUid,
    String? principalDisplayName,
    String? principalEmail,
  }) async {
    final school = School(id: _newId(), name: name, principalUid: principalUid);
    _schools[school.id] = school;
    _membersBySchool[school.id] = {
      principalUid: SchoolMember(
        uid: principalUid,
        role: MemberRole.admin,
        displayName: principalDisplayName ?? '',
        email: principalEmail ?? '',
      ),
    };
    _schoolIdsByUser.putIfAbsent(principalUid, () => []).add(school.id);
    return school;
  }

  @override
  Stream<List<String>> schoolIdsForUser(String uid) {
    return Stream.value(List.of(_schoolIdsByUser[uid] ?? const []));
  }

  @override
  Future<School?> getSchool(String schoolId) async => _schools[schoolId];

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
  Future<void> inviteMember({
    required String schoolId,
    required String email,
    required MemberRole role,
    MemberScope? scope,
    required String invitedByUid,
  }) async {
    final normalized = email.trim().toLowerCase();
    _invitesByEmail[normalized] = PendingInvite(
      email: normalized,
      schoolId: schoolId,
      role: role,
      scope: scope,
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
      scope: invite.scope,
    );
    _schoolIdsByUser.putIfAbsent(uid, () => []).add(invite.schoolId);
    _invitesByEmail.remove(normalized);
  }
}
