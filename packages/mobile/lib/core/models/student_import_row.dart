/// One parsed+validated CSV row, ready to commit. [existingId] is the
/// Firestore doc id of the student this row updates (matched by studentId
/// within the school) — absent means create new. Mirrors web's
/// `StudentImportRow` (packages/web/src/lib/firestore.ts) exactly: a
/// matched row updates name/studentId/gradeLevel only, never
/// contextId/ownerUids, even if the chosen destination classroom differs
/// from where the student already is.
class StudentImportRow {
  const StudentImportRow({
    required this.firstName,
    required this.lastName,
    this.studentId,
    this.gradeLevel,
    this.existingId,
  });

  final String firstName;
  final String lastName;
  final String? studentId;
  final String? gradeLevel;
  final String? existingId;
}
