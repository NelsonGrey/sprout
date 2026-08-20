# 05 — Implementation Handoff

## 1. Outcome expected from an implementation chat

An implementation chat must deliver one coherent slice of the designs, not scatter partial components across every persona. Its final report must state:

- implemented screen IDs and use-case IDs;
- source files changed;
- feature states changed, if any, with evidence;
- role/capability behavior;
- browser and native form factors actually tested;
- automated validation results;
- remaining manual, backend, legal, privacy, accessibility, or owner-configuration gates.

It must not call a prototype, shared theme, route stub, or passing unit test “complete” when the end-to-end use case is unavailable.

## 2. Repository starting map

### Responsive web

| Concern                                      | Current source                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Root auth/route boundary                     | `packages/web/src/App.tsx`                                                                        |
| App shell                                    | `packages/web/src/components/layout/Layout.tsx`, `Header.tsx`, `Sidebar.tsx`, `TwoPaneLayout.tsx` |
| Semantic tokens/breakpoints                  | `packages/web/src/index.css`                                                                      |
| Shared UI                                    | `packages/web/src/components/ui/`                                                                 |
| Dashboard                                    | `packages/web/src/features/dashboard/DashboardPage.tsx`                                           |
| Classroom daily/roster/settings              | `packages/web/src/features/classroom/`                                                            |
| Student self view                            | `packages/web/src/features/student/MyBalancePage.tsx`                                             |
| School/staff/access                          | `packages/web/src/features/school/`                                                               |
| Schoolwide students/import/promotion/archive | `packages/web/src/features/students/`                                                             |
| Marketing audiences/lessons                  | `packages/web/src/features/marketing/content.ts` and sibling pages                                |
| Firestore client adapter                     | `packages/web/src/lib/firestore.ts`, `packages/web/src/lib/school.ts`                             |

### Native Flutter

| Concern                                        | Current source                                               |
| ---------------------------------------------- | ------------------------------------------------------------ |
| Router/composition root                        | `packages/mobile/lib/main.dart`                              |
| Semantic theme/responsive contract             | `packages/mobile/lib/design_system/sprout_theme.dart`        |
| Auth                                           | `packages/mobile/lib/features/auth/`                         |
| Role-resolved landing                          | `packages/mobile/lib/features/classroom/landing_screen.dart` |
| Classroom and ledger                           | `packages/mobile/lib/features/classroom/`                    |
| Student self/bulk operations                   | `packages/mobile/lib/features/student/`                      |
| School/staff/access                            | `packages/mobile/lib/features/school/`                       |
| Classroom repository interface/implementations | `packages/mobile/lib/core/services/classroom/`               |
| School repository interface/implementations    | `packages/mobile/lib/core/services/school/`                  |
| Native model mirrors                           | `packages/mobile/lib/core/models/`                           |
| Widget tests                                   | `packages/mobile/test/`                                      |

### Shared/security/backend

| Concern                    | Current source                                                              |
| -------------------------- | --------------------------------------------------------------------------- |
| TypeScript domain contract | `packages/shared/src/index.ts`                                              |
| Firebase client utilities  | `packages/firebase-utils/src/`                                              |
| Server authorization       | `firestore.rules`                                                           |
| Rule regression tests      | `firestore.rules.test.ts`                                                   |
| Private backend            | separately mounted `packages/functions/` from `NelsonGrey/sprout-functions` |

Do not add a field to only TypeScript or only Dart. Shared data changes require TypeScript type, Dart model, serializers, fake repositories, Firestore repositories, rules, rule tests, existing-data compatibility, and documentation in the same logical slice.

## 3. Target front-end structure

This is the recommended structure; preserve repository conventions and migrate incrementally.

```text
packages/web/src/
  app/
    capabilities.ts
    featureFlags.ts
    roleContext.tsx
  components/
    layout/                 # adaptive shell, context switcher
    ui/                     # shared primitives from C-* inventory
  features/
    classroom/
      components/transaction-composer/
      hooks/
    learning/               # authenticated wrappers around canonical content
    family/                 # feature-flagged until backend prerequisite
    district/               # feature-flagged until backend prerequisite
    student/

packages/mobile/lib/
  app/
    capabilities.dart
    feature_flags.dart
    role_context.dart
    adaptive_shell.dart
  widgets/                  # shared native C-* equivalents
  features/
    classroom/transaction/
    learning/
    family/                 # feature-flagged
    district/               # feature-flagged
```

Do not mechanically move all existing files as a prerequisite. Extract a shared primitive only when the chosen slice uses it in at least two places or when it centralizes a security/accessibility invariant.

## 4. Feature flag contract

Planned features need typed, environment-controlled flags with secure server-side enforcement.

```ts
type AppFeature =
  | 'authenticatedLearning'
  | 'massTransactions'
  | 'studentGoals'
  | 'familyContexts'
  | 'districtWorkspace';
```

Equivalent Dart enum required. Flags control discoverability, not permission. A user must pass both `featureEnabled` and `capabilityAllowed`. Default production values for family and district are false until their prerequisites pass. Do not let a query-string override enable production data writes.

## 5. Required implementation sequence

### Slice 0 — Reverify baseline and close documentation drift

**Why first:** current code advanced faster than the TRD status table.

1. Run current web, mobile, and rule tests.
2. Manually verify mobile import/promote/archive and the selected theme before changing their status.
3. Verify current web goals, store, spend categories, savings labels, interest practice, and opportunity-cost behavior.
4. Update the TRD only with evidence; do not infer runtime behavior from file presence.
5. Record a clean baseline of failing/passing tests.

**No visual product change is required in this slice.**

### Slice 1 — Capability and adaptive-shell foundation

**Screens:** global `C-APP-SHELL`, `C-CONTEXT-SWITCHER`; preserve all current routes.  
**Use cases supported:** prerequisite for every persona.

1. Introduce a role/context resolver returning named capabilities from current membership/classroom data.
2. Replace duplicated presentation-only role checks incrementally, without changing Firestore rules.
3. Web: preserve persistent desktop sidebar and accessible phone drawer; add `Learn` only behind its flag.
4. Native: add role-aware phone bottom navigation and tablet rail around current routes.
5. Add account role/context switching for actual current dual-role cases; family/district choices remain absent.
6. Test student-only isolation, teacher scope, admin navigation, deep links, Back, and permission removal.

**Stop condition:** if capability derivation disagrees with a rule, keep the narrower result and resolve the rule/model explicitly.

### Slice 2 — Classroom daily workspace and transaction composer

**Screens:** `W/M-CLASS-01/02/03/04/05`.  
**Use cases:** `UC-EDU-02` through `UC-EDU-07`, plus school bulk behavior.

1. Normalize transaction types/tags across TypeScript and Dart; verify rules.
2. Extract the single-recipient composer without changing current write semantics.
3. Add mobile parity for goals, store, savings labels, spend categories, interest practice, and opportunity-cost reminder.
4. Add selection mode and group composer UI.
5. Before enabling mass submit, approve one production write contract:
   - preferred: authenticated backend operation with idempotency key, authorization recheck, chunked writes, and exact per-recipient result; or
   - explicitly proven client batches with idempotency and recoverable partial results.
6. Add offline/sync states. If idempotent queueing is not complete, show `Reconnect to record` and do not report queued success.
7. Keep roster/settings/destruction separate from daily actions on both platforms.

**Stop condition:** do not ship group transactions if retry can duplicate writes or if award-scoped authorization is not proven with list/query/write tests.

### Slice 3 — Authenticated learning library and guided lessons

**Screens:** `W/M-LEARN-01/02/03`.  
**Use cases:** `UC-EDU-01`, `UC-FAM-03`, `UC-STU-03`; all eight lesson mappings.

1. Move or expose marketing lesson data through a platform-neutral canonical content artifact. Avoid duplicating eight lesson bodies in TypeScript and Dart by hand. Acceptable options include versioned JSON generated from a schema or a reviewed API; choose one and test it.
2. Preserve every field in the lesson contract and every inclusion/safety note.
3. Implement authenticated filters, preparation, print/public handoff, and guided step runner.
4. Implement product deep links with restorable lesson step and draft context.
5. Add age/role presentation without changing canonical instructional content silently.
6. Store no student reflection until its minimization, access, retention, export, and deletion contract is approved.

**Stop condition:** if mobile needs duplicated content, add deterministic generation and drift tests before shipping.

### Slice 4 — Student experience completion

**Screens:** `W/M-STUDENT-01/02/03`.  
**Use cases:** `UC-STU-01` through `UC-STU-04`.

1. Reframe current balance/history into Today, History, Goals, Learn without exposing peers.
2. Add early-reader and grades 3–6 presentations selected by authorized grade-band context, not self-reported age alone.
3. Expose goals read-only first. Any student-created goal proposal requires an approval/state model before implementation.
4. Add neutral spend-detour and reflection UI.
5. Complete VoiceOver/TalkBack/web screen-reader checks for student core flows.

**Stop condition:** do not store student reflections or enable student writes merely to satisfy a screen mockup.

### Slice 5 — Family mode prerequisite and implementation

**Screens:** `W/M-FAMILY-01/02`.  
**Use cases:** `UC-FAM-01/02/03`.

**Mandatory prerequisite technical design:**

- stable learner identity vs. per-context membership;
- separate per-context balances, goals, history, catalog, and archive state;
- migration from current `Student.contextId`/`balanceCents` without losing history;
- Firestore query shapes compatible with rules;
- family manager/co-manager/child invite authority and claim behavior;
- school/family boundary tests;
- data export, correction, deletion, retention, and under-13 authorization;
- conflict behavior when school and family link the same auth identity.

Only after that design and rule tests pass:

1. implement family creation/invites;
2. add role/context switcher entries;
3. reuse transaction/goal/lesson primitives with family language;
4. prove no classroom query/write occurs from family screens;
5. run family-specific child-safety and accessibility acceptance.

**Hard stop:** do not write family records by setting current classroom fields to `type: 'family'` while retaining a single scalar learner context/balance.

### Slice 6 — District workspace prerequisite and implementation

**Screens:** `W/M-DIST-01/02/03`, `W/M-TRUST-01`.  
**Use cases:** `UC-DIST-01` through `UC-DIST-04`.

**Mandatory prerequisites:** district identity/membership; selected-school delegation; aggregation/privacy thresholds; readiness source of truth; pilot/evidence data contracts; legal/privacy/security/accessibility owner approval; export authority.

Begin with a read-only authenticated view over canonical public readiness and curriculum. Add editable pilots/evidence only after server authorization and privacy review. Native phone may remain review-only while responsive web/tablet provides complex administration.

**Hard stop:** a public readiness wrapper does not justify a `district admin` label or access to school/student data.

### Slice 7 — Launch hardening

1. Deliberately configure and test offline persistence/idempotency.
2. Run Wi-Fi/cellular/offline/background reliability matrix with 99.5%+ crash-free target instrumentation plan.
3. Complete accessibility remediation and independent manual evidence; publish a statement only after evidence.
4. Complete privacy data inventory, retention schedule, DPA/subprocessor/consent/support/security contacts, and qualified review.
5. Verify staging/prod providers, IAM, billing, Apple Sign-In, App Check, and deletion flows.
6. Add release acceptance for all eight required form-factor/browser classes.

## 6. UI implementation rules

- Use semantic tokens from `index.css` and `sprout_theme.dart`; no literal brand colors.
- Use one 1280px maximum boundary and 20/32/48 gutters.
- Preserve one scroll owner per screen; document any desktop dual-pane exception.
- Keep frequent transactions separated from destructive roster/settings actions.
- Use named capability checks plus server rules. Never infer access from an email domain, URL, hidden button, or marketing persona.
- Preserve draft forms through keyboard open/close, rotation, browser resize, and safe route transitions.
- Do not use placeholder zero metrics while loading.
- Errors presented to students are plain, actionable, and do not expose Firebase internals.
- Every planned route has an explicit flag and absent-by-default production behavior.

## 7. Data and security change checklist

For every new collection, field, query, or write:

1. Define TypeScript and Dart shapes and backward-compatible decoding.
2. Add fake repository behavior and tests.
3. Add web and Flutter repository interface methods.
4. Add Firestore rules before enabling the UI.
5. Add single-document and **real list-query** rule tests for each affected role/scope.
6. Define indexes in `firestore.indexes.json` where required.
7. Define created/updated timestamps, creator, context, and idempotency semantics.
8. Define PII classification, analytics exclusion, retention, export, correction, and deletion.
9. Test permission removal and stale client state.
10. Update BRD/TRD status only after end-to-end validation.

## 8. Test and validation commands

Run from the repository root unless shown otherwise.

```bash
npm run check
npm run lint
npm test
npm run build
npm run test:rules

cd packages/mobile
flutter analyze
flutter test
flutter build web --release
```

For a narrow iteration, targeted tests may run first, but completion requires the relevant full suite. If the private Functions repo is mounted and changed, run its documented lint, typecheck, test, and emulator integration commands as well.

Manual validation must cite the viewport/device matrix in the web/mobile design documents. A shared Flutter widget test at a single default size does not prove phone/tablet acceptance.

## 9. Definition of done template

```text
Slice:
Screen IDs:
Use-case IDs:
Feature state before → after:

Roles verified:
- super_admin:
- admin:
- teacher owner:
- scoped/award teacher:
- linked student:
- planned role hidden/flagged:

Form factors verified:
- web phone / tablet / laptop / desktop:
- iPhone / iPad:
- Android phone / tablet:

States verified:
- loading / data / empty:
- denied / error:
- offline cached / offline uncached:
- submitting / success / conflict:

Accessibility evidence:
Child-safety/privacy evidence:
Automated commands and results:
Remaining external/manual gates:
```

## 10. Ready-to-use prompt for another chat

Copy the following prompt and replace bracketed values. Do not remove the source and stop-condition instructions.

```text
Work in /Users/marknelson/Circus/Repositories/sprout.

Read these files completely before making changes:
- docs/detailed-design/README.md
- docs/detailed-design/01_EXPERIENCE_FOUNDATIONS.md
- docs/detailed-design/02_RESPONSIVE_WEB_APP.md
- docs/detailed-design/03_NATIVE_MOBILE_APPS.md
- docs/detailed-design/04_PERSONA_USE_CASE_TRACEABILITY.md
- docs/detailed-design/05_IMPLEMENTATION_HANDOFF.md
- docs/BUSINESS_REQUIREMENTS.md
- docs/TECHNICAL_REQUIREMENTS.md

Implement only this slice: [SLICE NAME].
Required screen IDs: [SCREEN IDS].
Required use-case IDs: [USE-CASE IDS].
Required platforms/form factors: [WEB/NATIVE MATRIX].

Treat executable code and Firestore rules as the source of truth for current behavior. Preserve unrelated worktree changes. Use the semantic Sprout design tokens and the documented capability model. Implement loading, data, empty, denied, error, offline, submitting, success, and conflict states as applicable. Keep student data private and preserve the lesson inclusion/safety language.

Do not implement a PLANNED write path without its documented data/rules/privacy prerequisite. Stop and report the exact blocker if a hard stop in 05_IMPLEMENTATION_HANDOFF.md applies. Do not change marketing readiness claims merely because UI exists.

Validate with targeted tests during development, then the relevant full web/mobile/rules suites. Manually verify every required form factor and accessibility behavior. In the final response, use the Definition of done template from the handoff document and link every changed file.
```

## 11. Design-package maintenance

When implementation changes a target decision:

- update the affected screen specification and traceability row in the same pull request;
- keep screen/use-case IDs stable where possible;
- record platform state separately;
- update the baseline date/version in [README.md](README.md);
- do not erase a launch gate merely because a local or emulator flow works.
