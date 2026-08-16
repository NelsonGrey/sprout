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

  /// Null if [uid] isn't a member of [schoolId].
  Stream<SchoolMember?> myMembership(String schoolId, String uid);

  Stream<List<SchoolMember>> membersOfSchool(String schoolId);

  /// A delegate admin can remove a teacher; only a super_admin can remove
  /// an admin or another super_admin (hierarchical delegation — see
  /// firestore.rules). Removing the school's last super_admin is denied by
  /// the rules regardless of who attempts it.
  Future<void> removeMember(String schoolId, String uid);

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
