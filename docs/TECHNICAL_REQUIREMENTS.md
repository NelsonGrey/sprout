# Sprout Streak - Technical Requirements & Implementation Status

> **Planning baseline (written 2026-08-16):** Unlike modulo-squares' TRD (which documents a shipped product), most of this document describes **planned** technical requirements against a fresh scaffold. The status column in every table below is the source of truth on what's actually built — do not assume a described requirement is implemented unless its row says so.

**Version**: 1.0
**Last Updated**: August 16, 2026
**Status**: Scaffold — Pre-MVP
**Project Owner**: Mark Nelson

---

## Executive Summary

Sprout Streak is a React (web) + Flutter (mobile) app on a Firebase backend, structured as a monorepo (`packages/web`, `packages/mobile`, `packages/shared`, `packages/firebase-utils`, plus a private companion repo `sprout-functions`). The repository, three Firebase environments, CI/CD, and the authentication layer (extracted from the org's shared `game-shell` package, with its ads/consent/IAP layers deliberately excluded — see [[modulo_squares_auth_design]]) are built and tested. The product itself — the earn/spend/save data model and every user-facing feature described in the [Business Requirements](BUSINESS_REQUIREMENTS.md) — is not yet built.

**Project Status**: 🟡 **SCAFFOLD COMPLETE — PRODUCT NOT STARTED**

---

## 1. Architecture Overview

### 1.1 Technology Stack

| Component | Technology | Version | Status |
|---|---|---|---|
| **Web Frontend** | React + Vite | React 19 | ✅ Scaffolded |
| **Mobile Frontend** | Flutter | 3.44.2 | ✅ Scaffolded |
| **Backend** | Firebase Functions (consolidated `api` function) | Node 22 | ✅ Scaffolded (repo only — no business logic yet) |
| **Database** | Cloud Firestore | — | 🔴 Not designed (see §3.2 for the proposed first-cut schema) |
| **Auth** | Firebase Auth (Google + Apple) | — | ✅ Complete, tested |
| **State Management (mobile)** | `provider` | 6.1.2 | ✅ Scaffolded |
| **Routing (mobile)** | `go_router` | 16.2.4 | ✅ Scaffolded |

### 1.2 Platform Support

| Platform | Status | Minimum Version |
|---|---|---|
| **iOS** | 🟢 Real Firebase config; confirmed booting to the login screen on an iPhone 17 Pro simulator | 16.0+ (raised from the 13.0 default — `cloud_firestore`'s iOS plugin requires 15.0+, matches wishlist-wizard's floor) |
| **Android** | 🟢 Real Firebase config; confirmed booting to the login screen on a Pixel 3a emulator | API 21+ (Flutter default; revisit) |
| **Web** | 🟢 Deployed and verified live at `nelsongrey-sprout-dev.web.app` | Modern browsers |

### 1.3 Project Structure (as built)
```
sprout/
├── packages/
│   ├── web/                    # React 19 + Vite, unconfigured beyond default scaffold
│   ├── mobile/                 # Flutter app
│   │   └── lib/
│   │       ├── core/
│   │       │   ├── config/firebase_options.dart      # placeholder, needs flutterfire configure
│   │       │   └── services/auth/                    # ✅ real, extracted from game-shell
│   │       └── features/
│   │           ├── auth/login_screen.dart             # ✅ real
│   │           └── home/home_screen.dart               # placeholder only
│   ├── shared/                 # TS types — empty barrel, no domain schema yet
│   ├── firebase-utils/         # Client/Admin SDK wrapper helpers — generic, ported from wishlist-wizard
│   └── functions/               # gitignored — real code lives in NelsonGrey/sprout-functions (private)
├── firebase.json / firebase.{dev,staging,prod}.json
└── .firebaserc                 # nelsongrey-sprout-{dev,staging,prod}
```

---

## 2. Core Features & Implementation Status

This table maps directly to the Business Requirements (`BR-*` IDs) in [BUSINESS_REQUIREMENTS.md](BUSINESS_REQUIREMENTS.md) §1.3–1.4. Every row not marked ✅ is planned work, not built.

### 2.1 Authentication ✅ COMPLETE (code) / 🟡 Apple + email/password pending provider config
| Feature | Status | Implementation |
|---|---|---|
| Google Sign-In (Android + web) | ✅ Complete | `packages/mobile/lib/core/services/auth/firebase_auth_service.dart`; `packages/web/src/features/auth/LoginPage.tsx` |
| Apple Sign-In (iOS/macOS via native SDK; web via `signInWithPopup(new OAuthProvider('apple.com'))`, no separate Apple JS SDK needed) | 🟡 Code complete, needs external config | Mobile: `firebase_auth_service.dart`. Web: `LoginPage.tsx` — **blocked** until Apple's provider is enabled for `nelsongrey-sprout-{dev,staging,prod}` in the Firebase console, which requires a Sign in with Apple Services ID + key from the Apple Developer portal with these domains registered as return URLs (owner action — no Firebase MCP tool exposes Auth provider config) |
| Email/Password (mobile + web) | 🟡 Code complete, needs provider enabled | Mobile: `AuthService.signInWithEmail`/`signUpWithEmail`/`sendPasswordResetEmail`, `FirebaseAuthService`/`FakeAuthService`, UI in `login_screen.dart` (sign in/up toggle, confirm-password field on sign-up, show/hide toggle on every password field). Web: `LoginPage.tsx`, same UX (`PasswordInput` component). **Blocked** on both until Email/Password is toggled on in the Firebase console's Authentication → Sign-in method for each environment (owner action) |
| Fake auth for tests | ✅ Complete | `fake_auth_service.dart` (mobile) |
| Login screen (platform-gated OS buttons + email/password, error handling) | ✅ Complete | `features/auth/login_screen.dart` (mobile, 9 tests); `LoginPage.tsx` (web, 17 tests) |
| Auth-gated routing | ✅ Complete | `main.dart` via `go_router` redirect; web via `App.tsx`'s `onAuthStateChanged` |

**Future work — school/district SSO**: explicitly out of scope for now ("crawl first," per product direction 2026-08-16). Google/Apple/email-password on web is the intentionally minimal first step; SAML/OIDC-based SSO for school district identity providers is a larger, separate effort (likely Firebase Auth's SAML/OIDC provider support plus a district-onboarding flow) to design once the core product has real usage.

### 2.2 Reliability Requirements (BR-1.3.1, BR-1.3.2) 🔴 NOT STARTED
| Requirement | Status | Notes |
|---|---|---|
| Session survives WiFi↔cellular transitions without crash/data loss | 🔴 Not started | This is ETM Machine's #1 unresolved complaint (crashes on cellular, 2021–2025). Needs explicit test coverage before v1.0, not just "should work" |
| No forced re-authentication between transactions | 🔴 Not started | ETM Machine forces logout after *every* entry. Firebase Auth's default token refresh already avoids this by construction, but must be verified under real network conditions, not assumed |
| Offline queueing for transactions | 🔴 Not started | Firestore's offline persistence should be enabled by default for the transaction-write path (see §3.3) |

### 2.3 Student-Facing Balance & History (BR-1.3.3, BR-1.4.1) 🔴 NOT STARTED
| Requirement | Status | Notes |
|---|---|---|
| Student can view own balance in-app | 🔴 Not started | ETM Machine never shipped this despite being requested since 2021 |
| Student can view transaction history | 🔴 Not started | |
| Native mobile experience for the student role (not just teacher/admin) | 🔴 Not started | ClassBank's gap — students are web-only there |

### 2.4 Accessibility (BR-1.3.4, BR-1.4.4) 🔴 NOT STARTED
| Requirement | Status | Notes |
|---|---|---|
| VoiceOver (iOS) / TalkBack (Android) support on core flows | 🔴 Not started | ETM Machine requested-and-never-shipped since 2021; see TRD §7 for the concrete technical bar |
| Public accessibility statement | 🔴 Not started | Neither ETM Machine nor (as far as could be determined) ClassBank publishes one — cheap differentiation |

### 2.5 Financial-Literacy Data Model (BR-1.4.2, BR-1.4.3) 🔴 NOT STARTED
| Requirement | Status | Notes |
|---|---|---|
| Interest/compound-growth on savings, available at free tier | 🔴 Not started | ClassBank gates this behind its $100/yr Pro tier; see §3.2 for the proposed schema |
| Classroom context (teacher-managed) | 🔴 Not started | |
| Family context (parent-managed) | 🔴 Not started | |
| A single student identity usable in both contexts | 🔴 Not started | This is the core differentiator vs. every competitor studied (§3.2 addresses the data-model implication directly) |

### 2.6 Growth/Compliance (BR-1.3.7, BR-1.3.8) 🔴 NOT STARTED
| Requirement | Status | Notes |
|---|---|---|
| Parent/co-teacher invite flow | 🔴 Not started | |
| COPPA/FERPA-appropriate data handling | 🔴 Not started | See §7 |

### 2.7 Bulk Operations & Role Granularity (BR-1.3.9–1.3.12) 🟢 Foundation complete (Phase 1) / 🔴 CSV bulk import not started (Phase 2)
| Requirement | Status | Notes |
|---|---|---|
| School security matrix: three-tier hierarchy (super_admin/admin/teacher), teacher scope grants (own/grades/whole-school), NCES school lookup | ✅ Complete | New `schools/{schoolId}` + `schools/{schoolId}/members/{uid}` collections, `firestore.rules` enforcement, 33 rules tests. Mobile: `SchoolRepository` + `features/school/school_admin_screen.dart` (staff CRUD, on par with web); web: `lib/school.ts` + `features/school/`. `CreateSchoolPage` searches NCES's public school directory (federal, free, no key — confirmed CORS-callable) with a manual-entry fallback |
| Hierarchical delegation: only a super_admin creates/removes another super_admin or an admin; a school is never left without at least one super_admin | ✅ Complete | `schools/{schoolId}.superAdminCount`, checked in `firestore.rules` before allowing a super_admin's `members` doc to be deleted. The counter itself is trusted to be maintained by the app's paired batch writes (member create/delete ⟷ increment/decrement), not independently re-derived by the rules — a stated, deliberate limitation, not an oversight |
| Scoped specialist role (cross-class/school-wide visibility *and CRUD*, short of full admin) | ✅ Complete | This *is* BR-1.3.12 — a teacher's `members/{uid}.scope` of `'grades'` or `'school'` grants full CRUD (not just read) on classrooms/students they don't own, enforced in `firestore.rules`'s `hasScopedAccess()`. Admins/super_admins get the same full-CRUD access automatically across their whole school |
| Teacher assignable to multiple classes/sections, or as secondary teacher on another teacher's class | ✅ Complete (pre-existing) | `contexts/{contextId}.ownerUids` is an array — unchanged from the original MVP schema, still covers this directly |
| Staff onboarding for people without an account yet | ✅ Complete | **Invite-and-claim**, not real account pre-provisioning — Cloud Functions (which could use the Admin SDK to create accounts outright) live in the private `sprout-functions` repo, not available here. An admin invite (`pendingInvites/{email}`) is claimed automatically the first time that email signs in, on either platform |
| Emulator-seeded test accounts covering every role/scope | ✅ Complete | `npm run seed:emulator` (`scripts/seed-emulator-accounts.mjs`, uses `firebase-admin` purely as a local scripting tool against the emulator — no real credentials, no Cloud Functions involved) — see §9.3 for the account list. `npm run emulators` now imports/exports `.emulator-seed/` automatically so seeded state persists across sessions |
| Multi-select students + bulk move to another class/teacher | 🔴 Not started (Phase 2) | Directly from field feedback: ETM Machine's one-by-one roster transfer takes ~15 clicks/student. Implement as a Firestore batched write (≤500 doc writes/batch), not N sequential writes |
| Mass transaction (earn/spend/deposit) against an entire class or an arbitrary multi-select | 🔴 Not started (Phase 2) | Same batched-write approach; replaces ETM Machine's manually-maintained "group" workaround entirely — Sprout Streak should not need a group abstraction to do this |
| CSV/spreadsheet bulk import for teachers and students | 🔴 Not started (Phase 2) | Builds directly on the `pendingInvites` mechanism above — a CSV row becomes one invite (or one student doc, since students don't need accounts). This was deliberately sequenced as a follow-up so the security matrix could be proven independently first |
| Student ID barcode scanning for independent balance visibility | 🔴 Not started, future consideration | Raised in conversation, not built: many schools already issue students physical ID cards (lunch, library, etc.) with barcodes — scanning that *existing* card (camera-based, or a USB scanner acting as a keyboard wedge) to pull up a student's balance would solve BR-1.3.3 (independent student balance visibility, still otherwise unsolved — see §2.3) without proprietary hardware, unlike ETM Machine's $50 custom-card requirement (BR-1.3.6). Needs its own design pass: what a "scan" actually authorizes (view-only, at an admin-configured kiosk device — not a real auth token, since there's still no independent student login), and a kiosk-mode security model |

### 2.8 CI/CD & Infrastructure ✅ COMPLETE
| Feature | Status |
|---|---|
| GitHub repos (`sprout` public, `sprout-functions` private), `develop`/`staging`/`main` branch model | ✅ Complete |
| Firebase project trio (`nelsongrey-sprout-dev/staging/prod`) | ✅ Created; billing/IAM/Auth-provider setup pending (owner action, tracked outside this doc) |
| GitHub Actions (`master-pipeline.yml`, hosting deploys per branch, CodeQL, secret scanning) | ✅ Complete, mirrored from `wishlist-wizard` |
| Functions companion-repo checkout (`FUNCTIONS_REPO_PAT`) | ✅ Workflow wired; secret not yet set |

---

## 3. Technical Implementation

### 3.1 Auth Architecture (as built)
`AuthService` (abstract interface) → `FirebaseAuthService` (real) / `FakeAuthService` (test double), extracted verbatim from `game-shell`'s `src/auth/` (confirmed zero cross-imports from that package's ads/consent/IAP layers during extraction). `LoginScreen` is constructor-injected with an `AuthService`, matching modulo-squares' platform-gating convention (Google/Android, Apple/iOS) but reimplementing cancellation-swallowing and friendly error messages at the UI layer, since `FirebaseAuthService` intentionally just propagates exceptions.

### 3.2 Proposed Firestore Data Model (not yet implemented)

This is the concrete technical shape needed to satisfy BR-1.4.2/1.4.3 (classroom **and** family context sharing one student identity) — the single biggest structural differentiator identified in the BRD. Proposed, not final:

```
users/{uid}
  ├── role: 'teacher' | 'parent' | 'student'
  ├── displayName, email

students/{studentId}
  ├── ownerUid                      # the student's own auth uid, if they have one
  ├── displayName
  ├── contexts: {
  │     [contextId]: { type: 'classroom' | 'family', role: 'member' }
  │   }                              # a student can belong to >1 context — the
  │                                   # classroom/family continuity requirement
  └── balance: { current, currency }  # denormalized for fast reads; source of
                                       # truth is the transactions subcollection

contexts/{contextId}                 # a classroom OR a family unit
  ├── type: 'classroom' | 'family'
  ├── ownerUids: [uid, ...]          # teacher(s) or parent(s) — supports
  │                                   # co-teacher/co-parent sharing at NO extra
  │                                   # tier, unlike ClassBank's Pro-gated
  │                                   # co-teacher sharing (BR-1.4.3)
  ├── memberStudentIds: [studentId, ...]
  └── settings: { interestRateBps, ... }  # interest available at every tier

contexts/{contextId}/transactions/{transactionId}
  ├── studentId, type: 'earn' | 'spend' | 'interest'
  ├── amount, reason, createdByUid, createdAt
  └── syncStatus                     # for offline-queue reconciliation (§2.2)
```

**Security rule shape** (not yet implemented): a student can only read their own `students/{studentId}` document and its transactions; a context owner (teacher/parent) can read/write everything scoped to `contexts/{contextId}` where their uid is in `ownerUids`. No cross-context reads without an explicit share grant — this is the enforcement point for keeping classroom and family data appropriately separated even though they share a student identity.

**Resolved — scoped specialist role (BR-1.3.12)**: implemented via a `schools/{schoolId}/members/{uid}.scope` field (`'own' | 'grades' | 'school'`), not the `grantedContextIds`-list idea originally sketched here — see §3.2a immediately below for the shipped design.

### 3.2a School Security Matrix (implemented, BR-1.3.11/1.3.12)

```
schools/{schoolId}
  ├── name
  ├── founderUid           # rules bootstrap only — see below, not ongoing authority
  ├── superAdminCount      # invariant tracking — "never zero super_admins"
  ├── nces?                # { ncesId, street, city, state, zip } — set when founded via
  │                         # the NCES school-lookup search rather than typed manually
  └── createdAt

schools/{schoolId}/members/{uid}       # every super_admin/admin/teacher affiliated with the school
  ├── role: 'super_admin' | 'admin' | 'teacher'
  ├── displayName, email
  ├── scope: { type: 'own' | 'grades' | 'school', grades?: string[] }
  │     # meaningless for super_admin/admin (implicit full-school CRUD); for
  │     # teachers: 'own' = only classrooms they directly own (default);
  │     # 'grades' = any classroom in this school whose gradeLevel is in
  │     # `grades`; 'school' = every classroom in the school (PE/art/music)
  ├── addedByUid
  └── createdAt

pendingInvites/{lowercasedEmail}       # top-level, doc ID = the invitee's lowercased email
  ├── schoolId, role, scope            # copied into `members` on claim
  ├── invitedByUid
  └── createdAt
  # Claimed by matching request.auth.token.email (provider-verified) against
  # the doc ID — runs once after every sign-in on both platforms, a no-op
  # unless a matching invite exists. Deleted once claimed.

users/{uid}.schoolIds: [schoolId, ...] # denormalized so the app knows which
                                        # school(s) to offer navigating into

contexts/{contextId}.schoolId?, .gradeLevel?    # optional — additive, not a
students/{studentId}.schoolId?, .gradeLevel?    # migration for standalone/family data
```

**Delegation is hierarchical, three tiers**: only a `super_admin` can create/remove another `super_admin` or an `admin` (`isSuperAdmin` in `firestore.rules`); any `admin` (super_admin or delegate) can freely manage `teacher` membership and scope (`isAtLeastAdmin`). A school is never left without at least one `super_admin` — `schools/{schoolId}.superAdminCount` is checked before a `super_admin`'s `members` doc can be deleted, maintained by the app's paired batch writes (member create/delete ⟷ increment/decrement), not independently re-derived by the rules (a stated limitation). Bootstrapping the very first `super_admin` uses a one-time `founderUid` check on the school doc (`isFoundingSuperAdmin`) — nothing else could grant it, since no `members` doc exists yet for a brand-new school.

**Award-only vs. full manage**: `hasAwardAccess()`/`hasManageAccess()` (firestore.rules) split what scoped/delegated access actually grants. Grade/whole-school teacher *scope* only ever grants award-level access — reading a classroom/roster and recording earn/spend transactions — never rename/delete/roster changes. Full manage stays with the classroom's owner, an admin/super_admin, or an explicit `manage`-level entry in a teacher's `classroomGrants` map (`schools/{schoolId}/members/{uid}.classroomGrants: {contextId: 'award'|'manage'}`). A `classroomGrants` entry is set only one way: an admin/super_admin approving an `accessRequests/{id}` doc — a classroom owner can *propose* that a colleague get access to specifically their classroom, but only an admin can actually grant it, keeping "only admins/super_admins grant access" the one invariant across the whole model.

**Why invite-and-claim instead of real account provisioning**: Cloud Functions (which could use the Admin SDK to create Firebase Auth accounts outright) live in the private `sprout-functions` repo, not available here. `pendingInvites` records what an admin configured for an email; `claimPendingInviteIfAny` (mobile: `SchoolRepository`; web: `lib/school.ts`) activates it automatically the first time that email actually signs in.

**UI**: both platforms — `packages/web/src/features/school/` (`CreateSchoolPage` with NCES search, `SchoolAdminPage`) and `packages/mobile/lib/features/school/school_admin_screen.dart` have staff CRUD at parity. `ClassroomsScreen`/`ClassroomsPage` merge owned classrooms with scope-visible ones client-side (`ClassroomRepository.classroomsInSchool` / `useClassroomsInSchool`).

**Roster metadata (first/last name, school ID)**: `Student.firstName`/`lastName` are the source of truth; `displayName` is a denormalized `${firstName} ${lastName}` recomputed at write time so every existing display/sort/search call site needs no changes. `Student.studentId` and `SchoolMember.staffId` are plain admin/CSV-entered school-district ID strings (not enforced unique by Firestore — CSV import upserts by matching on them) — distinct from the future barcode-ID-card concept below, which is about students scanning an existing physical card, not a data field. `SchoolMember.firstName`/`lastName` are purely supplementary (CSV/manual entry) — `displayName` for staff stays auth-provider-sourced and authoritative, since staff sign in with real accounts and students don't.

### 3.3 Offline & Reliability Requirements (technical detail for §2.2)
- Enable Firestore's offline persistence (`Settings(persistenceEnabled: true)` on mobile) so transaction writes queue locally and sync on reconnect, directly addressing ETM Machine's cellular-crash failure mode.
- Firebase Auth's token refresh is automatic and should not require user-visible re-authentication under normal operation; this needs to be verified with an integration test that simulates a network drop mid-session, not assumed from SDK defaults alone.

---

## 4. Platform-Specific Implementation Notes (as built)

### 4.1 iOS
- Bundle ID: `com.sproutstreak.app.ios` (org-unbranded convention shared with vehicle-vitals/wishlist-wizard — renamed from `com.nelsongrey.sprout`, then from `com.sprout.app.ios` once the product name became "Sprout Streak")
- `Runner.entitlements` created with `com.apple.developer.applesignin`, wired into all 3 build configs' `CODE_SIGN_ENTITLEMENTS`.
- `Info.plist` has a placeholder `CFBundleURLTypes` entry (`REPLACE_WITH_REVERSED_CLIENT_ID`) — must be replaced with the real reversed-client-ID once `GoogleService-Info.plist` exists for each environment. Explicitly **not** copied from another app's plist (modulo-squares' checked-in value was found to be stale/mismatched during this project's research phase).

### 4.2 Android
- `applicationId`: `com.sproutstreak.app.android`
- Google Services Gradle plugin applied only if `google-services.json` exists (file-exists guard), matching modulo-squares' pattern — avoids breaking local builds before real Firebase config exists.
- Manifest permissions: `INTERNET`, `ACCESS_NETWORK_STATE` only — no `AD_ID` permission, since Sprout Streak carries no ad SDK.

### 4.3 Web
- Vite + React 19 scaffold only; no Firebase wiring, no routes beyond the default template yet.

---

## 5. CI/CD & DevOps ✅ COMPLETE (infrastructure only — nothing to deploy yet)

| Workflow | Trigger | Status |
|---|---|---|
| `master-pipeline.yml` | PR → develop/staging/main; push → staging/main | ✅ Wired, mirrors wishlist-wizard |
| `firebase-hosting-{dev,staging,merge}.yml` | Push to matching branch | ✅ Wired |
| `firebase-deploy-local.yml` (reusable) | Called from pipeline | ✅ Wired; GCP Workload Identity Federation not yet configured (placeholder TODO in workflow) |
| `codeql.yml`, `secret-scan.yml` | Push/PR + schedule | ✅ Wired |

**Deliberately not yet added** (per the original scaffold plan): `ios-mobile-release.yml`, `manage-asc-subscriptions.yml`, `e2e-tests.yml`, `release-readiness-gate.yml` — add once there's an actual app to release.

---

## 6. Quality Assurance

### 6.1 Testing Coverage (as built)
| Test Type | Coverage | Status |
|---|---|---|
| Mobile widget tests | Auth/login screen only (3 tests) | ✅ Passing |
| Mobile `flutter analyze` | Whole `lib/` | ✅ 0 issues (2 pre-existing info-level lints matching upstream pattern) |
| Web tests | None yet | 🔴 Not started |
| Functions tests | None yet (repo not even scaffolded with logic) | 🔴 Not started |
| Firestore security rules tests | None (no rules written yet — §3.2 is proposed, not implemented) | 🔴 Not started |

### 6.2 Known Testing Gotcha (documented for future contributors)
A widget test that manually creates a raw `StreamSubscription` on `AuthService.authStateChanges()` outside the widget tree caused a full 10-minute hang in this sandboxed dev environment, reproducibly, regardless of trigger mechanism (`tester.tap()`, `pumpAndSettle()`, or direct `onPressed()` invocation). Root cause not fully isolated; asserting against `authService.currentUser` directly instead of a manual subscription avoids it. See `packages/mobile/test/features/auth/login_screen_test.dart` and its git history for the full isolation process.

---

## 7. Security & Compliance

### 7.1 Authentication & Authorization ✅ COMPLETE (auth layer only)
- Firebase Authentication, Google + Apple only — no email/password or anonymous guest mode (deliberately narrower than modulo-squares' auth, since Sprout Streak has no guest-play use case).
- No ads SDK, no IAP, no consent-management SDK — none apply (BR §3.1: no advertising, ever).

### 7.2 Data Security 🔴 NOT STARTED
- Firestore security rules: not written (§3.2's proposed model above is the design target).
- No sensitive PII beyond what auth providers give (name, email). **Resolved** (was previously an open question): students DO sign in with a real account, the same Google/Apple/email providers teachers use — most K-12 students already have a school-managed Google Workspace for Education account, and school-directed ed-tech use under those accounts is exactly the pattern COPPA's school-official consent exception covers (district-level consent, not per-parent-per-app — this is how ClassBank, Clever, and ClassDojo actually operate). A student's account is *linked* to their existing roster record via the same invite-and-claim pattern already used for teacher accounts (`pendingStudentLinks`/`claimPendingStudentLinkIfAny`), rather than provisioned separately — see §3.2's student self-access rules (`isLinkedStudentSelf`/`isValidStudentLinkClaim`) for the enforcement side. A linked student's access is strictly read-only and scoped to exactly their own balance/history — never the classroom roster, other students, or any admin tooling.

### 7.3 Privacy Compliance 🔴 NOT STARTED — HIGHER BAR THAN THE ORG'S OTHER APPS
| Regulation | Status | Notes |
|---|---|---|
| **COPPA** | 🔴 Not started | No behavioral ads (structural — no ad SDK exists in this codebase at all); parental/teacher consent model needs explicit design before any under-13 account can be created |
| **FERPA** | 🔴 Not started | Only relevant app in this org's portfolio that plausibly touches education records; a data processing agreement / district-facing compliance statement is required before any school-facing marketing (BR §9) |
| **Accessibility (WCAG 2.1 AA-equivalent)** | 🔴 Not started | Concrete technical bar: every core flow (sign-in, balance check, earn/spend action) must pass with VoiceOver (iOS) and TalkBack (Android) enabled — treat this as a release gate for v1.0, not a post-launch backlog item, per BR-1.3.4/1.4.4 |

**This is a meaningfully higher compliance bar than the org's other three apps carry** — see [[feedback_no_live_users_yet]] (modulo-squares/vehicle-vitals/wishlist-wizard have zero public users and no institutional data-handling obligations yet); Sprout Streak's explicit K-12/school-facing ambition means COPPA/FERPA readiness needs to land *before* the first real classroom signs up, not be retrofitted after.

---

## 8. Known Limitations & Roadmap

### 8.1 Current Limitations (scaffold state)
- No product features exist yet — only auth, infra, and CI/CD.
- No Firestore schema, security rules, or Cloud Functions business logic.
- `firebase_options.dart` is a placeholder that throws `UnsupportedError` until `flutterfire configure` is run against real per-environment Firebase config.
- Web app is the unmodified Vite template.

### 8.2 Planned Work (maps to BRD §3.2 short-term objectives)

**Phase 1 — MVP (single classroom or family, core loop)**:
- Firestore schema + security rules (§3.2)
- Earn/spend/save core transaction flow, both roles (teacher/parent administering, student viewing)
- Reliability hardening: offline queueing, network-transition testing (§2.2)
- Accessibility pass on all core flows (§2.4)
- Parent/co-teacher invite flow (§2.6)

**Phase 2 — Family/classroom continuity**:
- Multi-context student identity (§3.2's `contexts` model)
- Interest/compound-growth mechanics at the free tier
- Bulk operations: multi-select + batched move/transact (§2.7)
- Secondary/multi-section teacher assignment (§2.7)

**Phase 3 — Schoolwide/district**:
- SIS integration, centralized admin dashboard (matching ClassBank's Schoolwide tier, not a v1.0 priority per BRD §3.2)
- Scoped specialist role for cross-class/school-wide visibility short of full admin (§2.7, §3.2 open design question)

---

## 9. Dependencies & Environment

### 9.1 Key Flutter Dependencies (`packages/mobile/pubspec.yaml`)
- `firebase_core: ^4.13.0`, `firebase_auth: ^6.5.7`, `cloud_firestore: ^6.8.0`, `cloud_functions: ^6.3.6`, `firebase_app_check: ^0.4.6`
- `google_sign_in: ^7.2.0`, `sign_in_with_apple: ^8.1.0`, `crypto: ^3.0.7`
- `go_router: ^16.2.4`, `provider: ^6.1.2`, `flutter_secure_storage: ^9.2.2`

### 9.2 Firebase Projects
| Alias | Project ID | Status |
|---|---|---|
| development | `nelsongrey-sprout-dev` | ✅ Created; Auth providers/IAM pending owner action |
| staging | `nelsongrey-sprout-staging` | ✅ Created; same |
| production | `nelsongrey-sprout-prod` | ✅ Created; same |

### 9.3 Emulator Test Accounts (local only — never real credentials)

Run `npm run seed:emulator` once (regenerates `.emulator-seed/`, gitignored), then `npm run emulators` for every regular session — it imports that seed automatically and exports changes back on exit. One school ("Test Elementary") covering every role/scope, password `sprouttest1` for all:

| Email | Role / scope |
|---|---|
| `super1@test.sprout` | Super admin (founder) |
| `admin1@test.sprout` | Admin (delegate) |
| `teacher.own@test.sprout` | Teacher, scope `own` — owns 3rd Grade |
| `teacher.grades@test.sprout` | Teacher, scope `grades` — [4, 5] |
| `teacher.school@test.sprout` | Teacher, scope `school` — whole-school specialist (PE/art/music case) |

No student account — students still have no login (see §2.3); a seeded student in each classroom is reviewable via the teacher-mediated ledger screen instead.

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
| Auth | 100% | Real, tested |
| Repo/CI/CD infra | 100% | Real, tested |
| Firebase projects | 100% created | Auth providers, billing, IAM pending owner action |
| Product data model | 0% | Proposed design only (§3.2) |
| Product features | 0% | Nothing beyond auth exists |
| Compliance (COPPA/FERPA/accessibility) | 0% | Requirements defined (§7), nothing implemented |
| Testing | ~5% | Auth only |

**Status**: 🟡 **Ready for Phase 1 (MVP) implementation to begin.**

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Aug 16, 2026 | Mark Nelson | Initial TRD against the fresh scaffold, including proposed Firestore data model and honest implementation-status tables |
| 1.1 | Aug 16, 2026 | Mark Nelson | Added §2.7 (bulk operations & role granularity, BR-1.3.9–1.3.12) and flagged the scoped-specialist-role open design question in §3.2 |
| 1.2 | Aug 16, 2026 | Mark Nelson | Shipped the school security matrix (§3.2a): principal/hierarchical admin delegation, teacher scope grants, invite-and-claim onboarding — resolves BR-1.3.11/1.3.12. CSV bulk import (BR-1.3.9/1.3.10) deliberately sequenced as a follow-up |
| 1.3 | Aug 16, 2026 | Mark Nelson | Corrected the hierarchy to a real three-tier super_admin/admin/teacher role (was a single hardcoded `principalUid`), with a "never zero super_admins" invariant; expanded scoped access from read-only to full CRUD; added NCES public-school lookup to school creation (§3.2a); added emulator-seeded test accounts for every role/scope (§9.3); noted student ID barcode scanning as a future consideration (§2.7) |

---

**Next Review Date**: Upon Phase 1 (MVP) kickoff
