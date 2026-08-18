# Sprout Streak - Technical Requirements & Implementation Status

> **Refreshed 2026-08-18** against actual repo state (code, tests, live deployment) — the previous version (1.3, written 2026-08-16) described a fresh scaffold and was badly stale within two days as Phase 1 and much of Phase 2 landed. The status column in every table below is the source of truth on what's actually built — do not assume a described requirement is implemented, or unimplemented, unless its row says so.

**Version**: 2.0
**Last Updated**: August 18, 2026
**Status**: Phase 1 MVP complete and live; Phase 2 partially complete
**Project Owner**: Mark Nelson

---

## Executive Summary

Sprout Streak is a React (web) + Flutter (mobile) app on a Firebase backend, structured as a monorepo (`packages/web`, `packages/mobile`, `packages/shared`, `packages/firebase-utils`, plus a private companion repo `sprout-functions`). The repository, three Firebase environments, CI/CD, and the authentication layer (extracted from the org's shared `game-shell` package, with its ads/consent/IAP layers deliberately excluded — see [[modulo_squares_auth_design]]) are built and tested.

The product itself is now real and live at `nelsongrey-sprout-dev.web.app`: a school/classroom hierarchy (super_admin/admin/teacher roles with scoped and delegated access), classroom and student roster management, earn/spend transaction recording with a ledger/history view, a read-only student self-service balance view (own real account, linked via invite-and-claim — no separate student login system), CSV bulk import, and multi-select bulk operations (archive, promote, move-to-classroom) on web. Mobile has feature parity on everything except bulk operations and CSV import, which are web-only so far.

**Project Status**: 🟢 **PHASE 1 MVP COMPLETE — PHASE 2 PARTIALLY COMPLETE**

Still open: offline/reliability hardening (§2.2), an accessibility pass (§2.4), the compliance program — privacy policy, DPA, district-facing statement (§7.3), interest/compound-growth mechanics (§2.5), and true multi-context (classroom **and** family, simultaneously) student identity (§2.5, §3.2) — the schema has a `contexts` map field reserved for this, but every write path today only ever populates one classroom context, and the live Firestore rules architecture (§3.2, "Firestore list-query authorization constraint") is scoped to that single-context case.

---

## 1. Architecture Overview

### 1.1 Technology Stack

| Component | Technology | Version | Status |
|---|---|---|---|
| **Web Frontend** | React + Vite | React 19 | ✅ Real app — routing, 8 feature areas, 14 test files/94 tests |
| **Mobile Frontend** | Flutter | 3.44.2 | ✅ Real app — go_router, feature parity with web except bulk ops/CSV import |
| **Backend** | Firebase Functions (consolidated `api` function) | Node 22 | 🔴 Still repo-only — real code lives in the private `sprout-functions` repo, not available here; no business logic exists client-side that depends on it |
| **Database** | Cloud Firestore | — | ✅ Implemented — see §3.2 for the live schema and a documented Firestore list-query authorization constraint discovered and fixed 2026-08-18 |
| **Auth** | Firebase Auth (Google + Apple + email/password) | — | ✅ Complete and live; email/password confirmed working against the real `nelsongrey-sprout-dev` project. Apple still needs Developer-portal config (owner action) |
| **State Management (mobile)** | `provider` | 6.1.2 | ✅ In real use throughout `lib/features` |
| **Routing (mobile)** | `go_router` | 16.2.4 | ✅ 5 registered routes, 2 more reached via internal dispatch (see §1.3) |

### 1.2 Platform Support

| Platform | Status | Minimum Version |
|---|---|---|
| **iOS** | 🟢 Real Firebase config for `dev` only (staging/prod not wired); confirmed booting to login | 16.0+ (`cloud_firestore`'s iOS plugin requires 15.0+) |
| **Android** | 🟢 Real Firebase config for `dev` only; confirmed booting to login | API 21+ (Flutter default; revisit) |
| **Web** | 🟢 Deployed and functionally live at `nelsongrey-sprout-dev.web.app` — real product, not a placeholder | Modern browsers |

Neither `google-services.json` nor `GoogleService-Info.plist` is present in the repo (gitignored, not committed) — mobile builds against real config require generating these locally via `flutterfire configure` or the Firebase console.

### 1.3 Project Structure (as built)
```
sprout/
├── packages/
│   ├── web/                          # React 19 + Vite — real app
│   │   └── src/
│   │       ├── components/ui/         # shared Button/Input/ConfirmDialog/PageHeader/IconButton (cva-based)
│   │       ├── components/layout/     # Layout, Header, Footer, ThemeToggle
│   │       ├── features/
│   │       │   ├── auth/              # LoginPage — Google/Apple/email sign-in+up, password reset
│   │       │   ├── classroom/         # ClassroomsPage, ClassroomDetailPage, StudentLedgerPage, LandingRouter
│   │       │   ├── school/            # CreateSchoolPage (NCES lookup), SchoolAdminPage, SchoolPage
│   │       │   ├── student/           # MyBalancePage — student self-service
│   │       │   └── students/          # StudentsPage, StudentImportPage (CSV), Promote/ArchiveStudentsPage
│   │       └── lib/                   # firestore.ts, school.ts, ncesLookup.ts
│   ├── mobile/                       # Flutter app
│   │   └── lib/
│   │       ├── core/
│   │       │   ├── config/firebase_options.dart      # real config for 'dev'; staging/prod/web still throw
│   │       │   └── services/{auth,classroom,school}/  # real repositories + Fake test doubles
│   │       ├── features/{auth,classroom,school,student}/  # screens mirroring web's feature set
│   │       └── widgets/                                # SproutAppBar, confirm_delete_dialog (minimal shared set)
│   ├── shared/                 # TS domain types (Student, ClassroomContext, School, etc.) — hand-kept in sync with Dart models
│   ├── firebase-utils/         # Client/Admin SDK wrapper helpers, ported from wishlist-wizard
│   └── functions/              # gitignored — real code lives in NelsonGrey/sprout-functions (private)
├── firestore.rules             # ~490 lines — full security model, see §3.2/§3.2a
├── firestore.rules.test.ts     # 43 tests across 4 describe blocks
├── firestore.indexes.json      # 5 composite indexes
├── firebase.json / firebase.{dev,staging,prod}.json
└── .firebaserc                 # nelsongrey-sprout-{dev,staging,prod}
```

---

## 2. Core Features & Implementation Status

This table maps directly to the Business Requirements (`BR-*` IDs) in [BUSINESS_REQUIREMENTS.md](BUSINESS_REQUIREMENTS.md) §1.3–1.4.

### 2.1 Authentication ✅ COMPLETE (Google + email/password live) / 🟡 Apple pending provider config
| Feature | Status | Implementation |
|---|---|---|
| Google Sign-In (Android + web) | ✅ Complete | `packages/mobile/lib/features/auth/login_screen.dart`; `packages/web/src/features/auth/LoginPage.tsx` |
| Email/Password (mobile + web) | ✅ Complete and live | Confirmed working against the real `nelsongrey-sprout-dev` project's Auth this session (sign-in, password reset via `sendPasswordResetEmail`). Mobile: `login_screen.dart` (sign in/up toggle, confirm-password, show/hide). Web: `LoginPage.tsx`, same UX |
| Apple Sign-In (iOS/macOS native SDK; web via `signInWithPopup(new OAuthProvider('apple.com'))`) | 🟡 Code complete, needs external config | **Blocked** until Apple's provider is enabled per-environment in the Firebase console, which requires a Sign in with Apple Services ID + key from the Apple Developer portal (owner action) |
| Fake auth for tests | ✅ Complete | `fake_auth_service.dart` (mobile) |
| Login screen (platform-gated OS buttons + email/password, error handling) | ✅ Complete | `login_screen.dart` (mobile); `LoginPage.tsx` (web, 17 tests) |
| Auth-gated routing | ✅ Complete | `main.dart` via `go_router` redirect; web via `App.tsx`'s `onAuthStateChanged` |

**Future work — school/district SSO**: still explicitly out of scope. SAML/OIDC-based SSO for school district identity providers remains a separate future effort.

### 2.2 Reliability Requirements (BR-1.3.1, BR-1.3.2) 🔴 NOT STARTED
| Requirement | Status | Notes |
|---|---|---|
| Session survives WiFi↔cellular transitions without crash/data loss | 🔴 Not started, not tested | No explicit handling exists; relies entirely on Firebase SDK defaults, unverified under real network conditions |
| No forced re-authentication between transactions | 🔴 Not verified | Firebase Auth's default token refresh should avoid this by construction, but no integration test confirms it |
| Offline queueing for transactions | 🔴 Not started | Confirmed via repo-wide grep: no explicit Firestore offline-persistence configuration exists anywhere (web: `getFirestore()` called with no cache config in `packages/firebase-utils/src/client.ts`; mobile: no `Settings(persistenceEnabled:...)` anywhere in `packages/mobile/lib`). Mobile gets `cloud_firestore`'s platform default (persistence on) unconfigured; web gets the JS SDK's in-memory default. Neither is deliberately configured or tested |

### 2.3 Student-Facing Balance & History (BR-1.3.3, BR-1.4.1) ✅ COMPLETE
| Requirement | Status | Implementation |
|---|---|---|
| Student can view own balance in-app | ✅ Complete | `packages/web/src/features/student/MyBalancePage.tsx`; `packages/mobile/lib/features/student/my_balance_screen.dart` — read-only, no earn/spend controls |
| Student can view transaction history | ✅ Complete | Same pages — full ledger, not just current balance |
| Native mobile experience for the student role | ✅ Complete | `my_balance_screen.dart`, routed automatically for a linked student with no staff access via `LandingScreen` |
| Own-account linking mechanism | ✅ Complete | Not a separate student login system — a student signs in with their own real Google/Apple/email account (see §7.2), which staff link to the roster record via `pendingStudentLinks/{email}` + first-claim-wins verified-email matching (`isValidStudentLinkClaim` in `firestore.rules`). Web: `linkStudentAccount`/`claimPendingStudentLinkIfAny`/`unlinkStudentAccount` in `packages/web/src/lib/firestore.ts`. Mobile: parallel implementation in `firestore_classroom_repository.dart` |

### 2.4 Accessibility (BR-1.3.4, BR-1.4.4) 🔴 NOT STARTED (minimal ad hoc coverage only)
| Requirement | Status | Notes |
|---|---|---|
| VoiceOver (iOS) / TalkBack (Android) support on core flows | 🔴 Not started, not tested | No systematic pass has happened |
| Screen-reader labeling on web | 🟡 Minimal, incidental | Only 4 `aria-` attributes exist repo-wide (`Header.tsx:34` account menu, `icon-button.tsx:9` forwards a `label` prop to every icon-only button used across the app, `LoginPage.tsx:210` error `role="alert"`, `StudentsPage.tsx:276` bulk-select checkboxes) — not the result of a deliberate audit |
| Public accessibility statement | 🔴 Not started | |

### 2.5 Financial-Literacy Data Model (BR-1.4.2, BR-1.4.3) 🟡 PARTIALLY COMPLETE
| Requirement | Status | Notes |
|---|---|---|
| Classroom context (teacher-managed) | ✅ Complete | Every classroom write path today (`createClassroom` web/mobile) hardcodes `type: 'classroom'` |
| Family context (parent-managed) | 🔴 Not started | `ContextType = 'classroom' \| 'family'` exists in the shared type and is mentioned in code comments/copy as aspirational ("classroom or family account"), but no family-creation flow, family-context UI, or write path exists on either platform — grep-confirmed zero real usage beyond the type declaration |
| A single student identity usable in both contexts, potentially simultaneously | 🟡 Schema-ready, not active | `Student.contexts: Record<contextId, {...}>` is a write-only map populated on every student create/move, specifically reserved for this — but nothing reads it yet. The field Firestore queries and security rules actually authorize against today is `Student.contextId` (scalar, single-context) — see the architecture note below. Real multi-context support needs a second design pass on top of `contexts` when family context is built |
| Interest/compound-growth on savings, available at free tier | 🔴 Not started | No `settings`/`interestRateBps`-equivalent field exists anywhere in the shared types or Firestore schema |

**Firestore list-query authorization constraint (discovered and fixed 2026-08-18)**: Firestore denies an entire list query if its security rule's authorization decision depends on any field the query itself doesn't filter on — including a document's own ID/path when it varies across the scanned set — even for a caller who would legitimately pass, and even for a null-safe field read. This is why `Student.contextId` is a scalar, not the `contexts` array/map it started as: a `get()` on a *foreign* document (the classroom, keyed by the query's own filtered field) is the sanctioned workaround, but a `get()`-path built by *indexing into* an array field does not work under any variant tested. See `firestore.rules`' `isReadableClassroom` and `firestore.rules.test.ts`'s list-query regression tests for the full reasoning and four confirmed failure/success cases. This constraint will need to be re-solved, not just re-applied, when true multi-context (`contexts` map) support is built.

### 2.6 Growth/Compliance (BR-1.3.7, BR-1.3.8) 🟡 PARTIALLY COMPLETE
| Requirement | Status | Notes |
|---|---|---|
| Parent/co-teacher invite flow | ✅ Complete | `pendingInvites`/`claimPendingInviteIfAny` (staff onboarding, §2.7) plus classroom-to-colleague delegation via `accessRequests` (a classroom owner requests a colleague get `award`/`manage` access; an admin approves/declines) — both platforms, `school.ts`/`school_admin_screen.dart` + `ClassroomDetailPage.tsx`/`classroom_detail_screen.dart` |
| COPPA/FERPA-appropriate data handling — design rationale | ✅ Resolved | Students sign in with their own real account (same providers as staff); this is linked, not separately provisioned, and access is strictly read-only/self-scoped (§2.3, §7.2) — the school-official-consent pattern COPPA's exception covers |
| COPPA/FERPA-appropriate data handling — compliance program | 🔴 Not started | Privacy policy, DPA, district-facing compliance statement — see §7.3 |

### 2.7 Bulk Operations & Role Granularity (BR-1.3.9–1.3.12) ✅ COMPLETE on web / 🔴 not started on mobile
| Requirement | Status | Notes |
|---|---|---|
| School security matrix: three-tier hierarchy, teacher scope grants, NCES school lookup | ✅ Complete | `schools/{schoolId}` + `schools/{schoolId}/members/{uid}`, `firestore.rules` enforcement, 43 rules tests (up from 33 as of this doc's previous version — new tests cover list-query regressions, see §3.2). Mobile and web at parity |
| Hierarchical delegation; school never left without a super_admin | ✅ Complete | Unchanged since last review |
| Scoped specialist role (cross-class/school-wide visibility and CRUD) | ✅ Complete | Unchanged since last review |
| Teacher assignable to multiple classes/sections | ✅ Complete | `contexts/{contextId}.ownerUids` array |
| Staff onboarding for people without an account yet | ✅ Complete | Invite-and-claim, unchanged |
| Emulator-seeded test accounts covering every role/scope | ✅ Complete | See §9.3 |
| Multi-select students + bulk move to another class/teacher | ✅ Complete (web only) | `StudentsPage.tsx` (multi-select + bulk move/archive/delete/restore), `PromoteStudentsPage.tsx`/`ArchiveStudentsPage.tsx` (per-classroom grade-rollover flows). Chunked batched writes (400 ids/batch). **Mobile has no equivalent** — no multi-select, checkbox list, or bulk-action UI exists anywhere in `packages/mobile/lib` |
| Mass transaction against an entire class or multi-select | 🔴 Not started | Distinct from the bulk *roster* operations above — recording earn/spend against many students at once isn't built on either platform |
| CSV/spreadsheet bulk import for students | ✅ Complete (web only) | `StudentImportPage.tsx` — `papaparse`-based preview (new/update/error per row) + chunked commit (400 rows/batch) via `commitStudentImport`. No mobile equivalent |
| Student ID barcode scanning for independent balance visibility | 🔴 Not started, future consideration | Unchanged — needs its own design pass (kiosk-mode security model) |

### 2.8 CI/CD & Infrastructure ✅ COMPLETE
| Feature | Status |
|---|---|
| GitHub repos (`sprout` public, `sprout-functions` private), `develop`/`staging`/`main` branch model | ✅ Complete |
| Firebase project trio (`nelsongrey-sprout-dev/staging/prod`) | ✅ `dev` fully functional and in active use (real Auth users, real Firestore data, deployed hosting); staging/prod created but Auth providers/IAM/billing setup still pending (owner action) |
| GitHub Actions (`master-pipeline.yml`, hosting deploys per branch, CodeQL, secret scanning) | ✅ Complete. `codeql.yml` runs on push/PR to develop/staging/main plus a weekly schedule; `secret-scan.yml` runs on push/PR to the same three branches |
| Functions companion-repo checkout (`FUNCTIONS_REPO_PAT`) | ✅ Workflow wired; secret not yet set |

---

## 3. Technical Implementation

### 3.1 Auth Architecture (as built)
Unchanged since last review: `AuthService` (abstract interface) → `FirebaseAuthService` (real) / `FakeAuthService` (test double), extracted from `game-shell`'s `src/auth/`.

### 3.2 Firestore Data Model (implemented)

The live schema, reflecting what's actually deployed to `nelsongrey-sprout-dev` as of this document's refresh:

```
users/{uid}
  └── schoolIds: [schoolId, ...]        # denormalized so the app knows which school(s) to offer

schools/{schoolId}
  ├── name, founderUid, superAdminCount, nces?, createdAt

schools/{schoolId}/members/{uid}
  ├── role: 'super_admin' | 'admin' | 'teacher'
  ├── scope: { type: 'own' | 'grades' | 'school', grades?: string[] }
  ├── classroomGrants?: { [contextId]: 'award' | 'manage' }   # per-classroom delegation
  ├── displayName, email, addedByUid, createdAt

pendingInvites/{lowercasedEmail}        # staff onboarding, claimed on first matching sign-in
pendingStudentLinks/{lowercasedEmail}   # student self-service onboarding, same claim pattern

contexts/{contextId}                    # a classroom (family unit not yet built — see §2.5)
  ├── type: 'classroom'                 # 'family' exists in the type but is never written
  ├── name, ownerUids: [uid, ...]
  ├── schoolId?, gradeLevel?            # optional — absent for standalone (non-school) classrooms

contexts/{contextId}/transactions/{transactionId}
  ├── studentId, type: 'earn' | 'spend', amountCents, reason, createdByUid, createdAt
  ├── ownerUids, schoolId?, gradeLevel? # denormalized from the parent context at write time

students/{studentId}                    # top-level, not nested — so a student can belong to
  │                                       more than one context later (family continuity) without
  │                                       restructuring, see the contexts field below
  ├── firstName, lastName, displayName  # displayName recomputed at write time
  ├── studentId?                        # plain admin/CSV school-district ID, distinct from doc id
  ├── balanceCents
  ├── contextId                         # scalar — the query/rule source of truth today (§2.5)
  ├── contexts: { [contextId]: { type, role: 'member' } }  # write-only, reserved for multi-context
  ├── ownerUids, schoolId?, gradeLevel?, contextName?       # denormalized from the owning classroom
  ├── linkedUid?                        # set once a real student account claims this record
  └── archivedAt?                       # soft-delete for grade rollover, not a hard delete

accessRequests/{requestId}              # classroom owner proposes a colleague get delegated access;
                                           only an admin can actually approve it
```

**Security rule shape** (implemented in `firestore.rules`, ~490 lines): a student can only read their own `students/{studentId}` document and its transactions (`isLinkedStudentSelf`); a context owner can read/write everything scoped to `contexts/{contextId}` where their uid is in `ownerUids`; school-scoped staff get `award`- or `manage`-level access per their `scope`/`classroomGrants` (§3.2a). No cross-context reads without an explicit grant.

See §2.5 above for the Firestore list-query authorization constraint this schema's `contextId` field exists to work around, and `firestore.rules`' `isReadableClassroom` helper / `firestore.rules.test.ts`'s list-query regression tests for the full technical detail.

### 3.2a School Security Matrix (implemented, BR-1.3.11/1.3.12)

Unchanged in design since the previous version of this document — see the schema above for the current field shapes (`classroomGrants` added since). Summary:

**Delegation is hierarchical, three tiers**: only a `super_admin` can create/remove another `super_admin` or an `admin` (`isSuperAdmin`); any admin can freely manage `teacher` membership and scope (`isAtLeastAdmin`). A school is never left without at least one `super_admin` (`superAdminCount` invariant, trusted/maintained by paired batch writes — a stated limitation, not an oversight). Bootstrapping the first `super_admin` uses a one-time `founderUid` check (`isFoundingSuperAdmin`).

**Award-only vs. full manage**: `hasAwardAccess()`/`hasManageAccess()` split what scoped/delegated access grants. Grade/whole-school scope only ever grants award-level access (read + record transactions); full manage stays with the owner, an admin, or an explicit `manage`-level `classroomGrants` entry — set only by an admin approving an `accessRequests/{id}` doc. A classroom owner can *propose* a colleague get access to specifically their classroom (via the UI described in §2.6); only an admin can actually grant it.

**Why invite-and-claim instead of real account provisioning**: unchanged — Cloud Functions live in the private `sprout-functions` repo, not available here.

**UI**: `packages/web/src/features/school/` and `packages/mobile/lib/features/school/school_admin_screen.dart` have staff CRUD at parity, plus the access-request delegation UI on both platforms' classroom detail screens (§2.6).

### 3.3 Offline & Reliability Requirements (technical detail for §2.2)
Still not implemented — see §2.2 for current status. The plan (enable Firestore offline persistence, verify no forced re-auth under a real network-drop test) is unchanged from the previous version of this document.

---

## 4. Platform-Specific Implementation Notes (as built)

### 4.1 iOS
Unchanged since last review: bundle ID `com.sproutstreak.app.ios`, `Runner.entitlements` wired for Sign in with Apple, `Info.plist`'s `CFBundleURLTypes` still has the placeholder `REPLACE_WITH_REVERSED_CLIENT_ID` (no `GoogleService-Info.plist` exists locally yet — see §1.2).

### 4.2 Android
Unchanged: `applicationId` `com.sproutstreak.app.android`, Google Services Gradle plugin file-exists-guarded, no `AD_ID` permission.

### 4.3 Web
No longer a bare scaffold — a real, multi-feature React app. See §1.3 for the directory layout and §2 for the full feature inventory. `packages/web/src/index.css` currently carries **two** competing CSS-variable color palettes ("path"/default and "balance") behind a live `ThemeToggle`, explicitly marked in-code as "temporary comparison scaffolding, not a permanent multi-theme system" (`index.css:3-7`, `ThemeToggle.tsx:15-19`) — a final palette decision is still pending; source comps exist at `assets/brand-concepts/` (three concepts on disk, only two wired in).

---

## 5. CI/CD & DevOps ✅ COMPLETE

| Workflow | Trigger | Status |
|---|---|---|
| `master-pipeline.yml` | PR → develop/staging/main; push → staging/main | ✅ Wired, now deploying a real product |
| `firebase-hosting-{dev,staging,merge}.yml` | Push to matching branch | ✅ Wired |
| `firebase-deploy-local.yml` (reusable) | Called from pipeline | ✅ Wired; GCP Workload Identity Federation not yet configured (placeholder TODO in workflow) |
| `codeql.yml`, `secret-scan.yml` | Push/PR + schedule | ✅ Wired |

**Still deliberately not added**: `ios-mobile-release.yml`, `manage-asc-subscriptions.yml`, `e2e-tests.yml`, `release-readiness-gate.yml`.

---

## 6. Quality Assurance

### 6.1 Testing Coverage (as built)
| Test Type | Coverage | Status |
|---|---|---|
| Web tests | 14 test files, 94 tests — auth, every feature page, `firestore.ts` | ✅ Passing |
| Mobile widget tests | 8 test files, 47 tests — auth, classroom, school, student features | ✅ Passing |
| Mobile `flutter analyze` | Whole `lib/` | ✅ 0 errors/warnings — 36 pre-existing `info`-level lints, all `deprecated_member_use` on `RadioListTile` (Flutter 3.32+ deprecation), concentrated in `school_admin_screen.dart` |
| Firestore security rules tests | `firestore.rules.test.ts`, 43 tests across 4 describe blocks | ✅ Passing — includes list-query regression tests (§2.5, §3.2) added 2026-08-18, closing a gap where the suite previously only ever exercised single-document get/set/update/delete and couldn't catch that bug class |
| Functions tests | None yet (repo not even scaffolded with logic here) | 🔴 Not started |

### 6.2 Known Testing Gotcha (documented for future contributors)
Unchanged since last review — see `packages/mobile/test/features/auth/login_screen_test.dart`'s git history: a widget test that manually creates a raw `StreamSubscription` on `AuthService.authStateChanges()` outside the widget tree caused a reproducible 10-minute hang. Asserting against `authService.currentUser` directly avoids it.

### 6.3 Known Testing Gap (new)
The rules test suite (§6.1) originally only ever exercised single-document Firestore operations (`get`/`set`/`update`/`delete`) — structurally incapable of catching the list-query authorization constraint described in §2.5, which only manifests on a real `query()` + `getDocs()`/`onSnapshot()`. This was the root cause of a production incident (classroom rosters showing empty for every caller) that shipped undetected. New tests specifically exercising list queries were added for every collection affected (`students`, `contexts/{id}/transactions`, `accessRequests`, `schools/{id}/members`) as part of the 2026-08-18 fix — any *new* Firestore list query added to the app should get an equivalent test, not just a single-document one.

---

## 7. Security & Compliance

### 7.1 Authentication & Authorization ✅ COMPLETE (auth layer)
Firebase Authentication — Google, Apple (pending provider config), and email/password (§2.1). No anonymous guest mode. No ads SDK, no IAP, no consent-management SDK.

### 7.2 Data Security ✅ Rules implemented / 🟡 no independent security review yet
- Firestore security rules: **implemented**, ~490 lines, 43 passing tests (§3.2, §6.1) — the previous version of this document said "not written," which was already wrong when it was current (the rules existed by then) and is now badly wrong.
- No sensitive PII beyond what auth providers give (name, email). Students sign in with a real account, the same Google/Apple/email providers teachers use — most K-12 students already have a school-managed Google Workspace for Education account, and school-directed ed-tech use under those accounts is the pattern COPPA's school-official consent exception covers (district-level consent, not per-parent-per-app). A student's account is *linked* to their existing roster record via invite-and-claim (`pendingStudentLinks`/`claimPendingStudentLinkIfAny`), not provisioned separately — see §2.3/§3.2's `isLinkedStudentSelf`/`isValidStudentLinkClaim`. A linked student's access is strictly read-only and scoped to exactly their own balance/history — never the classroom roster, other students, or any admin tooling.
- No independent third-party security review or pen test has happened. The 2026-08-18 architecture fix (§2.5, §3.2) was found through live production symptoms, not a proactive audit — worth treating as a signal that a deliberate rules-review pass could be valuable before broader rollout.

### 7.3 Privacy Compliance 🔴 NOT STARTED (program) — HIGHER BAR THAN THE ORG'S OTHER APPS
| Regulation | Status | Notes |
|---|---|---|
| **COPPA** | 🟡 Design rationale resolved; program not started | No behavioral ads (structural). The consent-model *design* is resolved (§7.2); the actual privacy policy / parental-notice artifacts are not written |
| **FERPA** | 🔴 Not started | A data processing agreement / district-facing compliance statement is required before any school-facing marketing (BR §9) |
| **Accessibility (WCAG 2.1 AA-equivalent)** | 🔴 Not started (minimal incidental coverage, §2.4) | Still a release gate for v1.0 per BR-1.3.4/1.4.4, not yet scheduled |

This remains a meaningfully higher compliance bar than the org's other three apps carry — see [[feedback_no_live_users_yet]] (modulo-squares/vehicle-vitals/wishlist-wizard have zero public users and no institutional data-handling obligations yet); Sprout Streak's K-12/school-facing ambition means COPPA/FERPA readiness needs to land before the first real classroom signs up, not be retrofitted after.

---

## 8. Known Limitations & Roadmap

### 8.1 Current Limitations
- No offline/reliability hardening — no explicit Firestore persistence config, no network-transition testing, on either platform (§2.2).
- No accessibility audit — only incidental `aria-`/`role` coverage exists (§2.4).
- No compliance program artifacts (privacy policy, DPA, district statement) — the design-level COPPA rationale is resolved but nothing is published (§7.3).
- No interest/compound-growth mechanics — schema and UI both absent (§2.5).
- No family context — `type: 'family'` exists only as an unused enum value; every real write path is classroom-only (§2.5).
- Mobile has no bulk operations or CSV import — both are web-only (§2.7).
- Staging/prod Firebase environments exist but Auth providers/IAM/billing are still owner-action pending; only `dev` is fully functional.
- Apple Sign-In needs Apple Developer portal configuration before it can be enabled (§2.1).
- No independent security review of `firestore.rules` has happened (§7.2).
- The web app's visual theme is unresolved — two competing palettes still live behind a comparison toggle (§4.3).

### 8.2 Planned Work (maps to BRD §3.2 short-term objectives)

**Phase 1 — MVP (single classroom, core loop)**: ✅ largely complete.
- Firestore schema + security rules — ✅ done (§3.2)
- Earn/spend/save core transaction flow, both roles — ✅ done (§2.7, §3.2a)
- Student self-service balance/history — ✅ done (§2.3)
- Parent/co-teacher invite flow — ✅ done (§2.6)
- Reliability hardening: offline queueing, network-transition testing — 🔴 still open (§2.2)
- Accessibility pass on all core flows — 🔴 still open (§2.4)

**Phase 2 — Family/classroom continuity**: 🟡 partially complete.
- Bulk operations: multi-select + batched move/transact — ✅ done, web only (§2.7)
- CSV/spreadsheet bulk import — ✅ done, web only (§2.7)
- Secondary/multi-section teacher assignment — ✅ done (pre-existing, `ownerUids` array)
- Multi-context student identity (`contexts` map, family + classroom simultaneously) — 🔴 still open; schema field exists but unused, and the list-query authorization constraint (§2.5) needs a second design pass before it can be built safely
- Interest/compound-growth mechanics at the free tier — 🔴 still open
- Mobile parity for bulk ops/CSV import — 🔴 still open

**Phase 3 — Schoolwide/district**: unchanged, not started.
- SIS integration, centralized admin dashboard
- (Scoped specialist role is now done — moved to §2.7/§3.2a as of the previous version of this document; this item is stale and should probably be removed from Phase 3 in the next revision)

---

## 9. Dependencies & Environment

### 9.1 Key Flutter Dependencies (`packages/mobile/pubspec.yaml`)
Unchanged: `firebase_core: ^4.13.0`, `firebase_auth: ^6.5.7`, `cloud_firestore: ^6.8.0`, `cloud_functions: ^6.3.6`, `firebase_app_check: ^0.4.6`, `google_sign_in: ^7.2.0`, `sign_in_with_apple: ^8.1.0`, `crypto: ^3.0.7`, `go_router: ^16.2.4`, `provider: ^6.1.2`, `flutter_secure_storage: ^9.2.2`.

### 9.2 Firebase Projects
| Alias | Project ID | Status |
|---|---|---|
| development | `nelsongrey-sprout-dev` | ✅ Fully functional — real Auth users, live Firestore data, deployed hosting, in active use |
| staging | `nelsongrey-sprout-staging` | ✅ Created; Auth providers/IAM pending owner action |
| production | `nelsongrey-sprout-prod` | ✅ Created; Auth providers/IAM pending owner action |

### 9.3 Emulator Test Accounts (local only — never real credentials)

Run `npm run seed:emulator` once (regenerates `.emulator-seed/`, gitignored), then `npm run emulators` for every regular session. One school ("Test Elementary") covering every role/scope, password `sprouttest1` for all:

| Email | Role / scope |
|---|---|
| `super1@test.sprout` | Super admin (founder) |
| `admin1@test.sprout` | Admin (delegate) |
| `teacher.own@test.sprout` | Teacher, scope `own` — owns 3rd Grade |
| `teacher.grades@test.sprout` | Teacher, scope `grades` — [4, 5] |
| `teacher.school@test.sprout` | Teacher, scope `school` — whole-school specialist (PE/art/music case) |

The same five accounts exist in the real `nelsongrey-sprout-dev` project too (`scripts/seed-real-dev-accounts.mjs`, same password), for manual verification against the live deployment. No student account on either — students still don't have a dedicated seed identity; link one manually via the staff-facing "link student account" flow to test that path (§2.3).

---

## 10. Documentation

| Document | Location | Purpose |
|---|---|---|
| README.md | `/README.md` | Setup instructions |
| BUSINESS_REQUIREMENTS.md | `/docs/BUSINESS_REQUIREMENTS.md` | Business case, market/competitive analysis |
| This document | `/docs/TECHNICAL_REQUIREMENTS.md` | Technical requirements & implementation status |

---

## 11. Project Status Summary

| Category | Completion | Notes |
|---|---|---|
| Auth | 100% (Apple pending owner config) | Google + email/password real and live; Apple code-complete |
| Repo/CI/CD infra | 100% | Real, tested, actively deploying |
| Firebase projects | `dev` 100% functional; staging/prod created, provider setup pending | |
| Product data model | 100% implemented | Was "0% — proposed only" as of the previous version; now live with 43 passing rules tests |
| Product features — Phase 1 | ~85% | Core loop, self-service, invites all done; reliability + accessibility still open |
| Product features — Phase 2 | ~50% | Bulk ops/CSV import done (web); multi-context identity, interest mechanics, mobile parity still open |
| Compliance (COPPA/FERPA) | Design rationale resolved; program 0% | See §7.3 |
| Accessibility | Minimal incidental coverage only | See §2.4 |
| Testing | Strong across the board | Web: 94 tests/14 files. Mobile: 47 tests/8 files. Firestore rules: 43 tests |

**Status**: 🟢 **Phase 1 MVP live at `nelsongrey-sprout-dev.web.app`. Phase 2 partially complete. Next priorities for a v1.0-readiness pass: reliability/offline hardening, accessibility, and the compliance program — none of which are started.**

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Aug 16, 2026 | Mark Nelson | Initial TRD against the fresh scaffold |
| 1.1 | Aug 16, 2026 | Mark Nelson | Added §2.7 (bulk operations & role granularity) |
| 1.2 | Aug 16, 2026 | Mark Nelson | Shipped the school security matrix (§3.2a) |
| 1.3 | Aug 16, 2026 | Mark Nelson | Corrected hierarchy to three-tier super_admin/admin/teacher; expanded scoped access to full CRUD; added NCES lookup and emulator test accounts |
| 2.0 | Aug 18, 2026 | Mark Nelson (with Claude) | Full refresh against actual repo state, which had drifted far ahead of the doc in two days: marked Phase 1 MVP complete (student self-service, invite/delegation flow, security rules all live); marked CSV import and bulk roster operations complete (web); corrected test-coverage numbers across web/mobile/rules; documented the Firestore list-query authorization constraint found and fixed this session (root cause of a production incident where classroom rosters showed empty for every caller — see `firestore.rules`' `isReadableClassroom`); corrected the internal contradiction in §7.2 (rules were marked both "not written" and, two lines later, described as implemented); flagged mobile's lack of bulk-ops/CSV parity and family-context's schema-only status as open gaps |

---

**Next Review Date**: Upon reliability/accessibility/compliance work starting, or the next time this document is found to have drifted from reality — whichever comes first.
