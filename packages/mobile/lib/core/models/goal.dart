/// A student's simulated savings goal — name, target amount, and running
/// progress — the "goal trail" the Build a Goal Trail and Opportunity Cost
/// Challenge starter lessons are built around. Nested under
/// students/{studentId}/goals in Firestore, mirroring
/// packages/web/src/lib/firestore.ts's goalFromDoc/createGoal. [savedCents]
/// is incremented alongside a student's balanceCents whenever an 'earn'
/// transaction names this goal (see ClassroomRepository.recordTransaction)
/// — it is a parallel tracking total, not a separate pool of money. A goal
/// is "achieved" when savedCents >= targetCents — deliberately not a
/// separate stored status, so there's only one source of truth.
class Goal {
  const Goal({
    required this.id,
    required this.studentId,
    required this.name,
    required this.targetCents,
    required this.savedCents,
    required this.createdByUid,
    required this.createdAt,
  });

  final String id;
  final String studentId;
  final String name;
  final int targetCents;
  final int savedCents;
  final String createdByUid;
  final DateTime createdAt;

  bool get achieved => savedCents >= targetCents;
}
