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

  /// Name only — no delete (rules permit it, but there's no cascade-delete
  /// for the school's contexts/students/members/invites).
  Future<void> updateSchool(String schoolId, {String? name});

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
}
