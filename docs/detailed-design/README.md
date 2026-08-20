# Sprout Streak Application Detailed-Design Package

**Version:** 1.0  
**Design baseline:** August 20, 2026  
**Scope:** Authenticated responsive web application plus native iOS and Android applications on phone and tablet  
**Audience:** A future implementation chat, product designer, engineer, tester, or reviewer who has repository access but no prior conversation context

## 1. Purpose

This package translates the public marketing promises, the Business Requirements Document, and the application foundation into an implementation-ready experience design. It is deliberately more prescriptive than a product brief. It defines:

- which persona can see and do what;
- the screen and route inventory;
- exact information hierarchy, controls, states, and transitions;
- responsive behavior for browser phone, browser tablet, laptop, desktop, iPhone, iPad, Android phone, and Android tablet;
- how each marketing use case appears inside the product;
- which capabilities are current, partial, planned, or launch-gated;
- the order in which another chat should implement and validate the work.

The package designs the **application side** of Sprout Streak. The existing public marketing site remains the acquisition and education surface. It is included only where it hands a user into sign-in, curriculum, trust, support, or an authenticated application workflow.

## 2. Source precedence

When sources disagree, use this order:

1. Firestore security rules and executable repository code for current authorization and behavior.
2. This detailed-design package for target application UX and responsive behavior.
3. [TECHNICAL_REQUIREMENTS.md](../TECHNICAL_REQUIREMENTS.md) for architecture and implementation history.
4. [BUSINESS_REQUIREMENTS.md](../BUSINESS_REQUIREMENTS.md) for product intent, market boundaries, and business priorities.
5. Public marketing content in `packages/web/src/features/marketing/content.ts` for persona language and learning promises.

Known baseline discrepancies that an implementation chat must not copy into new work:

- The TRD still describes mobile bulk student operations and CSV import as absent, but the current Flutter repository includes promote, archive, import, and bulk repository methods. Verify actual runtime completeness before declaring parity.
- A stale limitation in the TRD says the web palette is unresolved. The current semantic tokens in `packages/web/src/index.css` and Flutter theme in `packages/mobile/lib/design_system/sprout_theme.dart` establish the selected evergreen, off-white, mint, and coral system.
- Marketing describes family mode and district controls as product direction. They are **not current capabilities** and may not be presented as live.

## 3. Requirement language and feature states

`MUST`, `MUST NOT`, `SHOULD`, and `MAY` are normative.

Every screen and use case carries one of these states:

| State         | Meaning                                                                      | Implementation rule                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `CURRENT`     | Supporting code and data paths exist now.                                    | Preserve behavior; improve presentation and tests without weakening rules.                                                                |
| `PARTIAL`     | Some UI or data support exists, but the marketed outcome is incomplete.      | Show only truthful functionality; identify the remaining prerequisite.                                                                    |
| `PLANNED`     | The experience is designed here but its production data path does not exist. | Keep behind a disabled navigation item, feature flag, prototype fixture, or omit from production. Never write speculative Firestore data. |
| `LAUNCH_GATE` | Required before a real student-data or district launch.                      | Do not convert a draft or test into a public readiness claim.                                                                             |
| `DEFERRED`    | Outside the current product phase.                                           | Document the handoff point; do not implement opportunistically.                                                                           |

Feature-state badges are design-document annotations. They are not necessarily labels shown to ordinary application users. When a planned surface is intentionally previewed to an adult, visible copy must say `Preview`, `Planned`, or `Not available yet`.

## 4. Document map

| Document                                                                   | What it controls                                                                                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [01_EXPERIENCE_FOUNDATIONS.md](01_EXPERIENCE_FOUNDATIONS.md)               | Personas, permissions, mental model, application IA, universal components, content safety, accessibility, and state conventions      |
| [02_RESPONSIVE_WEB_APP.md](02_RESPONSIVE_WEB_APP.md)                       | Authenticated web routes and exact phone/tablet/laptop/desktop behavior                                                              |
| [03_NATIVE_MOBILE_APPS.md](03_NATIVE_MOBILE_APPS.md)                       | iOS/Android navigation and exact phone/tablet behavior                                                                               |
| [04_PERSONA_USE_CASE_TRACEABILITY.md](04_PERSONA_USE_CASE_TRACEABILITY.md) | Complete mapping from every marketing audience, workflow, outcome, and starter lesson to application screens and acceptance criteria |
| [05_IMPLEMENTATION_HANDOFF.md](05_IMPLEMENTATION_HANDOFF.md)               | Repository file map, phased build plan, test matrix, stop conditions, and a ready-to-use prompt for another chat                     |

Read the documents in order. Screen IDs are stable cross-references. Do not rename an ID without updating every reference.

## 5. Scope boundaries

### Included

- Authentication, account claiming, role resolution, and context selection.
- District preview/review, school administration, classroom daily use, educator learning workflows, family mode, and student self-service.
- Curriculum discovery and guided lesson use inside the authenticated application.
- Student balances, transaction history, goals, classroom store, spend reasoning, savings intent, interest demonstrations, opportunity-cost prompts, and just-in-case reserves.
- Staff invitations, scoped specialist access, classroom access requests, rosters, imports, promotion, archive, and mass transactions.
- Honest empty, loading, error, offline, permission, destructive, and launch-gated states.
- Accessibility and privacy behavior required for child-directed and school-managed use.

### Not included

- A redesign of the existing public marketing pages.
- A claim of legal certification, WCAG conformance, district procurement readiness, or completed Pre-K–12 curriculum.
- SIS vendor-specific integration, district SSO, payment checkout, subscription entitlements, or production analytics vendor selection.
- A backend migration design for true multi-context learner identity. The UI contract is specified, but the current scalar `Student.contextId` and single `balanceCents` model cannot safely represent separate simultaneous classroom and family balances. That backend change requires its own approved technical design and Firestore rules/query proof.
- Social feeds, student sharing, public leaderboards, real banking connections, real payment cards, ads, or financial advice.

## 6. Non-negotiable product truths

- Sprout currency is simulated. No screen may imply a bank account, cash value, or redeemability outside the adult-defined context.
- A classroom balance and a family balance are separate even when they belong to one learner identity.
- Students see only their own information. Public or peer balance comparison is prohibited.
- Choices are discussed without shame. The product evaluates reasoning, math, progress, and reflection—not a child’s character or family resources.
- District and family surfaces remain planned until their security, data, and operational prerequisites are complete.
- No role receives broader access merely to make a UI flow easier. The UI mirrors the narrowest server-enforced capability.
- A transaction must remain usable during a normal multi-entry session without repeated authentication.

## 7. How another chat should use this package

Before changing code, the implementing chat must:

1. Read all five files completely.
2. Inspect the current branch and working tree; preserve unrelated changes.
3. Verify the relevant route, repository interface, shared type, Firestore rule, and test before treating a `CURRENT` label as confirmed.
4. Select one implementation slice from [05_IMPLEMENTATION_HANDOFF.md](05_IMPLEMENTATION_HANDOFF.md).
5. State which screen IDs and use-case IDs are in scope.
6. Stop at a documented backend, privacy, accessibility, or owner-configuration gate instead of inventing completion.

A slice is complete only when its supported form factors, role gates, alternative states, automated tests, and manual acceptance rows all pass.
