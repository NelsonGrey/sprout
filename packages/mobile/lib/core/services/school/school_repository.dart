import 'package:sprout/core/models/school.dart';

/// Firestore-backed school/role/grant data access, behind an interface so
/// screens can be tested against [FakeSchoolRepository] — same shape as
/// AuthService/ClassroomRepository.
abstract class SchoolRepository {
  /// The caller becomes the school's founding super_admin. Also upserts
  /// `users/{founderUid}` and adds the school to
  /// `users/{founderUid}.schoolIds` — mirrors
  /// [ClassroomRepository.createClassroom]'s first-write-creates-profile
  /// pattern.
  Future<School> createSchool({
    required String name,
    required String founderUid,
    String? founderDisplayName,
    String? founderEmail,
  });

  Stream<List<String>> schoolIdsForUser(String uid);

  Future<School?> getSchool(String schoolId);

  /// Name and enabledGrades only — no delete (rules permit it, but there's
  /// no cascade-delete for the school's contexts/students/members/invites).
  Future<void> updateSchool(String schoolId, {String? name, List<String>? enabledGrades});

  /// Null if [uid] isn't a member of [schoolId].
  Stream<SchoolMember?> myMembership(String schoolId, String uid);

  Stream<List<SchoolMember>> membersOfSchool(String schoolId);

  /// A delegate admin can remove a teacher; only a super_admin can remove
  /// an admin or another super_admin (hierarchical delegation — see
  /// firestore.rules). Removing the school's last super_admin is denied by
  /// the rules regardless of who attempts it.
  Future<void> removeMember(String schoolId, String uid);

  /// Changes an existing teacher's scope only — never role. Role changes
  /// (promoting/demoting across teacher/admin/super_admin) stay a two-step
  /// remove-then-reinvite flow; firestore.rules' members update rule only
  /// permits writes that leave role as 'teacher'.
  Future<void> updateMemberScope(String schoolId, String uid, MemberScope scope);

  /// Records who's coming, keyed by email — not tied to an existing
  /// account. Activated automatically the first time that email signs in
  /// (see [claimPendingInviteIfAny]), whether that's before or after this
  /// call.
  Future<void> inviteMember({
    required String schoolId,
    required String email,
    required MemberRole role,
    MemberScope? scope,
    String? firstName,
    String? lastName,
    String? staffId,
    required String invitedByUid,
  });

  Stream<List<PendingInvite>> pendingInvitesForSchool(String schoolId);

  Future<void> cancelInvite(String email);

  /// Runs once after every sign-in, on every platform: if a pending invite
  /// exists for [email], activates the access it configured (creates the
  /// `members` doc, appends to `users/{uid}.schoolIds`) and deletes the
  /// invite. No-op if there's no matching invite — the normal case for
  /// every self-serve/standalone user.
  Future<void> claimPendingInviteIfAny({
    required String uid,
    required String email,
    String? displayName,
  });

  /// A classroom owner proposing that a colleague (an existing active
  /// teacher member of the school) get 'award' or 'manage' access to
  /// specifically their classroom. Grants nothing by itself — only an
  /// admin/super_admin approving it (see [approveAccessRequest]) actually
  /// grants access, keeping "only admins/super_admins grant access" intact.
  Future<void> createAccessRequest({
    required String schoolId,
    required String contextId,
    required String contextName,
    required String requestedByUid,
    required String requestedByDisplayName,
    required String targetUid,
    required String targetDisplayName,
    required ClassroomGrantLevel level,
  });

  Stream<List<AccessRequest>> pendingAccessRequestsForSchool(String schoolId);

  /// A classroom's own request history (any status) — for the owner's view
  /// on the classroom detail screen.
  Stream<List<AccessRequest>> accessRequestsForContext(String contextId);

  /// Approving is the only thing that actually grants access: updates the
  /// request's status and writes the requested level onto the target's
  /// classroomGrants.
  Future<void> approveAccessRequest(AccessRequest request, {required String resolvedByUid});

  Future<void> declineAccessRequest(String requestId, {required String resolvedByUid});

  /// The requester cancelling their own still-pending request.
  Future<void> cancelAccessRequest(String requestId);

  /// Admin-direct revoke — grants shouldn't be permanent with no way back
  /// short of editing Firestore.
  Future<void> revokeClassroomGrant(String schoolId, String uid, String contextId);
}
