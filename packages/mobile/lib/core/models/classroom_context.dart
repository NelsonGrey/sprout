/// A classroom (or, eventually, family) unit that owns a roster of
/// [Student]s. Only the `classroom` context type is used today.
class ClassroomContext {
  const ClassroomContext({
    required this.id,
    required this.name,
    required this.ownerUids,
  });

  final String id;
  final String name;
  final List<String> ownerUids;
}
