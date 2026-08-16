// Domain types mirroring the Firestore schema in firestore.rules / TRD §3.2.
// packages/mobile (Dart) mirrors these shapes independently — there's no
// cross-language codegen here, so keep the two in sync by hand.

export type ContextType = 'classroom' | 'family';

export interface ClassroomContext {
  id: string;
  type: ContextType;
  name: string;
  ownerUids: string[];
  /** Set only for school-affiliated classrooms — absent for standalone
   * teacher-created classrooms and every family context. */
  schoolId?: string;
  gradeLevel?: string;
  createdAt: Date;
}

export interface Student {
  id: string;
  displayName: string;
  balanceCents: number;
  contexts: Record<string, { type: ContextType; role: 'member' }>;
  contextIds: string[];
  ownerUids: string[];
  /** Denormalized from the owning classroom at creation time — see
   * ClassroomContext.schoolId/gradeLevel. */
  schoolId?: string;
  gradeLevel?: string;
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

// ---- School security matrix (BR-1.3.11/1.3.12) ----
// See firestore.rules for the enforcement side of this model.

// founderUid/superAdminCount are rules bootstrap/invariant plumbing (see
// firestore.rules' isFoundingSuperAdmin), not app-facing — deliberately
// not modeled here; lib/school.ts writes them directly.
export interface School {
  id: string;
  name: string;
  /** Set when the founder picked a match from the NCES public-school
   * lookup rather than typing a name manually — informational only. */
  nces?: { ncesId: string; street: string; city: string; state: string; zip: string };
  createdAt: Date;
}

/** Hierarchical delegation: only a super_admin can create/remove another
 * super_admin or an admin. A school is never left without at least one
 * super_admin (enforced in firestore.rules, not just the UI). */
export type MemberRole = 'super_admin' | 'admin' | 'teacher';

/** Meaningless for admins (implicit whole-school access). For teachers:
 * 'own' = only classrooms they directly own (the default); 'grades' = any
 * classroom in the school whose gradeLevel is in `grades`; 'school' = every
 * classroom in the school (the PE/art/music case). */
export type MemberScope = { type: 'own' } | { type: 'grades'; grades: string[] } | { type: 'school' };

export interface SchoolMember {
  uid: string;
  role: MemberRole;
  displayName: string;
  email: string;
  scope?: MemberScope;
  addedByUid: string;
  createdAt: Date;
}

/** Doc ID is the invitee's lowercased email. Claimed automatically the
 * first time that email signs in, on whichever platform they use. */
export interface PendingInvite {
  email: string;
  schoolId: string;
  role: MemberRole;
  scope?: MemberScope;
  invitedByUid: string;
  createdAt: Date;
}
