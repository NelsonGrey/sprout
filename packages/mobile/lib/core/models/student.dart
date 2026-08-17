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
}
