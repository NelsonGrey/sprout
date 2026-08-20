# 03 — Native iOS and Android Application Detailed Design

## 1. Platform and form-factor contract

The Flutter application is one codebase but four independently accepted products: iPhone, iPad, Android phone, and Android tablet. Platform parity means equivalent capability and safety, not pixel-identical controls.

| Mode                    | Logical width | Navigation                                                | Primary content pattern                                              |
| ----------------------- | ------------: | --------------------------------------------------------- | -------------------------------------------------------------------- |
| `NATIVE-PHONE`          |          <600 | Top app bar + role-aware bottom navigation with 2–5 items | One route at a time; sheets for short choices, full routes for forms |
| `NATIVE-TABLET-COMPACT` |       600–839 | 80px navigation rail                                      | Two-pane only when each pane remains ≥280px                          |
| `NATIVE-TABLET`         |      840–1199 | 224–240px extended navigation rail                        | Master-detail for classroom/staff/roster; centered bounded forms     |
| `NATIVE-WIDE`           |         ≥1200 | 240px extended rail within 1280px content boundary        | Master-detail plus contextual side panel where justified             |

Use existing `SproutLayout` thresholds and gutters. Width, not device name, controls layout. Orientation changes preserve active role, context, selection, form text, scroll anchor where feasible, and queued transaction state.

## 2. Native conventions

### Shared

- Minimum target is 48×48 logical pixels; place at least 8px between targets.
- Respect system safe areas, display cutouts, split-screen, floating keyboard, and edge-to-edge navigation insets.
- Use the existing Material 3 semantic theme and platform-adaptive dialogs/pickers where Flutter supports them accessibly.
- System Back dismisses keyboard → sheet/dialog → child route → parent route in that order. It never discards a dirty form without confirmation.
- A pull-to-refresh is optional for collection screens but never the only retry control.
- Deep links validate auth and capability before resolving. Protected content must not flash.

### iOS/iPadOS

- Back affordance follows navigation title conventions and interactive back gesture unless a dirty form requires confirmation.
- Apple Sign-In is shown only when configured and supported; configuration errors do not appear as generic invalid credentials.
- VoiceOver rotor order follows title, status, primary content, primary action, secondary content.
- Prefer Cupertino date/time picker behavior when a date is genuinely required, while retaining the Sprout visual system.

### Android

- Predictive Back returns a preview to the correct parent route and does not exit from a child form unexpectedly.
- TalkBack traversal and switch access must reach every interactive element.
- Android system share is not exposed for student records, balances, transaction history, or screenshots.

## 3. Navigation and deep-link map

Current `go_router` routes remain compatible. Target routes may be added behind feature flags.

| Screen ID      | Native route                                                              | State                                                             |
| -------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `M-AUTH-01`    | `/login`                                                                  | `CURRENT`                                                         |
| `M-HOME-01`    | `/`                                                                       | `CURRENT`, expand                                                 |
| `M-CLASS-01`   | `/classrooms/:contextId`                                                  | `CURRENT`, expand                                                 |
| `M-CLASS-02`   | `/classrooms/:contextId/transactions/new`                                 | `PLANNED` mass composer; single transaction is current            |
| `M-CLASS-03`   | `/classrooms/:contextId/students/:studentId`                              | `CURRENT`, expand                                                 |
| `M-CLASS-04`   | `/classrooms/:contextId/roster`                                           | target route; mobile bulk screens currently exist at school level |
| `M-CLASS-05`   | `/classrooms/:contextId/settings`                                         | target separation; current detail screen contains mixed controls  |
| `M-SCHOOL-01`  | `/school`                                                                 | `CURRENT`                                                         |
| `M-SCHOOL-02`  | `/school/staff/:uid?`                                                     | current within school screen; target deep link                    |
| `M-SCHOOL-03`  | `/school/requests`                                                        | current within school flow; target deep link                      |
| `M-SCHOOL-04`  | `/school/grades`                                                          | current within school flow; target deep link                      |
| `M-SCHOOL-05`  | `/students`, `/students/import`, `/students/promote`, `/students/archive` | `CURRENT` code; verify runtime parity                             |
| `M-LEARN-01`   | `/learn`                                                                  | `PLANNED` native curriculum surface                               |
| `M-LEARN-02`   | `/learn/:lessonSlug/prepare`                                              | `PLANNED`                                                         |
| `M-LEARN-03`   | `/learn/:lessonSlug/run`                                                  | `PLANNED`                                                         |
| `M-FAMILY-01`  | `/family/:contextId`                                                      | `PLANNED`                                                         |
| `M-FAMILY-02`  | `/family/:contextId/children/:learnerId`                                  | `PLANNED`                                                         |
| `M-STUDENT-01` | role-resolved `/` or `/me`                                                | `CURRENT` balance/history, expand                                 |
| `M-STUDENT-02` | `/me/goals`                                                               | `PLANNED`                                                         |
| `M-STUDENT-03` | `/me/learn`                                                               | `PLANNED`                                                         |
| `M-DIST-01`    | `/district`                                                               | `PLANNED`; tablet-first review, read-only phone fallback          |
| `M-TRUST-01`   | `/readiness`                                                              | `PLANNED` native index linking to public documents                |
| `M-ACCOUNT-01` | `/account`; `/account/delete` current                                     | `CURRENT`, expand                                                 |

## 4. Role-aware navigation

### 4.1 Adult phone bottom navigation

Use at most five destinations. Hide unsupported destinations rather than disabling them.

| Role/context          | Items in order                                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Teacher/specialist    | `Home`, `Classrooms`, `Learn`, `Account`                                                                                               |
| School admin          | `Home`, `Classrooms`, `Students`, `School`, `Account`; `Learn` is reachable from Home/Classroom overflow if five-item limit is reached |
| Family manager target | `Home`, `Family`, `Learn`, `Account`                                                                                                   |
| District target       | `Overview`, `Pilots`, `Evidence`, `Readiness`, `Account`                                                                               |
| Student               | `Today`, `History`, `Goals`, `Learn`; account access in app-bar avatar                                                                 |

Selection survives nested routes: student ledger keeps `Classrooms` active; staff detail keeps `School` active.

### 4.2 Tablet rail

Rail displays the same destinations plus a context switcher at the top and account at the bottom. At 600–839px it uses icon + semantic label announced to assistive technology; at 840px+ labels remain visible. A badge may show pending access requests, never student performance.

### 4.3 Context switcher

Phone: title-area button opens a full-height bottom sheet with role groups and context rows. Tablet: rail popover/panel. Each row says context type, name, organization, and role. Changing context clears selected learner and returns to that context’s home.

## 5. Global native screen specifications

### `M-AUTH-01` — Sign in/create/claim (`CURRENT`)

Match `W-AUTH-01` fields, states, and claim behavior. The screen is a centered form at max 480px.

- Phone: single scroll view with keyboard-safe bottom padding; primary button remains reachable without obscuring fields.
- Tablet: form and optional learning illustration/text panel in landscape; form remains first in semantic order.
- Password reveal has label `Show password`/`Hide password` and does not move focus.
- After auth, pending staff and student claims finish before role routing. If both roles exist, enter adult work mode and expose role switcher.
- Apple/Google provider buttons follow platform availability. Email/password remains available.

### `M-HOME-01` — Role-aware home (`CURRENT`, expand)

Same content priority as `W-HOME-01`, optimized for one-thumb scanning.

**Phone:** greeting and context → primary task button → horizontal or 2-column attention cards → classroom/family cards → learning card. Do not create a horizontally scrolling classroom carousel that hides total scope; use a vertical list or grid.

**Tablet:** rail + 2/3-column card grid. In landscape, `Needs attention` may occupy a 320px right column if the main classroom area stays ≥560px.

Student-only role renders `M-STUDENT-01`, never adult home.

### `M-CLASS-01` — Classroom daily workspace (`CURRENT`, redesign target)

**Phone anatomy:**

1. app bar: classroom name, grade, overflow;
2. search field;
3. action row: `Select`, `Record for group`, `Open lesson` according to capability;
4. active learner list with private balance and goal cue;
5. after selection, anchored bottom action bar `N selected · Record`.

Tapping a learner opens `M-CLASS-03`. Long press is not required for selection; `Select` exposes checkboxes. Back exits selection before leaving the classroom.

**Tablet anatomy:** rail → learner list 320–380px → selected learner detail. At compact portrait width, detail is a child route. Group selection replaces the detail pane with `M-CLASS-02` summary.

Daily view excludes rename, delete, roster deletion, and store catalog editing. Overflow links to Roster, Settings, and owner-only Request access based on capability.

### `M-CLASS-02` — Individual and mass transaction composer (`PLANNED` mass; target core)

Use the same validation/state machine as `W-CLASS-02`.

**Phone flow:** three pages in one restorable draft:

1. `Who` — selected learners or entire class;
2. `What happened` — Earn/Spend, amount each, reason, learning tag;
3. `Review` — recipient count, per-recipient effect, reflection option, submit.

The page title says `Record earn` or `Record spend` after mode is chosen. Primary bottom action uses `Continue` then `Record N transactions`. Keyboard action advances fields, not submits without review.

**Tablet:** composer occupies detail pane or a 640px modal sheet with recipient list visible beside fields. Review never obscures the recipient count.

**Offline:** supported writes show `Queued offline` with local time and a persistent sync indicator. Until idempotent queue behavior is tested, disable offline submission with honest `Reconnect to record this transaction`; do not imply success.

### `M-CLASS-03` — Adult learner ledger (`CURRENT`, expand)

**Phone:** large balance card → goal cards → quick store choices → transaction composer entry buttons → history → student-account link status. Separate `Record earn` and `Record spend` open the composer with mode preselected.

**Tablet:** balance/goals/actions in right detail pane; history scrolls beneath. Settings/access actions remain capability-gated in overflow.

Target additions needed for mobile marketing parity:

- goals create/progress/achieved presentation;
- goal or just-in-case earn tagging;
- need/want/depends spend tagging;
- classroom store shortcuts;
- adult-led interest practice with visible calculation;
- opportunity-cost reminder when an unfinished goal exists;
- student link pending/linked/unlinked states.

Do not combine these into a single giant form. Default shows balance/history; actions open focused sheets/routes.

### `M-CLASS-04` — Classroom roster (`PARTIAL` target organization)

Phone list has search, `Select`, `Add`, and overflow for Import/Promote/Archived when permitted. Selection bar offers Move, Archive, Record target, and Delete. Tablet uses list-detail or table-like rows while preserving 48px targets.

The existing school-level bulk mobile screens and repository methods should be reused, not rewritten. Verify selection, chunking, error reporting, and tests before labeling `CURRENT` parity.

### `M-CLASS-05` — Classroom settings/store (`PARTIAL` target separation)

Sections match web: Basics, Store, Access summary, Danger zone. Phone uses separate subroutes or sheets for edit forms; tablet uses a right detail pane. Deletion stays disabled until no active students. Store purchase is not made from this screen; catalog management and student spend remain separate.

## 6. School administration screens

### `M-SCHOOL-01` — School overview (`CURRENT`)

Phone task list: Staff, Grades, Students, Promotion, Archive, Requests. Summary metrics appear only after loading. Tablet uses rail plus two-column dashboard and may keep selected task open in a detail pane.

The planned school rhythm content links to `Learn` until a reviewed persistence model exists.

### `M-SCHOOL-02` — Staff and access (`CURRENT`)

Phone list → detail; tablet master-detail. Scope editing presents three radio choices with consequences:

- `Own classrooms only`
- `Selected grades` + grade chips
- `Whole school` + overbreadth warning

Role options reflect hierarchy. Pending invites remain a separate section. Removing a member and cancelling an invite are different actions/copy. Classroom grants list classroom name and `Can record transactions`; do not label an award grant `Manage`.

### `M-SCHOOL-03` — Access requests (`CURRENT`)

Phone cards show requester → target, classroom, capability, age of request; detail/review sheet includes Approve and Decline. Tablet uses queue + detail. Server confirmation is required before removal from queue.

### `M-SCHOOL-04` — Grades (`CURRENT`)

Use wrapping filter chips with PK–12 grouping. At large text size, chips become a vertical checkbox list. Explain that enabled grade metadata does not mean all curriculum bands are complete.

### `M-SCHOOL-05` — Student operations (`CURRENT` code; verify)

- `Students`: search/filter/card list, selection mode.
- `Import`: native file picker → CSV mapping → preview cards → confirm. Import never begins at file selection.
- `Promote`: source → learners → destination → review.
- `Archive`: learners → retention explanation → confirm; Restore requires destination.
- `Delete`: destructive confirmation and exact partial-failure result.

Tablet keeps filter/list and operation detail visible side by side. Phone preserves a draft when navigating backward between steps.

## 7. Learning screens

### `M-LEARN-01` — Learning library (`PLANNED`)

Content and filters match web. Phone uses a filter sheet and vertical cards. Tablet uses a 240–280px filter rail plus 2-column cards. Download/print is not required natively; `View printable version` opens the canonical public lesson in the system browser without student identifiers.

Student mode limits content to age-appropriate direct missions. Adult mode shows all Pre-K–6 starter lessons.

### `M-LEARN-02` — Prepare lesson (`PLANNED`)

Phone uses collapsible but semantically ordered sections; objective/materials/warm-up are initially expanded. Sticky bottom `Start guided lesson`. Tablet uses a lesson outline on the left and reading panel on the right.

Adult selects classroom/family and product connection. This selection becomes ephemeral route state until a persistence contract is approved.

### `M-LEARN-03` — Guided lesson (`PLANNED`)

Designed for a teacher holding a phone or placing a tablet where a small group can see it.

- One instruction per page with large type and optional timer.
- `Previous`, progress label, `Next`; no swipe-only navigation.
- `Open activity` deep-links into goal/store/transaction functionality and returns to the exact lesson step.
- Reflection questions include `Discuss aloud` and `Skip`; student free text is not required.
- Screen remains awake only during an actively started lesson and only with a visible user-controlled setting.

## 8. Family screens

### `M-FAMILY-01` — Family home (`PLANNED`)

Production implementation is blocked on the multi-context technical design.

Phone: context header → separate child cards → `Notice a choice` → recent activity → family bridge lesson. Tablet: child list + selected detail. Persistent message: `Family activity stays separate from school.`

Invite a co-manager or child only after family-specific rules, consent/authority, link claim, and deletion/export behavior exist. Do not reuse school admin invitation semantics blindly.

### `M-FAMILY-02` — Child in family (`PLANNED`)

Uses the same ledger/goal primitives with family vocabulary. Adult chooses a neutral real-life or fictional choice, may record simulated units, and can use Notice/Wonder/Try again prompts. No workflow requires allowance, chores, bank data, real prices, or evidence of what a family can afford.

## 9. Student screens

### `M-STUDENT-01` — Today and private history (`CURRENT`, expand)

**Phone:**

1. greeting/context;
2. large private simulated balance;
3. primary goal trail;
4. most recent change with Earned/Spent text;
5. `Pause · Choose · Grow` prompt;
6. recent history and `See all`.

**Tablet:** balance + goal in first column, history in second. Do not fill space with peer or class comparison.

Pre-K–2 presentation uses short sentences, text + icons, optional read aloud, and adult-guided `What happened?` prompts. Grades 3–6 include signed amounts, reason, date, tags, and arithmetic. A linked student remains strictly read-only.

Push notifications are off by default and not part of this design. If later added, notification text must not include student name, balance, transaction reason, or school.

### `M-STUDENT-02` — Goals (`PLANNED` presentation)

Active goal cards show target, saved, remaining, checkpoints, and how a proposed spend changes the trail. Achievement is derived from saved ≥ target. The UI does not encourage endless accumulation or display public streaks.

### `M-STUDENT-03` — Student missions (`PLANNED`)

Age-filtered lesson missions use the existing content. The student may complete a choice/reflection privately or with an adult; no score ranks personal preference. `Ask an adult` is always available.

## 10. District and trust on native devices

### `M-DIST-01` — District review (`PLANNED`)

Tablet is the primary native design: progression, selected pilot, readiness checklist, aggregate evidence. Phone provides a readable review and directs complex configuration to the responsive web app. This is a usability decision, not an authorization difference.

No district route appears until district identity, selected-school authorization, aggregation privacy, and data contracts exist. A public-readiness wrapper is not a district admin implementation.

### `M-TRUST-01` — Readiness and trust (`PLANNED` index)

Native index labels each artifact Working/Planned/Launch gate and opens canonical HTTPS public pages in the system browser. It never bundles stale legal text in the app binary as the source of truth.

## 11. Account and deletion

### `M-ACCOUNT-01` — Account (`CURRENT`, expand)

Shows identity, active role/context, role/context switcher, support/trust links, sign out, and separated account deletion.

Deletion copy follows `W-ACCOUNT-01`. Reauthentication is required only where Firebase or policy requires it; ordinary transactions never trigger it. A failed deletion leaves the account signed in when safe and provides an exact retry/support path.

## 12. Native reliability and accessibility acceptance

For every changed screen, manually test:

| Platform | Phone                                                                  | Tablet                                                             |
| -------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Apple    | current small iPhone portrait/landscape; current large iPhone portrait | 11-inch iPad portrait/landscape and split view at 1/2 width        |
| Google   | 360×800 and 412×915 logical phone; portrait/landscape                  | 800×1280 and 1280×800 logical tablet; split-window where supported |

Also test:

- text scale 100%, 150%, and 200%;
- VoiceOver/TalkBack full core flow without touch exploration guesswork;
- external keyboard Tab/Shift-Tab/Enter/Escape on tablets;
- Wi-Fi → cellular → offline → online during an open composer;
- app background/foreground during a dirty form and queued write;
- rotation/split view with selected learners and lesson progress;
- system Back/predictive Back and iOS back gesture;
- keyboard covering the final field or submit action;
- permission removal while a detail screen is open;
- account switch/context switch clearing sensitive selections;
- no overflow, clipped actions, or inaccessible horizontal-only tables.

Automated Flutter tests must cover phone and tablet constraints separately, not only pump the default 800×600 test surface.
