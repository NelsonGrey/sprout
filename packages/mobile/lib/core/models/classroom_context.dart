/// A classroom (or, eventually, family) unit that owns a roster of
/// [Student]s. Only the `classroom` context type is used today.
class ClassroomContext {
  const ClassroomContext({
    required this.id,
    required this.name,
    required this.ownerUids,
    this.schoolId,
    this.gradeLevel,
  });

  final String id;
  final String name;
  final List<String> ownerUids;

  /// Set only for school-affiliated classrooms — absent for standalone
  /// teacher-created classrooms and every family context.
  final String? schoolId;
  final String? gradeLevel;
}
