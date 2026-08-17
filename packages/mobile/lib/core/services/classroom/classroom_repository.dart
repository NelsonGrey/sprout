import 'package:sprout/core/models/classroom_context.dart';
import 'package:sprout/core/models/ledger_transaction.dart';
import 'package:sprout/core/models/school.dart';
import 'package:sprout/core/models/student.dart';

/// Firestore-backed classroom data access, behind an interface so screens
/// can be tested against [FakeClassroomRepository] — same shape as
/// AuthService/FirebaseAuthService/FakeAuthService.
abstract class ClassroomRepository {
  Stream<List<ClassroomContext>> myClassrooms(String ownerUid);

  /// Classrooms visible via a school-wide or grade-level scope grant
  /// (BR-1.3.11/1.3.12), independent of direct ownership — the caller
  /// merges this with [myClassrooms] client-side, de-duplicating by id.
  /// [gradeLevels] null means whole-school scope (every classroom in the
  /// school); non-null filters to those specific grades.
  Stream<List<ClassroomContext>> classroomsInSchool(String schoolId, {List<String>? gradeLevels});

  /// A single classroom by id, regardless of ownership — for a classroom's
  /// detail screen, where the viewer may be an admin/super_admin or a
  /// scoped-but-non-owning teacher rather than the direct owner. Relies on
  /// the same firestore.rules read permission (isContextOwner ||
  /// hasScopedAccess) that already governs [myClassrooms]/
  /// [classroomsInSchool]; emits null if the doc doesn't exist/isn't
  /// visible to this viewer.
  Stream<ClassroomContext?> classroom(String contextId);

  /// Rename or re-grade a classroom. Not cascading — students' contextIds
  /// pointing at a since-deleted classroom aren't cleaned up by
  /// [deleteClassroom]; there's no batch/cascade infrastructure for that yet.
  Future<void> updateClassroom(String contextId, {String? name, String? gradeLevel});

  Future<void> deleteClassroom(String contextId);

  /// Also upserts `users/{ownerUid}` with [ownerDisplayName]/[ownerEmail] —
  /// the first classroom a teacher creates is when their profile doc is
  /// written. [schoolId]/[gradeLevel] are optional — omit for a standalone
  /// classroom (today's default flow); set both to affiliate it with a
  /// school so scoped members can see it.
  Future<ClassroomContext> createClassroom({
    required String name,
    required String ownerUid,
    String? ownerDisplayName,
    String? ownerEmail,
    String? schoolId,
    String? gradeLevel,
  });

  Stream<List<Student>> studentsInClassroom(String contextId);

  /// [schoolId]/[gradeLevel] should mirror the owning classroom's, if any —
  /// denormalized at creation time for scoped reads (see
  /// [classroomsInSchool]). [studentId] is a plain admin/CSV-entered
  /// school/district ID string, distinct from the returned [Student.id].
  /// [contextName] denormalizes the owning classroom's name so a linked
  /// student's own read-only view can show it without a contexts read.
  Future<Student> addStudent({
    required String contextId,
    required String firstName,
    required String lastName,
    required List<String> ownerUids,
    String? studentId,
    String? schoolId,
    String? gradeLevel,
    String? contextName,
  });

  /// Not cascading — a deleted student's transactions subcollection (owned
  /// by the context, not the student) is orphaned but inert, never queried
  /// without a studentId filter that would now just return nothing new.
  /// [firstName]/[lastName] must be updated together (both or neither) — a
  /// partial name update would leave displayName recombined from a stale
  /// half; callers editing a name always present both fields at once.
  Future<void> updateStudent(
    String id, {
    String? firstName,
    String? lastName,
    String? studentId,
    String? gradeLevel,
  });

  Future<void> deleteStudent(String studentId);

  Stream<List<LedgerTransaction>> transactionsForStudent({
    required String contextId,
    required String studentId,
  });

  /// Atomically creates the transaction and updates the student's
  /// [Student.balanceCents] — never two separate writes. [schoolId]/
  /// [gradeLevel] should mirror the student's, if any — denormalized so a
  /// scoped/delegated (not just owning) teacher's award actually satisfies
  /// the transactions rule's hasAwardAccess check.
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
  });

  // ---- Student self-service linking (BR-1.3.3/1.4.1) ----

  /// Records that [email] should be linked to [studentId] the first time
  /// that email signs in — see [claimPendingStudentLinkIfAny]. Only a
  /// staff member with manage access to the student's classroom may call
  /// this (enforced by firestore.rules' canManageStudentLink, not just
  /// this UI).
  Future<void> linkStudentAccount({
    required String studentId,
    required String email,
    required String invitedByUid,
  });

  Future<void> cancelStudentLink(String email);

  Stream<PendingStudentLink?> pendingStudentLinkForStudent(String studentId);

  /// Staff clearing a linked account — the only way to free up a
  /// mis-linked record for relinking (firestore.rules enforces
  /// first-claim-wins, so a second claim attempt is denied without this).
  Future<void> unlinkStudentAccount(String studentId);

  /// Runs once after every sign-in, alongside claimPendingInviteIfAny: if
  /// a pending student link exists for [email], links this account to
  /// that student's roster record and deletes the pending link. No-op if
  /// there's no matching pending link — the normal case for every
  /// non-student user.
  Future<void> claimPendingStudentLinkIfAny({required String uid, required String email});

  /// The student roster record linked to [uid], if any — null once loaded
  /// if this account isn't linked to a student. Queries `linkedUid == uid`
  /// rather than reading a classroom's full roster, since
  /// firestore.rules' isLinkedStudentSelf only ever matches the caller's
  /// own doc — any broader query would be denied outright the moment a
  /// classroom has more than one student.
  Stream<Student?> linkedStudentForUser(String uid);
}
