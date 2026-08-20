/// One priced item in a classroom's store — the Classroom Store Budget
/// starter lesson's decision lab. Nested under contexts/{contextId}/
/// storeItems in Firestore, mirroring packages/web/src/lib/firestore.ts's
/// storeItemFromDoc. Buying one isn't its own write path: the UI pre-fills
/// a normal spend transaction's amount/reason from the item, so the item
/// catalog and the ledger stay independent — editing or removing an item
/// never touches past purchases. Catalog management (add/edit/delete) is a
/// classroom-settings concern (target M-CLASS-05, not yet built natively);
/// this model only supports reading the catalog to prefill a spend.
class StoreItem {
  const StoreItem({
    required this.id,
    required this.contextId,
    required this.name,
    required this.priceCents,
    required this.createdByUid,
    required this.createdAt,
  });

  final String id;
  final String contextId;
  final String name;
  final int priceCents;
  final String createdByUid;
  final DateTime createdAt;
}
