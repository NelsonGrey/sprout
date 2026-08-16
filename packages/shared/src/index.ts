// Domain types mirroring the Firestore schema in firestore.rules / TRD §3.2.
// packages/mobile (Dart) mirrors these shapes independently — there's no
// cross-language codegen here, so keep the two in sync by hand.

export type ContextType = 'classroom' | 'family';

export interface ClassroomContext {
  id: string;
  type: ContextType;
  name: string;
  ownerUids: string[];
  createdAt: Date;
}

export interface Student {
  id: string;
  displayName: string;
  balanceCents: number;
  contexts: Record<string, { type: ContextType; role: 'member' }>;
  contextIds: string[];
  ownerUids: string[];
  createdAt: Date;
}

export type TransactionType = 'earn' | 'spend';

export interface LedgerTransaction {
  id: string;
  studentId: string;
  type: TransactionType;
  amountCents: number;
  reason: string;
  createdByUid: string;
  createdAt: Date;
  ownerUids: string[];
}
