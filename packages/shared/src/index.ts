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
  firstName: string;
  lastName: string;
  /** Denormalized `${firstName} ${lastName}`, computed at write time by
   * addStudent/updateStudent — every display/sort/search call site reads
   * this instead of recombining first/last itself. */
  displayName: string;
  /** Plain admin-entered or CSV-imported school/district student ID,
   * distinct from the Firestore doc id. Not enforced unique by Firestore —
   * CSV import uses it for upsert matching within a school. Not the
   * barcode-ID-card feature (future/deferred), just roster metadata. */
  studentId?: string;
  balanceCents: number;
  contexts: Record<string, { type: ContextType; role: 'member' }>;
  /** The single classroom this student currently belongs to. Firestore
   * queries/rules require a scalar here, not an array — see firestore.rules'
   * isReadableClassroom comment. `contexts` above is the future multi-
   * context (family continuity) field; this is Phase 1's source of truth. */
  contextId: string;
  ownerUids: string[];
  /** Denormalized from the owning classroom at creation time — see
   * ClassroomContext.schoolId/gradeLevel. */
  schoolId?: string;
  gradeLevel?: string;
  /** Denormalized from the owning classroom's name at creation time — lets
   * the student's own read-only view (see linkedUid) show a classroom name
   * without ever needing a contexts/{contextId} read, which a linked
   * student must never have access to. Same staleness tradeoff as
   * schoolId/gradeLevel: a later classroom rename isn't cascaded back. */
  contextName?: string;
  /** The real Firebase Auth account (same Google/Apple/email providers
   * teachers use) linked to this roster entry, once claimed via
   * pendingStudentLinks — see firestore.rules' isValidStudentLinkClaim.
   * Absent until linked. Set only by the student's own verified-email
   * claim; cleared only by staff (unlink) — the normal staff update path
   * cannot change it (see firestore.rules). */
  linkedUid?: string;
  /** Set when a student leaves the school (graduated) via the Archive
   * Students flow — presence means archived. Balance and transaction
   * history are untouched; archived students just drop out of active
   * classroom/roster views. Cleared by restoreStudents when a returning
   * student is reassigned to a current classroom. */
  archivedAt?: Date;
  createdAt: Date;
}

export type TransactionType = 'earn' | 'spend';

/** Optional intent tag on an 'earn' transaction — lets a student/teacher
 * mark part of a balance as saved toward something specific vs. held in
 * reserve, the "goal or just-in-case" labeling called for by the Goal
 * Trail and Plan for the Unexpected starter lessons. Never valid on a
 * 'spend' transaction (see firestore.rules). */
export type SavingsLabel = 'goal' | 'just_in_case';

export interface LedgerTransaction {
  id: string;
  studentId: string;
  type: TransactionType;
  amountCents: number;
  reason: string;
  savingsLabel?: SavingsLabel;
  /** Set alongside savingsLabel: 'goal' when this earn was recorded
   * toward a specific Goal (see below) rather than the generic "goal"
   * label. Never valid on a 'spend' (see firestore.rules). */
  goalId?: string;
  createdByUid: string;
  createdAt: Date;
  ownerUids: string[];
}

/** A student's simulated savings goal — name, target amount, and running
 * progress — the "goal trail" the Build a Goal Trail and Opportunity Cost
 * Challenge starter lessons are built around. Nested under
 * students/{studentId}/goals in Firestore. savedCents is incremented
 * alongside a student's balanceCents whenever an 'earn' transaction names
 * this goal via LedgerTransaction.goalId (see recordTransaction) — it is
 * a parallel tracking total, not a separate pool of money; the earned
 * amount still counts toward the student's one real balance too. A goal
 * is "achieved" when savedCents >= targetCents — deliberately not a
 * separate stored status, so there's only one source of truth. */
export interface Goal {
  id: string;
  studentId: string;
  name: string;
  targetCents: number;
  savedCents: number;
  createdByUid: string;
  createdAt: Date;
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
  /** Which of the full PK-12 grade range this school actually offers —
   * filters the grade chips/dropdowns shown to admins for this school
   * (teacher scope picker, classroom creation). Absent means all grades
   * are enabled, so every existing school's behavior is unchanged until
   * an admin explicitly trims it. Not a security boundary — gradeLevel
   * stays free-text and unenforced at the rules layer regardless. */
  enabledGrades?: string[];
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

/** 'award' = record earn/spend transactions only; 'manage' = full
 * rename/delete/roster rights, same as the classroom's owner. Only ever
 * set via an admin approving an AccessRequest (or an admin editing it
 * directly) — an owner can only propose, never grant directly. */
export type ClassroomGrantLevel = 'award' | 'manage';

export interface SchoolMember {
  uid: string;
  role: MemberRole;
  displayName: string;
  email: string;
  /** Pure supplementary roster metadata (manual edit or CSV import) —
   * never overwrites displayName, never consulted by the invite/claim
   * identity logic. displayName (auth-provider-sourced) stays the one
   * authoritative name. */
  firstName?: string;
  lastName?: string;
  staffId?: string;
  scope?: MemberScope;
  /** contextId -> grant level, for classrooms this member doesn't own and
   * whose grade/scope wouldn't otherwise cover (see ClassroomGrantLevel). */
  classroomGrants?: Record<string, ClassroomGrantLevel>;
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
  firstName?: string;
  lastName?: string;
  staffId?: string;
  invitedByUid: string;
  createdAt: Date;
}

/** Doc ID is the target student's real school email, lowercased. Created
 * by staff with manage access to the named student's classroom; claimed
 * automatically the first time that email signs in — mirrors PendingInvite,
 * except the claim writes onto an EXISTING students/{studentId} doc rather
 * than creating a new doc under the claimant's own uid (see
 * claimPendingStudentLinkIfAny / firestore.rules' isValidStudentLinkClaim).
 * Deliberately carries no contextId/schoolId — those are derived from
 * studentId itself so there's no spoofable field for a caller to lie about
 * which classroom they manage. */
export interface PendingStudentLink {
  email: string;
  studentId: string;
  invitedByUid: string;
  createdAt: Date;
}

export type AccessRequestStatus = 'pending' | 'approved' | 'declined';

/** A classroom owner's request that a colleague (an existing active
 * teacher member of the school) get 'award' or 'manage' access to
 * specifically their classroom — fulfilled only by an admin/super_admin,
 * who writes the resulting grant onto the target's classroomGrants. Keeps
 * "only admins/super_admins grant access" intact: an owner can only
 * propose. */
export interface AccessRequest {
  id: string;
  schoolId: string;
  contextId: string;
  contextName: string;
  requestedByUid: string;
  requestedByDisplayName: string;
  targetUid: string;
  targetDisplayName: string;
  level: ClassroomGrantLevel;
  status: AccessRequestStatus;
  createdAt: Date;
  resolvedByUid?: string;
  resolvedAt?: Date;
}
