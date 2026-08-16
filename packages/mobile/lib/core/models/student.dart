/// A roster entry belonging to one or more [ClassroomContext]s, with a
/// denormalized running balance built from its transaction history.
class Student {
  const Student({
    required this.id,
    required this.displayName,
    required this.balanceCents,
    required this.ownerUids,
  });

  final String id;
  final String displayName;
  final int balanceCents;
  final List<String> ownerUids;
}
