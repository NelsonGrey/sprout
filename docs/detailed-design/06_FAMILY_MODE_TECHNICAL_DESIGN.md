# 06 — Family Mode Technical Design

**Status: DRAFT — not approved. No implementation may begin until this document (or a revised version of it) is explicitly approved, per 05_IMPLEMENTATION_HANDOFF.md's Slice 5 prerequisite and the Hard Stop: "do not write family records by setting current classroom fields to `type: 'family'` while retaining a single scalar learner context/balance."**

This document is the "separate technical design" that 01_EXPERIENCE_FOUNDATIONS.md §4.2 and 05_IMPLEMENTATION_HANDOFF.md's Slice 5 both require before any family-mode UI, rule, or write path is built. It answers each mandatory prerequisite from the handoff doc in turn, then flags the parts that are policy decisions rather than engineering ones.

## 0. Why this can't be a small extension of the current model

Today one Firestore document — `students/{studentId}` — conflates two things that family mode needs to pull apart:

1. **Roster membership**: a scalar `contextId` pointing at exactly one `contexts/{id}` classroom, with `balanceCents`, goals, and transaction history all keyed to that single membership.
2. **The learner as a person**: identified only by `linkedUid` (their real Firebase Auth account, once claimed) — this part *is* already stable, but nothing above it lets that one person have two separate memberships (one classroom, one family) with two separate balances at once.

`Student.contexts: Record<string, {...}>` was scaffolded for this back when the schema was written, but it has never been read by any query, rule, or UI — it's dead. It also can't simply be turned on: `contextId` became a scalar specifically because Firestore's list-query rule evaluator denies an entire query if the authorization decision depends on any field the query itself doesn't constrain, *including indexing into an array/map field on the scanned document* (confirmed failure mode: `Function not found error: Name: [size]`). That constraint is why `students` documents carry one scalar `contextId`, not an array — see `firestore.rules`' `isReadableClassroom` and TECHNICAL_REQUIREMENTS.md §2.5. It caused a real production incident (empty classroom rosters for every caller) when a list query was added without a rule test proving this. Any family design has to satisfy the same constraint again, for a genuinely new access pattern (one learner, two membership types) — that's the "re-solve, not just re-apply" TECHNICAL_REQUIREMENTS.md §2.5 already calls out.

## 1. Stable learner identity vs. per-context membership

**Decision: the stable identity is the existing Firebase Auth `uid` — nothing new needs inventing here.** A human already has exactly one `uid` (or, pre-link, one pending-claim email) regardless of how many contexts they belong to. What's missing is a *membership* shape that can point at that same `uid` from more than one place at once without merging their data.

**Decision: don't generalize `students` into a shared "membership" collection joined to a separate context type. Add a second, structurally-identical collection instead.**

This is the load-bearing choice in this design, so the reasoning is worth stating plainly: the safe, list-query-provable shape (scalar `contextId` per document, authorization resolved via `get()` on the *foreign* context document) already exists and is already proven in production. Inventing a generic multi-membership join table is exactly the shape that was tried once (`contexts` array/map) and doesn't work under Firestore's rule evaluator. Rather than solve that problem in a harder, more general form, this design proposes reusing the *exact same proven shape* a second time:

```
familyMembers/{familyMemberId}
  firstName, lastName, displayName
  balanceCents                    # this family membership's own balance — never combined with a students/ balance
  contextId                       # scalar — the one family context this membership belongs to
  linkedUid?                      # same claim mechanism as students.linkedUid
  archivedAt?
  createdAt

familyMembers/{familyMemberId}/goals/{goalId}       # identical shape to students/{id}/goals
contexts/{familyContextId}/transactions/{id}         # reuses the existing contexts/{id}/transactions subcollection;
                                                      # studentId field renamed/repurposed conceptually to "memberId",
                                                      # scoped by type:'family' on the parent context doc
```

A `contexts/{id}` doc with `type: 'family'` already validates against the existing `ContextType` union — no schema change needed there. What changes is that `familyMembers` (not `students`) is the collection those family-typed context IDs get referenced from, and nothing in the `students`/classroom path ever reads or writes `familyMembers`, or vice versa.

**Why not literally reuse `students` with a `type` filter?** Because every existing classroom rule, query, and index is written against `students` with the implicit assumption "this student belongs to a classroom, `contextId` resolves to a `type: 'classroom'` context." Threading a family/classroom distinction through every one of those rules (roster list queries, transaction authorization, goal authorization, CSV import, promote/archive/bulk-move) roughly doubles the conditional complexity of the single riskiest file in the codebase, for a security boundary (school vs. family) that a second collection gets *for free*, by construction — a family screen's repository methods simply have no code path that can touch `contexts/{id}` where `type == 'classroom'` or `students/`, because they never call those functions. That directly satisfies the handoff's "prove no classroom query/write occurs from family screens" requirement without a runtime check.

One human can therefore have a `students/{a}` doc (linkedUid → their uid, classroom X) *and* a `familyMembers/{b}` doc (linkedUid → the same uid, family Y) simultaneously. There is no shared scalar between the two documents, so "never total balances across contexts" (01_EXPERIENCE_FOUNDATIONS.md §4.2) holds structurally, not just by UI convention — summing them would require a caller to deliberately fetch both and add, not something any existing query does.

## 2. Separate per-context balances, goals, history, catalog, archive state

Each `familyMembers/{id}` document is a complete, independent copy of the classroom pattern:

| Concern | Classroom (`students/{id}`) | Family (`familyMembers/{id}`) |
|---|---|---|
| Balance | `balanceCents` scalar | `balanceCents` scalar — own field, own document |
| Goals | `students/{id}/goals/{goalId}` | `familyMembers/{id}/goals/{goalId}` |
| History | `contexts/{contextId}/transactions` filtered by `studentId` | `contexts/{familyContextId}/transactions` filtered by `memberId`, same subcollection pattern, different parent context |
| Catalog (store items) | `contexts/{contextId}/storeItems` | `contexts/{familyContextId}/storeItems` — reused as-is; a family manager configuring "family store" items is the same write path with a different owning context |
| Archive state | `archivedAt` on `students/{id}` | `archivedAt` on `familyMembers/{id}` |

No cross-references. A family member's transaction history query never touches `students`; a classroom roster query never touches `familyMembers`.

## 3. Migration from `Student.contextId`/`balanceCents`

**There is no migration.** `students` is untouched — same fields, same rules, same indexes, same queries, same history. Family is purely additive: a new collection, a new context type value that was already declared but inert, new rules scoped to the new collection. Existing classroom data, balances, and history are not read, copied, or restructured by this design at all. This is the strongest form of "without losing history" available — nothing about history changes.

The only mutation to an *existing* document type is the family context creation itself writing a new `contexts/{id}` doc with `type: 'family'` — which was always a legal value there.

## 4. Firestore query shapes compatible with rules

Every family list query mirrors an already-proven classroom query, substituting `familyMembers` for `students`:

- **"My family memberships"** (context switcher, `useIsLinkedStudent`'s family equivalent): `familyMembers` where `linkedUid == request.auth.uid` — identical shape to the existing (working, tested) `students` where `linkedUid == uid` query. Query-constrained on the exact field the rule checks; no foreign-document `get()` even needed for this one.
- **"Family roster for a manager"**: `familyMembers` where `contextId == :familyContextId` — identical shape to `students` where `contextId == :classroomContextId`, which already has a passing list-query regression test to model the new one on.
- **Authorization for both**: `isReadableFamilyContext(contextId)` — a near-verbatim copy of `isReadableClassroom(contextId)`, `get()`-ing the foreign `contexts/{contextId}` document (query-constrained scalar → sanctioned foreign `get()`, per the existing proof) and checking `ownerUids`/manager membership instead of school award-access.
- **Transactions/goals under a family member**: same subcollection-under-query-constrained-parent-id shape already used and tested for classroom transactions/goals.

No new query shape is being invented. The entire point of choosing "second collection" over "generalize the first one" is that this section can be "copy the existing tests, change the collection name" instead of original research.

## 5. Family manager / co-manager / child invite authority and claim behavior

Reuses the existing invite-and-claim mechanism verbatim, in a family-scoped form:

- **Family creation**: an authenticated adult creates `contexts/{id}` with `type: 'family'`, `ownerUids: [creatorUid]` — same shape as a schoolless teacher-created classroom today (which already supports exactly this: an owner with no school, full rights, per `firestore.rules`' existing comment on that case).
- **Co-manager invite**: add a uid to `ownerUids` — `ClassroomContext.ownerUids` is already `string[]`, already supports multiple owners (mirrors how a schoolless classroom's sole owner already works; a co-manager is simply a second entry). Needs a `pendingFamilyManagerInvites/{email}` doc + claim function, structurally identical to `PendingInvite`/`claimPendingInviteIfAny`.
- **Child link**: a `pendingFamilyMemberLinks/{email}` doc + claim function, structurally identical to `PendingStudentLink`/`claimPendingStudentLinkIfAny`/`isValidStudentLinkClaim` — same one-time, staff-cannot-be-spoofed, `linkedUid`-can-only-move-null-to-non-null-or-back-to-null-by-a-manager invariant.
- **What's genuinely new, not a copy**: the *authority* question — who is allowed to create a `pendingFamilyMemberLinks` entry for a specific child. For a classroom, "authority" is institutional (a school employed the teacher). For a family, there is no institutional backstop — the design must decide whether family creation requires the creating adult to assert something (e.g., "I am this child's parent/guardian") and what, if anything, verifies that assertion. **This is flagged in §7 as a policy decision, not resolved here.**

## 6. School/family boundary tests

Because the two collections share no code path, the test surface is: (a) a family-scoped rules test suite proving a family manager's read/write against `familyMembers`/family-typed `contexts` never succeeds against a `students`/classroom-typed `contexts` document and vice versa (direct rule tests, mirroring the existing 43-test suite's shape), and (b) an application-level test proving the family repository's Firestore calls never reference `students` or a classroom-typed `contexts` path, and the classroom repository's calls never reference `familyMembers` — a straightforward assertion against the fake/real repository implementations, not a runtime guard, matching how the rest of this codebase separates concerns by construction rather than by check.

## 7. Data export, correction, deletion, retention, and under-13 authorization — a configurable policy surface, not a hard-coded answer

**Revised per user direction (2026-08-21): one size does not fit all across schools, jurisdictions, and independent families — this section does not pick a single policy, it defines a configuration mechanism that lets whoever operates a given deployment (and, per-population, each school) set their own answers. Nothing here bakes in a legal interpretation; the code enforces whatever is configured and fails closed when nothing is.**

01_EXPERIENCE_FOUNDATIONS.md, 02, 03, and 04 collectively have no COPPA/under-13/parental-consent section at all — the handoff doc's Slice 5 bullet list is the first and only place these words appear in the whole design package. Rather than this document originating one policy answer (which would still just be my interpretation, not a legal one, and would be wrong for at least some schools/jurisdictions even if right for others), it defines a **named policy profile** model:

```ts
// New top-level collection, admin-authored, not user-created.
interface FamilyPolicyProfile {
  id: string;
  label: string;                 // e.g. "United States default", "Requires explicit guardian consent"
  jurisdictionNote?: string;     // free-text, admin-authored context — never a legal claim the app itself asserts
  enabled: boolean;              // may this profile be used for NEW family creation right now
  isPlatformDefault: boolean;    // at most one profile may be true; used when no school-level override applies
  consentRequired: boolean;      // the creating adult must affirmatively acknowledge consentStatement before a family context is created
  consentStatement: string;      // admin-authored text shown at creation time when consentRequired
  retentionDays: number | null;  // null = no automatic deletion
  createdByUid: string;
  updatedByUid: string;
  updatedAt: Date;
}
```

**Who authors profiles**: a small, explicitly-trusted set of platform operators — not every school admin, since a profile's `consentStatement`/`jurisdictionNote` is meant to reflect an actual policy determination, not something authored per-school ad hoc. Gated on a Firebase Auth custom claim (`request.auth.token.platformAdmin == true`), set only via the Admin SDK by whoever operates this deployment — the same kind of narrow, deliberately-manual trust boundary this codebase already uses for school-founder bootstrap, just one level up. No self-serve "become a platform admin" flow exists or should exist.

**Who selects a profile for a given population — this is the "one size doesn't fit all" answer**:
- A school can set `schools/{schoolId}.familyModeEnabled: boolean` (absent/false = disabled — fails closed, matching every other flag in this codebase) and, if enabled, `schools/{schoolId}.familyPolicyProfileId: string` pinning which profile applies to families connected to that school's population. This is a **policy pointer only** — it never creates a data link between the school and any family context; the Hard Stop (no family record may share the school's classroom fields/balance) is unaffected. An existing school super_admin manages this — no new role needed for this half.
- An independent family (the default case — family mode never requires a school affiliation) resolves a profile by: the platform-default profile (`isPlatformDefault: true`) if the creating adult isn't approaching family creation through any school context, or — if more than one `enabled` profile exists — a picker at creation time (e.g., by region), so families in different jurisdictions aren't forced through identical consent language.
- **Fail-closed**: if no profile resolves (none configured, or the resolved one has `enabled: false`), family creation is blocked outright, both in rules and in the UI. This mirrors every other default-off surface in this codebase (feature flags, grade-band presentation) rather than assuming permissive behavior is safe by default.

Mechanism this design commits to regardless of any profile's specific values:
- A `familyMembers`/`contexts` (family-typed) document set is fully separable and fully deletable as a unit — deleting a family context and its members' subcollections doesn't touch any classroom data, by the same structural separation as §1.
- An export path is a straightforward "dump this family context's documents to JSON" admin-callable function, same shape as any other export tooling.
- `retentionDays` (per-profile, not global) drives a scheduled cleanup function computing `retentionExpiresAt` per family context at creation/last-activity time.

**What this design still does not decide, on purpose**: the actual *content* of any profile — whether COPPA or an equivalent applies, what specific consent language satisfies it, what retention duration is appropriate, which jurisdictions need their own profile at all. Those stay real policy determinations made by whoever authors a `FamilyPolicyProfile`, informed by their own counsel — the engineering commitment here is only that the *mechanism* exists, defaults to fully disabled, and enforces whatever gets configured.

## 8. Conflict behavior when school and family link the same auth identity

No conflict at the data layer: a `uid` can appear as `linkedUid` on a `students/{a}` doc and a `familyMembers/{b}` doc simultaneously, because they're unrelated documents in unrelated collections — this is the direct payoff of the §1 design choice. At the UI layer, this is exactly the dual-role pattern Slice 1 already built (`useIsLinkedStudent`, the account-menu "My student view" switcher): the context switcher gains a "My family view" entry alongside "My student view," and — per 01_EXPERIENCE_FOUNDATIONS.md §2.1 — "authorization is additive, but the interface must not merge contexts or silently elevate access." No new switching logic is needed beyond adding a third possible destination to the pattern that already exists.

## 9. What Slice 5's implementation steps look like once this is approved

In order, each gated on the previous:
1. Add `familyMembers` collection + `contexts`(family-typed) rules and their list-query regression tests — no UI yet. This is the part TECHNICAL_REQUIREMENTS.md §2.5's "will need to be re-solved, not just re-applied" is about, and it's now reduced to "copy an existing, passing test and change the collection name," per §4 above.
2. `FamilyPolicyProfile` collection + rules (platform-admin-authored, custom-claim-gated) + `schools/{id}.familyModeEnabled`/`familyPolicyProfileId` fields, per §7. Family context creation's rule requires a resolved, `enabled` profile — fails closed with zero profiles configured, exactly as it will be immediately after this step ships (nothing becomes creatable in production just because this step lands).
3. `packages/shared` types (`FamilyMember`, `FamilyPolicyProfile`, family-scoped transaction/goal reuse) + hand-mirrored Dart models + fake repositories on both platforms, per 05_IMPLEMENTATION_HANDOFF.md §2's "shared data changes require TS+Dart+serializers+fakes+rules+rule tests+docs in the same logical slice."
4. Family creation/invite/claim flows (§5 above), including the profile-resolution + consent-acknowledgment step from §7 — behind the flag, real writes, but the flag stays off in production until whoever operates this deployment has actually populated at least one profile (and, per school, decided `familyModeEnabled`).
5. `W/M-FAMILY-01/02` UI, reusing `W-CLASS-03`/goal/transaction primitives with family language, per the existing screen specs.
6. Context-switcher "My family view" entry (§8).
7. A minimal platform-admin screen for authoring `FamilyPolicyProfile` documents and a school-admin control for `familyModeEnabled`/`familyPolicyProfileId` — without this, step 2's mechanism has no UI to populate it through, only direct Firestore writes.
8. Family-specific child-safety content review (no allowance/chores/bank/real-purchase language, per the UC-FAM-02 acceptance criteria) and accessibility pass.
7. Only after §7's policy questions are answered: flip `familyContexts` on in production.

## 10. Explicit non-goals of this design

- Does not migrate or touch any existing classroom data.
- Does not implement district mode (Slice 6) or any cross-family aggregation.
- Does not decide the COPPA/consent/retention policy questions in §7 — those block production enablement (step 7 above), not the engineering work in steps 1–6.
- Does not change `students`, its rules, its indexes, or any classroom screen.
