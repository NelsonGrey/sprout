# 01 — Experience Foundations

## 1. Experience promise

Sprout Streak turns ordinary decisions into a repeatable learning loop:

`NOTICE OR PAUSE → NAME THE CHOICE → CHOOSE OR PLAN → RECORD → SEE THE EFFECT → REFLECT → TRY AGAIN`

Adults establish a safe simulated context and facilitate the loop. Students own their view of progress. Administrators establish access and operating boundaries. The product must feel calm and instructional, not like a casino, public behavior scoreboard, or real banking product.

## 2. Persona and role model

Marketing audiences are broader than executable authorization roles. Keep the two concepts separate.

| Persona ID      | Marketing persona                                                    | Typical product role                                 | Primary job in the app                                                        | State                                         |
| --------------- | -------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------- |
| `P-DIST-EXEC`   | Superintendent or district leader                                    | `district_reviewer` / future district admin          | Set learning direction, bound a pilot, review evidence and readiness          | `PLANNED`                                     |
| `P-DIST-CURR`   | District curriculum lead                                             | `district_reviewer` / future curriculum admin        | Select grade bands, priorities, lessons, and review learning artifacts        | `PLANNED`                                     |
| `P-DIST-TECH`   | District technology, privacy, procurement, or student-services staff | `district_reviewer` / future operational admin       | Review privacy, accessibility, interoperability, support, and data boundaries | `PLANNED` + `LAUNCH_GATE`                     |
| `P-SCHOOL-LEAD` | Principal                                                            | `super_admin` or `admin`                             | Configure school, grades, staff, access, classrooms, rosters, and transitions | `CURRENT`                                     |
| `P-SCHOOL-OPS`  | Office or school support staff                                       | `admin` when authorized                              | Maintain staff and rosters without owning instruction                         | `CURRENT`                                     |
| `P-SPECIALIST`  | Specialist, counselor, instructional support                         | `teacher` with grade/school scope or classroom grant | Work across assigned classrooms without full administration                   | `CURRENT`                                     |
| `P-TEACHER`     | Classroom teacher                                                    | `teacher` and classroom owner                        | Run daily earn/save/spend/reflect workflows and lessons                       | `CURRENT` / `PARTIAL`                         |
| `P-COTEACHER`   | Co-teacher or substitute                                             | `teacher` with assigned ownership or award grant     | Perform bounded daily classroom work                                          | `CURRENT`                                     |
| `P-FAMILY`      | Parent, guardian, or caregiver                                       | future `family_manager`                              | Run an independent home context and family learning conversations             | `PLANNED`                                     |
| `P-STUDENT-PK2` | Early learner, Pre-K–2                                               | linked student                                       | See a simplified, narrated progress experience with adult support             | `PARTIAL`                                     |
| `P-STUDENT-36`  | Independent elementary learner, grades 3–6                           | linked student                                       | Check balance/history/goals, make bounded choices, reflect                    | `CURRENT` / `PARTIAL`                         |
| `P-STUDENT-712` | Secondary learner                                                    | linked student                                       | Use deeper budgeting and decision tools                                       | `DEFERRED`; no complete 7–12 curriculum claim |

### 2.1 Dual-role behavior

A Firebase user may be both staff and a linked student, or later both school staff and a family manager. Authorization is additive, but the interface must not merge contexts or silently elevate access.

- After sign-in, a single-role user enters that role’s default home.
- A dual-role user enters the most privileged **work** role currently used by the repository, then can switch role/context from the account menu.
- The switcher must name both role and context, for example `Teacher · Lincoln Elementary` and `My student view · Room 12`.
- Switching changes navigation and queries; it does not rewrite the user’s membership.
- The last selected role/context may be remembered locally only after it is revalidated at startup.

## 3. Capability model

The UI must consume named capabilities derived from server-enforced membership; components must not repeatedly invent role checks.

```text
canViewDistrictReadiness
canManageDistrictPilot
canViewSchool
canManageSchool
canManageStaff
canManageGrades
canViewAllSchoolStudents
canManageRoster
canManageClassroomSettings
canRecordTransactions
canRecordBulkTransactions
canManageStore
canInviteStudentAccount
canRequestClassroomAccess
canResolveAccessRequests
canViewOwnLearnerData
canManageFamilyContext
canFacilitateLessons
```

### 3.1 Current permission mapping

| Capability                     |                  Super admin |         Admin |           Teacher owner | Scoped specialist / award grant | Linked student |           Family manager |              District role |
| ------------------------------ | ---------------------------: | ------------: | ----------------------: | ------------------------------: | -------------: | -----------------------: | -------------------------: |
| View authorized classrooms     |                          Yes |           Yes |                     Yes |             Assigned/scope only |      No roster |         Own family later |     Selected schools later |
| Record individual transactions |                          Yes |           Yes |                     Yes |                             Yes |             No |         Own family later |                         No |
| Record mass transactions       |                   Target yes |    Target yes |              Target yes |             Target within scope |             No |     Target within family |                         No |
| Rename/delete school classroom |                          Yes |           Yes | No for school classroom |                              No |             No |                      N/A |                         No |
| Manage school roster           |                          Yes |           Yes |                      No |                              No |             No |                      N/A |                         No |
| Manage store catalog           |                          Yes |           Yes | No for school classroom |                              No |             No | Own family catalog later |                         No |
| Invite/link student account    |                          Yes |           Yes | No for school classroom |                              No |             No |       Invite child later |                         No |
| Request colleague access       |                          N/A |           N/A |                     Yes |                        If owner |             No |  Invite co-manager later |                         No |
| Resolve access request         |                          Yes |           Yes |                      No |                              No |             No |                      N/A |                         No |
| Manage staff roles             |       Yes; hierarchy applies | Teachers only |                      No |                              No |             No |     Family members later | District assignments later |
| View own balance/history/goals | If linked, after role switch |     If linked |               If linked |                       If linked |            Yes |          If also learner |                         No |

Firestore rules remain authoritative. A hidden button is not authorization.

## 4. Context and money mental model

### 4.1 Required terms

| Internal concept | User-facing term                              | Rule                                                                   |
| ---------------- | --------------------------------------------- | ---------------------------------------------------------------------- |
| `context`        | `Classroom` or `Family`                       | Do not display the engineering word “context.”                         |
| `balanceCents`   | `Sprout balance` on first use, then `Balance` | Always pair with a “simulated” explanation in onboarding/help.         |
| `earn`           | `Earn`                                        | Adult-defined addition to simulated balance.                           |
| `spend`          | `Spend`                                       | Simulated use; never “charge,” “withdraw cash,” or “payment.”          |
| `goal`           | `Goal`                                        | Progress label, not a separate bank account.                           |
| `just_in_case`   | `Just in case`                                | A learning label for reserve intent.                                   |
| `store item`     | `Classroom store item` or `Family choice`     | Catalog shortcut; a purchase still creates a normal spend transaction. |
| `interest`       | `Interest practice`                           | Adult-run demonstration; never imply a real advertised return.         |

### 4.2 Multi-context contract

The target UI uses a stable learner identity with separate memberships:

```ts
type AppContextSummary = {
  id: string;
  type: 'classroom' | 'family';
  displayName: string;
  organizationName?: string;
  roleLabel: string;
  capabilities: string[];
};

type LearnerContextSummary = {
  learnerId: string;
  contextId: string;
  displayName: string;
  balanceCents: number;
  activeGoalCount: number;
  membershipStatus: 'active' | 'archived';
};
```

The interface must never total balances across contexts. Family mode must not ship against the current scalar `Student.contextId` model. A separate technical design must prove queries, rules, migration, per-context balances, invite/claim behavior, and deletion/export behavior first.

## 5. Application information architecture

### 5.1 Adult work navigation

Order navigation by frequency and blast radius:

1. `Home`
2. `Classrooms` or `Family`
3. `Students` / `Children`
4. `Learn`
5. `School` or future `District`
6. `Readiness & trust` for authorized reviewers
7. `Account`

Daily transaction work stays inside a classroom/family. Roster, catalog, access, and destructive settings remain separate from the daily workspace.

### 5.2 Student navigation

Student-only accounts receive at most four primary destinations:

1. `Today` — balance, current goal, recent change, optional adult prompt
2. `History`
3. `Goals`
4. `Learn`

Pre-K–2 may collapse these into one scrollable `Today` view with adult-guided cards. Students never receive school, roster, staff, peer, or global analytics navigation.

### 5.3 Browser public-to-app transitions

- `Log in` opens the existing authentication surface with an optional validated `returnTo` path.
- Marketing curriculum and lesson routes remain publicly readable.
- `Use this lesson` on a public lesson requires sign-in, then opens the authenticated lesson preparation screen with the lesson slug preserved.
- District CTA continues to readiness content until procurement gates are met; it must not become an active purchase or district-provisioning action.
- Support, Privacy, Terms, and Cookies remain reachable from every account screen without losing an unsaved form; open a new browser tab when necessary.

## 6. Universal visual contract

### 6.1 Existing semantic palette

Use the existing semantic tokens. Do not add literal brand hex values in components.

| Intent                  | Web token                       | Flutter source                    |
| ----------------------- | ------------------------------- | --------------------------------- |
| Canvas                  | `bg-canvas` / `bg-bg`           | `SproutColors.canvas`             |
| Primary surface         | `bg-surface`                    | `SproutColors.surface`            |
| Primary text            | `text-ink`                      | `SproutColors.ink`                |
| Secondary text          | `text-ink-muted`                | `SproutColors.muted`              |
| Primary action          | `bg-brand`                      | `colorScheme.primary`             |
| Learning/progress field | `bg-mint`                       | `SproutColors.mint`               |
| Warm emphasis           | `bg-accent-soft`, `text-accent` | secondary container/secondary     |
| Warning/info/danger     | semantic named tokens           | matching `SproutColors` constants |

### 6.2 Typography

Use platform system fonts unless a separately licensed brand font is adopted.

| Role          | Web target     | Native target  | Use                                    |
| ------------- | -------------- | -------------- | -------------------------------------- |
| Display       | 36/42, 800     | 34/40, 800     | Rare welcome or student balance moment |
| Page title    | 24/30, 750–800 | 24/30, 700–800 | One per view                           |
| Section title | 18/24, 700     | 18/24, 700     | Card groups                            |
| Body          | 16/24, 400     | 16/24, 400     | Default prose and forms                |
| Supporting    | 14/20, 500     | 14/20, 500     | Metadata, timestamps                   |
| Label         | 12/16, 700     | 12/16, 700     | Badges and compact statuses            |

Currency uses tabular numerals. Never rely on color or a plus/minus sign alone; include `Earned` or `Spent` for screen readers and detail views.

### 6.3 Spacing, shape, and target size

- Base spacing unit: 4px. Preferred gaps: 8, 12, 16, 20, 24, 32, 48.
- Input and ordinary card radius: 12px. Feature card radius: 16px. Pills: 999px.
- Minimum unified interactive target: 48×48 CSS/logical pixels, exceeding iOS’s 44pt minimum.
- At least 8px between adjacent targets; at least 12px between destructive and primary confirmation actions.
- Maximum application outer width: 1280px. Reading content: 1040px. Forms: 480px unless a table/import requires more.
- Web gutters: 20px under 640px, 32px from 640px, 48px from 1024px.
- Native gutters: use `SproutLayout.pageGutterFor`: 20 under 600, 32 from 600, 48 from 1200.

## 7. Shared component inventory

An implementation should create or normalize these primitives before screen-by-screen work.

| Component ID             | Contract                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `C-APP-SHELL`            | Role-aware navigation, context switcher, persistent account access, safe-area handling, one scroll owner     |
| `C-PAGE-HEADER`          | Optional breadcrumb/back, one title, optional status/subtitle, responsive action overflow                    |
| `C-CONTEXT-SWITCHER`     | Shows context type, name, organization, role; selection revalidates permission and resets incompatible route |
| `C-STATUS-BANNER`        | `info`, `success`, `warning`, `error`, `offline`, `planned`; contains message and optional action            |
| `C-EMPTY-STATE`          | Plain explanation, one primary recovery action, optional secondary learning link                             |
| `C-SKELETON`             | Preserves final geometry; does not render false zero values while loading                                    |
| `C-ERROR-STATE`          | Human message, retry, stable support/error code; never exposes raw Firebase text to students                 |
| `C-LEARNER-ROW`          | Name, optional grade/context, private balance, goal status, selection control, permission-safe actions       |
| `C-BALANCE-CARD`         | Simulated balance label, context, last update; private by default                                            |
| `C-GOAL-CARD`            | Name, saved/target, percentage, checkpoint text, optional adult-only interest practice                       |
| `C-TRANSACTION-COMPOSER` | Mode, recipients, amount, reason, learning tags, effect preview, validation, submit state                    |
| `C-TRANSACTION-ROW`      | Earn/spend label, reason, amount, date, optional goal/reserve/spend tag; no peer identity in student view    |
| `C-LESSON-CARD`          | Band, strand, duration, title, objective summary, saved/prepared state                                       |
| `C-REFLECTION-PROMPT`    | Neutral question, optional response, skip option when disclosure could be sensitive                          |
| `C-PERMISSION-GUARD`     | Renders content, request-access explanation, or no-access state from capability—not role-name guessing       |
| `C-CONFIRM-DIALOG`       | Named object and consequence; typed confirmation only for account or multi-record irreversible deletion      |
| `C-SYNC-INDICATOR`       | `Saved`, `Saving`, `Queued offline`, `Needs attention`; never use a spinner indefinitely                     |

## 8. State and interaction rules

### 8.1 Required view states

Every data-backed screen must define:

1. `initial/loading` — skeleton or progress with accessible label;
2. `ready with data`;
3. `ready empty` — not a zero card pretending data loaded;
4. `permission denied` — explain the needed role/contact without leaking object existence;
5. `recoverable error` — retry;
6. `offline with cache` — show data timestamp and queue supported writes;
7. `offline without cache` — preserve navigation, explain unavailable content;
8. `submitting` — disable duplicate submission but preserve form;
9. `success` — visible confirmation and new state;
10. `conflict` — explain stale data and allow reload/review.

### 8.2 Transaction state machine

```text
DRAFT
  → VALIDATING
  → READY
  → SUBMITTING
      → COMMITTED
      → QUEUED_OFFLINE
      → FAILED_RETRYABLE
      → FAILED_PERMISSION
```

- Recipient count, per-recipient amount, total number of writes, and context are visible before submit.
- Amount is greater than zero, at most two decimal places, and converted to integer cents once.
- Reason is required and trimmed.
- `Earn` accepts optional goal or `Just in case`; `Spend` accepts optional `Need`, `Want`, or `It depends` and optional opportunity-cost reflection.
- A successful bulk action reports succeeded/failed counts. It must not say `Done` if any recipient failed.
- Offline queuing must use a client-generated idempotency key when implemented; retry must not create duplicate transactions.

### 8.3 Destructive behavior

- Archive is reversible and visually preferred over delete.
- Delete is never adjacent to a frequent transaction action without separation.
- A classroom with active students cannot be deleted.
- Removing the last super admin is blocked by the server and explained before submit.
- Account deletion lists what is deleted now, what school-managed records require school action, and what cannot be automatically removed.

## 9. Learning and child-safety content rules

- Always say choices can differ by context; do not hard-code a universal `right` need/want answer.
- Do not request family income, debt, savings, banking access, food/housing security, or purchasing limits.
- Do not label a student `good spender`, `bad spender`, `responsible`, or `irresponsible` from ledger behavior.
- Do not use streak loss, red shame states, confetti for spending, public ranks, or peer balances.
- Use fictional or classroom scenarios for financial hardship, interest, and reserves.
- Reflections evaluate explanation and calculation. They do not score personal preference.
- The student can skip a written reflection and answer orally to an authorized adult.
- Early-reader controls pair text with a familiar icon and optional text-to-speech; icon-only meaning is insufficient.

## 10. Accessibility contract (`LAUNCH_GATE` until verified)

- Web target: WCAG 2.1 AA behavior; native target: equivalent VoiceOver/TalkBack operability.
- Logical focus follows visual order. Opening a dialog moves focus to its title/first field; closing restores the invoking control.
- All inputs have persistent labels, instructions, errors, and programmatic associations.
- Dynamic success/error/offline messages use an appropriate live region without interrupting every balance update.
- Tables have headers and a small-screen card alternative; do not create horizontally scrollable data with hidden row identity.
- Support 200% browser zoom at 1280px and native text scaling to 200% without clipped controls or hidden actions.
- Reduced-motion preference disables celebratory/progress animation and parallax.
- Contrast, focus appearance, switch/checkbox state, and disabled state must be visually distinct.
- Screen readers announce simulated context, transaction type, signed amount, reason, date, and goal/category tag.
- Do not claim conformance until a documented manual pass covers all core flows on NVDA or VoiceOver for web, VoiceOver on iOS/iPadOS, and TalkBack on Android phone/tablet.

## 11. Privacy and trust contract

- Show the minimum student information needed for the task.
- Never place student names, balances, or transaction reasons in URLs, analytics payloads, push-notification bodies, crash-report breadcrumbs, or public support links.
- Student lists default to authorized scope and do not support cross-school discovery.
- Context switching clears selected student detail before loading the next context.
- Inactivity may lock sensitive student views according to the future security policy, but ordinary network transitions must not sign the user out.
- Trust links point to honestly labeled public drafts until legally and operationally finalized.
- Analytics, when adopted, uses coarse adult operational events and privacy-reviewed student learning events. No advertising IDs, cross-site trackers, public sharing pixels, or free-text transaction reasons.

## 12. Localization and formatting

- All displayed copy must be externalizable; do not concatenate translated fragments.
- Currency-like simulated values use the organization locale but remain labeled as simulated Sprout units in onboarding/help.
- Dates use locale-aware medium dates; times appear only when useful.
- Names preserve entered characters and are not assumed to split cleanly into Western first/last order in new UI work, even though the current schema contains both fields.
- Layouts support 30% longer labels without truncating primary actions. Truncation must expose the full value to assistive technology and a tooltip/semantic label where appropriate.

## 13. Cross-platform acceptance baseline

A screen is not complete until:

- the capability gate matches rules and repository behavior;
- all ten required view states are implemented or explicitly proven impossible;
- browser phone, browser tablet, laptop, and desktop layouts meet the web specification;
- iPhone, iPad, Android phone, and Android tablet layouts meet the mobile specification when the screen exists natively;
- keyboard-only, screen-reader, 200% text/zoom, reduced-motion, and contrast checks pass;
- child-safety copy rules pass;
- no marketing-planned capability is represented as current;
- automated tests cover main, empty, permission, error, and destructive paths proportional to risk.
