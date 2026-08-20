# 02 — Responsive Web Application Detailed Design

## 1. Web layout contract

### 1.1 Required browser widths

| Mode          |    Viewport |                    Outer gutter | Navigation                                    | Content behavior                                                      |
| ------------- | ----------: | ------------------------------: | --------------------------------------------- | --------------------------------------------------------------------- |
| `WEB-PHONE`   |   320–639px |                            20px | Top bar + modal drawer; no persistent sidebar | One column; actions wrap or move to overflow/bottom action region     |
| `WEB-TABLET`  |  640–1023px |                            32px | Top bar + modal drawer                        | One or two columns only when each remains at least 280px              |
| `WEB-LAPTOP`  | 1024–1279px |                            48px | 224px persistent sidebar                      | Master-detail permitted; dense admin tables remain readable           |
| `WEB-DESKTOP` |     1280px+ | 48px within 1280px max boundary | 224px persistent sidebar                      | Use remaining width; do not stretch text or cards beyond the boundary |

The application shell owns `100dvh`. Header, sidebar, and compact footer are fixed regions; the current route owns one vertical scroll region. Nested panes may scroll only in desktop master-detail layouts where both pane headers remain visible.

### 1.2 Shell anatomy

```text
Desktop/laptop
┌──────────────┬────────────────────────────────────────────┐
│ Brand        │ Context / role                 Account     │
│ Home         ├────────────────────────────────────────────┤
│ Classrooms   │ Page header + responsive actions           │
│ Students     │                                            │
│ Learn        │ Route content                              │
│ School       │                                            │
│ Trust        │                                            │
└──────────────┴────────────────────────────────────────────┘
┌──────────────── compact legal/support footer ──────────────┐

Phone/tablet
┌ Menu ─ Context / page ─ Account ┐
├──────────────────────────────────┤
│ Page header                      │
│ Single-column route content      │
└──────────────────────────────────┘
┌──── compact legal/support footer ─┐
```

- The desktop sidebar displays only destinations supported by the active role/context.
- The phone drawer traps focus, closes on Escape/scrim/close button, and restores focus to `Open navigation`.
- Page actions remain visible as text buttons when space permits. At `WEB-PHONE`, preserve the primary action and put secondary/rare actions under `More`.
- Browser Back must reverse in-app navigation. Filters and selected master-detail item belong in the URL query/path where practical.

## 2. Route inventory

Existing routes stay stable unless explicitly marked target-new.

| Screen ID      | Route                                                          | State                                                            | Access                               |
| -------------- | -------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------ |
| `W-AUTH-01`    | `/app/login` or current signed-out app boundary                | `CURRENT`                                                        | Signed out                           |
| `W-HOME-01`    | `/app`                                                         | `CURRENT`, expand                                                | All signed-in roles; content differs |
| `W-CLASS-01`   | `/app/classrooms/:contextId`                                   | `CURRENT`, expand                                                | Authorized classroom adults          |
| `W-CLASS-02`   | `/app/classrooms/:contextId/transactions/new`                  | `PLANNED` route, current single-recipient composer exists inline | `canRecordTransactions`              |
| `W-CLASS-03`   | `/app/classrooms/:contextId/students/:studentId`               | `CURRENT`, expand                                                | Authorized adults                    |
| `W-CLASS-04`   | `/app/classrooms/:contextId/roster`                            | `CURRENT`                                                        | `canManageRoster`                    |
| `W-CLASS-05`   | `/app/classrooms/:contextId/settings`                          | `CURRENT`                                                        | `canManageClassroomSettings`         |
| `W-CLASS-06`   | `/app/classrooms/:contextId/request-access`                    | `CURRENT`                                                        | Classroom owner                      |
| `W-SCHOOL-01`  | `/app/school`                                                  | `CURRENT`, expand                                                | School member; edit by capability    |
| `W-SCHOOL-02`  | `/app/school/staff[/:uid]`                                     | `CURRENT`                                                        | `canManageStaff`                     |
| `W-SCHOOL-03`  | `/app/school/requests`                                         | `CURRENT`                                                        | `canResolveAccessRequests`           |
| `W-SCHOOL-04`  | `/app/school/grades`                                           | `CURRENT`                                                        | `canManageGrades`                    |
| `W-SCHOOL-05`  | `/app/students` plus `/new`, `/import`, `/promote`, `/archive` | `CURRENT`                                                        | Admin/super admin                    |
| `W-LEARN-01`   | `/app/learn`                                                   | `PLANNED` authenticated surface; public curriculum is current    | Authorized adults and students       |
| `W-LEARN-02`   | `/app/learn/:lessonSlug/prepare`                               | `PLANNED`                                                        | Adult facilitator                    |
| `W-LEARN-03`   | `/app/learn/:lessonSlug/run`                                   | `PLANNED`                                                        | Adult facilitator                    |
| `W-FAMILY-01`  | `/app/family/:contextId`                                       | `PLANNED`                                                        | Future family manager                |
| `W-FAMILY-02`  | `/app/family/:contextId/children/:learnerId`                   | `PLANNED`                                                        | Future family manager                |
| `W-STUDENT-01` | `/app/me` or role-resolved `/app`                              | `CURRENT` balance/history, expand                                | Linked student self only             |
| `W-STUDENT-02` | `/app/me/goals`                                                | `PLANNED` route, goal data currently adult-facing                | Linked student self only             |
| `W-STUDENT-03` | `/app/me/learn`                                                | `PLANNED`                                                        | Linked student self only             |
| `W-DIST-01`    | `/app/district`                                                | `PLANNED`                                                        | Future district reviewer/admin       |
| `W-DIST-02`    | `/app/district/pilots/:pilotId`                                | `PLANNED`                                                        | Future district reviewer/admin       |
| `W-DIST-03`    | `/app/district/evidence`                                       | `PLANNED`                                                        | Future district reviewer/admin       |
| `W-TRUST-01`   | `/app/readiness`                                               | `PLANNED` authenticated index; public `/readiness` is current    | Authorized adult reviewers           |
| `W-ACCOUNT-01` | account menu and `/app/account/delete`                         | `CURRENT`                                                        | Signed in                            |

New routes must be feature-flagged until their required repository interfaces and rules exist. A route guard redirects only after showing a brief accessible reason, or renders a stable no-access page; it must not flash protected data.

## 3. Public website handoff

The existing marketing site remains responsive from 320px upward and keeps its current audience/curriculum/trust routes. Application changes are limited to these handoffs:

- Header `Log in` → auth with `returnTo` constrained to an internal allowlist.
- Educator lesson CTA → `/app/learn/:slug/prepare` after sign-in when that route becomes current; until then it remains the public lesson.
- Student lesson CTA → public student-safe lesson today; later `/app/me/learn?lesson=:slug` after sign-in.
- Family CTA remains a public lesson while family mode is planned. Do not show `Create family` in production before the data/rules prerequisite.
- District CTA remains `/readiness`; no sales checkout or procurement-ready claim.
- After authentication, preserve the source lesson/audience intent. Never preserve a full external URL in `returnTo`.

## 4. Global screen specifications

### `W-AUTH-01` — Sign in, create account, and claim access (`CURRENT`)

**Goal:** let an invited adult/student or self-serve adult authenticate without implying that authentication alone grants school access.

**Order:** brand → `Sign in`/`Create account` segmented choice → Google/Apple when configured → divider → email fields → submit → reset-password link → simulated-money/privacy note → public trust links.

**Behavior:**

- Create account requires email, password, confirmation, and adult/authorized-user notice. It does not ask a child to self-declare parental consent.
- After sign-in, run pending staff invite and student-link claims, then show `Setting up your access…` until both complete or return a recoverable error.
- No membership: adult sees `Start a standalone classroom` and `Ask your administrator for an invite`; a likely student sees neutral `Your school link is not ready` guidance, never a classroom-creation prompt based solely on age inference.
- Invalid provider configuration uses user-friendly copy and an internal error code.

**Responsive:** one 480px form column. On tablet/desktop an adjacent brand/learning panel may appear, but the form remains first in DOM order and no student data appears.

### `W-HOME-01` — Role-aware home (`CURRENT`, expand)

**Adult content order:** greeting + active role/context → one primary next action → operational attention cards → authorized classroom/family grid → `Continue learning` → readiness notice if applicable.

- Admin primary actions: `Add classroom`, `Add student`; attention includes pending access requests and incomplete grades/staff setup.
- Teacher/specialist primary action: reopen most recent classroom; do not show unauthorized creation actions.
- Family manager target: resume child conversation or record a family choice.
- District target: review pilot/readiness, never individual student balances by default.
- Student-only users bypass the adult dashboard and render `W-STUDENT-01`.

**Responsive:** classroom cards are 1 column phone, 2 tablet/laptop, 3 desktop. Metrics use a 2-column phone grid only if each card remains 136px wide; otherwise stack. Do not display a zero metric before its subscription finishes loading.

### `W-CLASS-01` — Classroom daily workspace (`CURRENT`, expand)

**Goal:** select one or many students, see private status, and begin a learning-connected action with minimal steps.

**Header:** breadcrumb `Home / {Classroom}`; title; grade chip; actions `Record for group` (primary), `Roster`, `Settings`, and owner-only `Request access` in overflow.

**Left/list region:** search; `Select all visible`; active student rows sorted by configured name order; each row includes name, private balance, top goal progress, and selected state. Archived students are absent.

**Right/detail region:** `W-CLASS-03` for one selection. For multiple selections, show group summary and `W-CLASS-02`. With no selection, show three neutral quick-start cards: `Record earn`, `Record spend`, `Open a lesson`.

**Permission behavior:** award-only staff can select and transact but cannot see roster/settings controls. Admin manage controls do not appear for teachers just because they own the school-affiliated classroom; preserve current rule behavior.

**Responsive:**

- `WEB-LAPTOP/DESKTOP`: 4/8 master-detail columns; list width 320–400px; independent pane scrolling.
- `WEB-TABLET`: list + detail only at 800px+ with at least 300px per pane; otherwise selection navigates to the student route.
- `WEB-PHONE`: list route first; selected student opens full-screen detail. Multi-select enables a sticky bottom bar `N selected · Record` above the legal footer.

### `W-CLASS-02` — Transaction composer (`PLANNED` extraction; target core)

**Step 1 — Recipients:** context name; selected chips/summary; search and selection if entered directly; `Entire active class` option; never include archived students.

**Step 2 — Action:** segmented `Earn` / `Spend`; amount labeled `Amount for each student`; required reason; optional reusable reason shortcuts owned by the context.

**Step 3 — Learning connection:**

- Earn: `No label`, a shared eligible goal only when semantically valid, or `Just in case`. Do not pretend different student goals are one goal; bulk goal allocation is disabled unless the goal template/mapping is explicitly supported.
- Spend: `Need`, `Want`, `It depends`, or no tag; optional `What are they choosing not to fund yet?` neutral prompt.
- Toggle `Ask a reflection after recording`; select one age-appropriate prompt or write an adult-only local prompt that is not included in analytics.

**Review:** `N students × $X.XX each`; effect preview per recipient; warnings for insufficient balance according to policy; context and creator; `Record N transactions`.

**Result:** success counts, failed rows with reason, retry failed only, and `Return to classroom`. Use batched/chunked writes with idempotency. Partial completion is not rolled back cosmetically.

**Responsive:** desktop uses 640–760px centered dialog or right pane; phone/tablet uses a full route with sticky review/submit footer and one step per screen when the keyboard would crowd content.

### `W-CLASS-03` — Adult student detail (`CURRENT`, expand)

**Header:** student name; private-view marker; rename/delete only with capability. **Hero:** balance card with simulated label and context.

**Sections in order:**

1. `Goals` — progress cards, create goal, delete with confirmation, adult-led interest practice.
2. `Quick choices` — store item chips prefill Spend; never auto-submit.
3. `Record` — single-recipient `C-TRANSACTION-COMPOSER` compact mode.
4. `History` — newest first, filters for all/earn/spend/goal/reserve, accessible transaction rows.
5. `Student access` — linked/pending/unlinked state and authorized invite actions.

When spending and an unfinished goal exists, show `This choice leaves less available for {goal}` as neutral information; never say the spend is wrong. Interest practice requests rate, shows the calculation and resulting amount, and records reason `Interest`. It must say this is a simplified simulation.

**Responsive:** desktop fits inside detail pane; tablet/phone becomes full route. Phone uses cards rather than a dense history table. Forms stack; two text inputs may share a row only at 480px+.

### `W-CLASS-04` — Roster (`CURRENT`)

**Header actions:** `Add student`; overflow `Import`, `Promote`, `Archive view` when the caller has school-wide capability.

**Body:** search/filter → selection controls → learner rows → contextual bulk bar. Bulk bar supports `Move`, `Archive`, and destructive `Delete`; add target `Record` only after `W-CLASS-02` is implemented.

- Archive is immediate only if undo is reliably available; otherwise confirm with reversible explanation.
- Delete names count and loss. For more than one learner, require typing `DELETE {count}` or an equivalent high-friction confirmation.
- A non-manager receives a no-access state, not an empty roster.

**Responsive:** desktop table/list with persistent header; phone card list and sticky selection bar. Selection remains when opening/closing bulk action but resets after context change or successful action.

### `W-CLASS-05` — Classroom settings and store (`CURRENT`)

Sections: `Basics` (name, grade), `Classroom store`, `Access summary`, `Danger zone`.

- Store rows: item name, price, edit, delete. Add/edit uses persistent labels and validates price > 0.
- Store copy calls it a `decision lab`, not a commerce checkout.
- Classroom delete is disabled with active students and links to roster remediation.
- On phone, edit opens a full-width sheet/form; do not compress item inputs and icon actions onto one row.

### `W-CLASS-06` — Request colleague access (`CURRENT`)

Show classroom, current owner, eligible active teacher members, requested access capability, and current request state. The requester may propose; an admin resolves. Existing grant/request rows prevent duplicates. Explain that school administrators control access.

## 5. School administration specifications

### `W-SCHOOL-01` — School overview (`CURRENT`, expand)

**Summary:** school name, NCES metadata when present, enabled grades, counts for active classrooms/students/staff, pending requests.

**Task cards:** `Staff & access`, `Grades offered`, `All students`, `Promote students`, `Archived students`, `Access requests`. Cards show capability and status, not just an icon.

**Implementation rhythm target:** an adult-only setup panel stores/displays a chosen practice location (morning meeting, classroom jobs, math, advisory), transaction norms, pilot start/end, and shared language. This is `PLANNED`; until a data contract exists, link to public learning guidance rather than save fake settings.

### `W-SCHOOL-02` — Staff and scoped access (`CURRENT`)

Desktop/laptop uses list-detail. Tablet/phone uses list then detail route.

Staff detail shows identity, role, scope, classroom grants, and provenance (`invited`, `active`). Controls mirror hierarchy:

- super admin can manage admins and teachers subject to last-super-admin invariant;
- admin can manage teachers only;
- teacher cannot open staff management;
- `own`, selected `grades`, or `whole school` scope has plain-language consequences before save;
- classroom grant is award-only unless rules/types are deliberately extended.

Pending invites are visually separate from active staff. Cancel invite is not the same as removing an active member.

### `W-SCHOOL-03` — Access requests (`CURRENT`)

Queue rows show requester, target, classroom, requested capability, created date, and reason if later supported. Detail explains resulting access. `Approve` and `Decline` require explicit action; optimistic UI must not remove a row until the server confirms. Empty copy: `No access requests need review.`

### `W-SCHOOL-04` — Grades offered (`CURRENT`)

Display PK–12 chips grouped `Early`, `Elementary`, `Middle`, `High`. Current public offering remains Pre-K–6; enabling a school grade is organizational metadata, not a claim that complete curriculum exists. Grades 7–12 show `Curriculum expansion` help text wherever lesson availability is shown.

### `W-SCHOOL-05` — School student operations (`CURRENT`)

All-student view includes search, grade/class filters, active/archived filter, selection, and columns/cards for name, school ID, grade, classroom, link status. Never show balance in the schoolwide roster by default; it is unnecessary for roster administration.

- `Add`: select classroom, identity fields, optional school ID.
- `Import`: upload CSV, map columns, preview `new/update/error`, correct or remove invalid rows, then chunked commit. No file is written until confirmation.
- `Promote`: choose source classroom/grade, select learners, choose destination, review count and changes, commit.
- `Archive`: choose leaving learners, explain retained history and restoration, commit.
- `Restore`: select archived learners and destination classroom.

On phone, column mapping and preview use stacked row cards; horizontal spreadsheet scrolling is not the sole interaction.

## 6. Learning specifications

### `W-LEARN-01` — Authenticated learning library (`PLANNED` UI over current content)

Use the existing eight `content.ts` lessons as the canonical baseline. Header includes `Learn` and honest `8 starter lessons · Pre-K–6`. Filters: grade band, strand, duration (`≤20`, `21–35`, `36–45`), and building block. Results use `C-LESSON-CARD`.

Adult cards offer `Prepare lesson`. Student cards offer `Start mission` only for the learner’s band and only when the lesson has a direct student mode; otherwise `Ask an adult to guide this lesson`. Family cards emphasize the family bridge.

No result copy distinguishes missing matches from loading. The 7–12 empty state says the complete secondary offering is planned.

### `W-LEARN-02` — Lesson preparation (`PLANNED`)

Sections follow the existing lesson contract exactly: objective, band/duration/strand/building block, vocabulary, materials, warm-up, mission steps, reflection, learning check, family bridge, product connection, inclusion guidance, framework note.

Adult preparation controls: choose authorized classroom/family; optional date; select product connection; `Print`; `Start guided lesson`. The app may store preparation only after a data contract exists. It must not copy sensitive free-form student data into lesson metadata.

### `W-LEARN-03` — Guided lesson (`PLANNED`)

Full-focus view with progress `Warm-up · Mission 1… · Reflect · Check · Family bridge`. Each step shows one instruction, optional large timer, and `Previous`/`Next`. Product-connected steps deep-link to the relevant classroom action with draft state preserved:

- balance/history;
- goal creation/progress;
- classroom store budget;
- need/want/depends tag;
- goal or just-in-case label;
- interest practice;
- opportunity-cost prompt.

Completion records only coarse facilitation metadata and optional educator notes after privacy review. It does not score a child’s personal decision.

## 7. Family specifications

### `W-FAMILY-01` — Family home (`PLANNED`)

Do not implement production writes until multi-context technical design is approved.

Target layout: family name/context → child cards with separate family balance/goal → `Notice a choice` primary action → recent family activity → family-friendly lessons. A persistent banner states `Family activity stays separate from school administration.`

Creation asks family display name, adult co-manager invites, and which already-linked learner identity to connect or how to invite a child. It never imports a classroom balance or history.

### `W-FAMILY-02` — Family child detail (`PLANNED`)

Reuses `W-CLASS-03` primitives with family language and narrower capability. Offers earn/spend/save/reflect, goals, just-in-case label, and family lesson bridges. It must not require chores, allowance, bank accounts, or purchases. Adult can choose `tokens`, `points`, or localized simulated currency label only if the underlying value remains non-redeemable and consistently described.

## 8. Student specifications

### `W-STUDENT-01` — Today/balance and history (`CURRENT`, expand)

**Hero:** greeting; context chip; `Your Sprout balance`; large private amount; `Practice money—not real money.`

**Next:** current goal progress; last three transactions; neutral reflection prompt; `See all history`. If multiple contexts later exist, explicit tabs/cards switch contexts and never show a combined amount.

Early-reader mode uses shorter copy, optional read-aloud controls, recognizable earn/spend icons with text, and no dense table. Grades 3–6 see signed amount, reason, date, and learning tag. The student cannot modify ledger entries.

### `W-STUDENT-02` — Goals (`PLANNED` student presentation)

Show active and achieved goals, saved/target, amount remaining, and next checkpoint. A student may propose a goal name/target only if adult approval behavior is designed; otherwise creation remains adult-only. Spending previews how the goal trail changes without blocking the choice or applying shame.

### `W-STUDENT-03` — Learn (`PLANNED`)

Shows age-appropriate missions, `Pause · Choose · Grow` framing, optional reflection, and adult-help affordance. It never asks the student to disclose family finances. Lesson completion is private to the learner and authorized adult context.

## 9. District and readiness specifications

### `W-DIST-01` — District direction (`PLANNED`)

Adult-only, aggregate-first view. Sections:

1. Grade-band progression (Pre-K–6 available for review; 7–12 planned).
2. Instructional priorities and a small set of pilot outcomes.
3. Selected schools/cohort.
4. Readiness domains: privacy, accessibility, interoperability, support, curriculum, security.
5. `Create bounded pilot` only after launch gates permit.

No individual student records or public ranking. Until real district authorization/data contracts exist, the authenticated view is read-only review content derived from the public readiness source.

### `W-DIST-02` — Pilot workspace (`PLANNED`)

Displays scope, dates, participating schools/grades, data responsibility owner, training status, success measures, and gate checklist. Editing requires future district capability. A gate with incomplete legal/privacy/accessibility status prevents `Start pilot` and links to the exact unresolved item.

### `W-DIST-03` — Evidence review (`PLANNED`)

Aggregate cards: participation, learning artifacts reviewed, educator workload feedback, accessibility findings, family feedback, and student reflection themes. Suppress small cohorts according to a future privacy threshold. No school/student ranking and no inference from transaction volume alone. Export is disabled until privacy review and contractual authority are implemented.

### `W-TRUST-01` — Readiness and trust (`PLANNED` authenticated index)

Mirrors public honesty with `Working`, `Planned`, and `Launch gate` columns. Links to Privacy, Terms, Cookies, Support, accessibility status, security contact, DPA, retention, and subprocessor materials only when they exist. Drafts remain visibly dated drafts.

## 10. Account and global utilities

### `W-ACCOUNT-01` — Account menu/settings (`CURRENT`, expand)

Menu order: active role/context; switch role/context; profile identity; support/trust; sign out; delete account separated in danger section.

Account deletion screen must distinguish:

- Firebase user/account data that can be deleted now;
- school-managed education records that require verified school/district handling;
- pending invites/links and memberships;
- consequences for classrooms or super-admin invariants.

The current delete implementation must be reverified against this explanation before public launch.

## 11. Web-specific quality acceptance

For every changed route, test at 320×568, 390×844, 768×1024, 1024×768, 1280×800, and 1440×900, plus 200% zoom at 1280×800.

Required automated coverage:

- direct/deep route and browser Back behavior;
- allowed and denied capability cases;
- loading, empty, error, and offline banners;
- drawer and dialog focus management;
- transaction validation and double-submit prevention;
- bulk partial failure and retry;
- no balance leakage into schoolwide/district default views;
- student-only navigation isolation;
- public `returnTo` allowlist and lesson handoff;
- feature-flag behavior for planned routes.
