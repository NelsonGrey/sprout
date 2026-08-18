/// "Mary Jane Smith" -> ("Mary Jane", "Smith") — splits on the last
/// whitespace so the existing single-box quick-add UI can keep working
/// unchanged while the stored record gets structured first/last fields. A
/// single-word name (no space) becomes an empty last name.
(String firstName, String lastName) splitDisplayName(String name) {
  final trimmed = name.trim();
  final lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace == -1) return (trimmed, '');
  return (trimmed.substring(0, lastSpace).trim(), trimmed.substring(lastSpace + 1).trim());
}

String combineDisplayName(String firstName, String lastName) =>
    [firstName, lastName].where((s) => s.isNotEmpty).join(' ').trim();

/// A roster entry belonging to one or more [ClassroomContext]s, with a
/// denormalized running balance built from its transaction history.
class Student {
  const Student({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.displayName,
    required this.balanceCents,
    required this.ownerUids,
    this.studentId,
    this.schoolId,
    this.gradeLevel,
    this.contextId,
    this.contextName,
    this.linkedUid,
  });

  final String id;
  final String firstName;
  final String lastName;

  /// Denormalized `'$firstName $lastName'`, computed at write time by
  /// [ClassroomRepository.addStudent]/`updateStudent` — every display/sort
  /// call site reads this instead of recombining first/last itself.
  final String displayName;

  /// Plain admin-entered or CSV-imported school/district student ID,
  /// distinct from the Firestore doc id. Not enforced unique by Firestore.
  /// Not the barcode-ID-card feature (future/deferred), just roster
  /// metadata.
  final String? studentId;

  final int balanceCents;
  final List<String> ownerUids;

  /// Denormalized from the owning classroom at creation time — see
  /// [ClassroomContext.schoolId]/[ClassroomContext.gradeLevel].
  final String? schoolId;
  final String? gradeLevel;

  /// The classroom this student belongs to — mirrors Firestore's scalar
  /// `contextId` field. Mobile has never needed to carry more than one,
  /// since every screen that reads a Student already knows its contextId
  /// from route params.
  /// Only needed as a field at all for contexts (like the student's own
  /// balance view) that don't have a route-supplied contextId to fall
  /// back on.
  final String? contextId;

  /// Denormalized from the owning classroom's name at creation time — lets
  /// the student's own read-only view (see [linkedUid]) show a classroom
  /// name without ever needing a contexts/{contextId} read, which a linked
  /// student must never have access to.
  final String? contextName;

  /// The real Firebase Auth account (same Google/Apple/email providers
  /// teachers use) linked to this roster entry, once claimed via
  /// pendingStudentLinks. Absent until linked. Set only by the student's
  /// own verified-email claim; cleared only by staff (unlink) — the normal
  /// staff update path cannot change it (see firestore.rules).
  final String? linkedUid;
}
