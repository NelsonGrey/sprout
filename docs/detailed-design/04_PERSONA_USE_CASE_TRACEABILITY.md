# 04 — Persona and Use-Case Traceability

## 1. How to read this document

This is the completeness contract between public marketing and the application. A future implementation chat must name the use-case IDs it is implementing and update neither marketing nor feature-state labels unless the corresponding acceptance criteria are verifiably true.

`W-*` references responsive-web screens in [02_RESPONSIVE_WEB_APP.md](02_RESPONSIVE_WEB_APP.md). `M-*` references native screens in [03_NATIVE_MOBILE_APPS.md](03_NATIVE_MOBILE_APPS.md).

## 2. Marketing audience outcome coverage

| Persona             | Marketed outcome            | Application realization                                                                | State                                                              |
| ------------------- | --------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| District leadership | A coherent progression      | `W-DIST-01`, `M-DIST-01`, `W-LEARN-01`: show Pre-K–6 progression and mark 7–12 planned | `PLANNED`                                                          |
| District leadership | Implementation visibility   | `W-DIST-02/03`: bounded pilot and aggregate evidence without student ranking           | `PLANNED`                                                          |
| District leadership | Procurement honesty         | `W-TRUST-01`, `M-TRUST-01`: Working/Planned/Launch gate status by domain               | Public readiness `CURRENT`; authenticated view `PLANNED`           |
| School leadership   | Less roster friction        | `W/M-SCHOOL-05`, `W/M-CLASS-04`: add/import/move/promote/archive/restore               | Web `CURRENT`; native code present, runtime parity to verify       |
| School leadership   | Roles that fit real schools | `W/M-SCHOOL-02/03`, `W/M-CLASS-06`: hierarchy, scope, award grants, requests           | `CURRENT`                                                          |
| School leadership   | A teachable culture         | `W/M-LEARN-*`, planned school rhythm panel, learning-connected transactions            | Learning surface `PLANNED`; web mechanics `PARTIAL`                |
| Educators           | Ready-to-use learning       | `W/M-LEARN-01/02/03`: prepare and guide all eight lesson contracts                     | Public lessons `CURRENT`; app facilitation `PLANNED`               |
| Educators           | Fewer repetitive actions    | `W/M-CLASS-01/02/04`: selection, entire class, mass transaction, roster bulk work      | Roster bulk `CURRENT/PARTIAL`; mass transaction `PLANNED`          |
| Educators           | Practice, not prizes alone  | `W/M-CLASS-02/03`: goal/reserve/spend category/opportunity-cost/reflection             | Web `CURRENT/PARTIAL`; native `PLANNED` parity                     |
| Families            | Simple conversation prompts | `W/M-LEARN-01/02`: family bridge surfaced independently of account mode                | Public content `CURRENT`; authenticated family view `PLANNED`      |
| Families            | A child’s-eye view          | `W/M-STUDENT-01/02`: private balance/history/goals and reasoning                       | Balance/history `CURRENT`; complete goals/reflection `PLANNED`     |
| Families            | Room for different families | Family detail and lessons never require allowance, income, banking, or purchases       | Design `REQUIRED`; family production `PLANNED`                     |
| Students            | Know what happened          | `W/M-STUDENT-01`: private balance and transaction history                              | `CURRENT`                                                          |
| Students            | Grow toward a goal          | `W/M-STUDENT-02` plus adult `W-CLASS-03`; checkpoint trail                             | Web adult goal mechanic `CURRENT`; student/native parity `PLANNED` |
| Students            | Choose without fear         | `W/M-STUDENT-03`, neutral spend/reflection preview                                     | `PLANNED` app surface; copy rules apply now                        |

## 3. Marketed three-step workflow coverage

### 3.1 District: Set direction → Pilot with boundaries → Review evidence

| Step                       | Screen        | Required interaction                                                          | Completion evidence                                                |
| -------------------------- | ------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Set the learning direction | `W/M-DIST-01` | Select grade bands, instructional priorities, and 1–5 outcomes                | Saved, versioned direction with owner; Pre-K–6/7–12 status visible |
| Pilot with boundaries      | `W-DIST-02`   | Select schools/cohort, dates, responsibilities, training, and gates           | Pilot cannot start with unresolved blocking gates                  |
| Review evidence            | `W/M-DIST-03` | Review participation, artifacts, workload, accessibility, and family feedback | Aggregate evidence with privacy threshold and no student ranking   |

All three are `PLANNED`. Until district authorization and data contracts exist, the app may only link to public readiness review.

### 3.2 School: Define rhythm → Set access thoughtfully → Listen and adjust

| Step                     | Screen                                | Required interaction                                                                    | Completion evidence                                         |
| ------------------------ | ------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Define the school rhythm | `W/M-SCHOOL-01`, `W/M-LEARN-01`       | Choose integration point and shared earn/plan/save/spend/reflect language               | `PLANNED` persistence; guidance link may ship now           |
| Set access thoughtfully  | `W/M-SCHOOL-02/03`, `W/M-CLASS-06`    | Assign narrowest role/scope/grant and review requests                                   | Server rules and UI show only authorized classrooms/actions |
| Listen and adjust        | `W/M-LEARN-03`, future pilot evidence | Capture educator reflection and coarse participation, not transaction volume as success | `PLANNED`; privacy-reviewed evidence model required         |

### 3.3 Educator: Name the choice → Let students decide → Reflect without shame

| Step                  | Screen                           | Required interaction                                           | Completion evidence                                              |
| --------------------- | -------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------- |
| Name the choice       | `W/M-CLASS-02`, `W/M-LEARN-03`   | Choose Earn/Spend/Save/Wait/Compare/Plan language and a reason | Transaction or lesson step uses explicit neutral vocabulary      |
| Let students decide   | `W/M-CLASS-03`, student mode     | Present bounded store/goal/spend options; do not auto-submit   | Student/adult can review effect before recording                 |
| Reflect without shame | `W/M-CLASS-02`, `W/M-STUDENT-03` | Ask what happened/next attempt; allow oral/skip                | No character grade, peer comparison, or forced family disclosure |

### 3.4 Family: Notice → Wonder → Try again

| Step      | Screen                                | Required interaction                                          | Completion evidence                                         |
| --------- | ------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| Notice    | `W/M-FAMILY-01/02`                    | Adult points out a choice without assigning judgment          | Optional neutral choice draft                               |
| Wonder    | `W/M-FAMILY-02`, family lesson bridge | Ask what matters, what can wait, what would change the choice | Oral/optional response; no financial disclosure requirement |
| Try again | `W/M-FAMILY-01/02`                    | Record or discuss another low-stakes attempt                  | Separate family history; no school-ledger mutation          |

All family production behavior is `PLANNED` pending multi-context design.

### 3.5 Student: Pause → Choose → Grow

| Step   | Screen                                            | Required interaction                                              | Completion evidence                                 |
| ------ | ------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------- |
| Pause  | `W/M-STUDENT-01/03`                               | Compare what is wanted now and later                              | Student-safe prompt, optional read aloud            |
| Choose | `W/M-STUDENT-03`, adult-facilitated `CLASS-02/03` | Select a bounded option and explain reasoning                     | Effect preview before adult-authorized ledger write |
| Grow   | `W/M-STUDENT-01/02`                               | Review outcome, goal progress, and decide to continue/change plan | Private history and neutral reflection              |

## 4. Marketing FAQ and boundary coverage

| Marketing question/promise                      | In-product requirement                                                                        | Verification                                                          |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Can this serve the whole district?              | District pages label complete district controls and secondary curriculum as planned           | No active district provisioning route without future capability flag  |
| Does Sprout claim FERPA/COPPA certification?    | Trust/readiness never uses certification language; legal materials remain status/date labeled | Content assertion test for prohibited claims                          |
| Can schools start smaller?                      | Pilot design accepts one classroom or school and a bounded cohort                             | Pilot validation permits small scope; no district-wide minimum        |
| Is this a PBIS replacement?                     | Onboarding/help says financial-capability practice, not discipline system                     | No discipline incident, punishment, demerit, or behavior-risk UI      |
| What does a principal manage?                   | School overview links setup, grades, staff, scopes, rosters, and year transitions             | Capability tests for admin and teacher                                |
| What will staff need?                           | Learn/school guidance offers short routine and shared language                                | No required daily lesson completion gate for transactions             |
| Do educators need a separate curriculum period? | Lesson durations 15–45 minutes and quick classroom loop are both supported                    | Library duration filter; transaction path works outside lesson runner |
| Is the money real?                              | Balance and composer use simulated-money copy; no payment/bank terminology                    | Copy test and design review                                           |
| Can specialists participate?                    | Grade/school scope and classroom grant expose only assigned classes and award action          | Rules query tests + role UI tests                                     |
| Must families pay for chores?                   | Family flows support fictional/time/token choices and never require allowance                 | Required-field tests contain no real-money/allowance field            |
| Are school and home balances mixed?             | Context switcher and balance card show one context; no combined total                         | Multi-context contract tests when built                               |
| How do families avoid money anxiety?            | Prompts are optional/context-respectful; no family-resource disclosure                        | Content review and student/family tests                               |
| Is Sprout money real money?                     | Student hero says practice/simulated, not real money                                          | Student copy assertion                                                |
| What if a student regrets a choice?             | History and reflection offer a next-plan action without reversal shame                        | Reflection copy assertion; no negative character label                |
| Can other students see a balance?               | Student route is self-scoped; adult lists are authorized and private; no peer/student list    | Firestore rules and student navigation tests                          |

## 5. Detailed use-case catalog

### District and readiness

#### `UC-DIST-01` — Review learning progression (`PLANNED`)

- **Actor:** `P-DIST-EXEC` or `P-DIST-CURR`.
- **Precondition:** authenticated future district reviewer has selected an authorized district; no student-level permission implied.
- **Main flow:** open Overview → compare grade bands/building blocks → inspect current Pre-K–6 lessons → see 7–12 expansion labels → choose draft priorities.
- **Alternates:** no district role routes to public readiness; incomplete curriculum never appears as zero progress.
- **Acceptance:** current/planned status is visible on every band; no individual student data; selection is not saved until a reviewed district repository exists.

#### `UC-DIST-02` — Define a bounded pilot (`PLANNED`, `LAUNCH_GATE`)

- **Actor:** district lead with future pilot-management capability.
- **Main flow:** create pilot → select schools/grades/cohort → set dates/outcomes → assign privacy/training/accessibility owners → review blockers → start.
- **Alternates:** any blocking gate prevents start and names remediation; cancel leaves an auditable draft.
- **Acceptance:** one-school pilot is allowed; no student data is ingested merely by creating a draft; gate state comes from authoritative readiness data.

#### `UC-DIST-03` — Review pilot evidence (`PLANNED`)

- **Main flow:** select pilot/time range → review participation, artifacts, workload, accessibility, family feedback → compare to agreed measures → record continue/adjust/stop decision.
- **Acceptance:** privacy threshold suppresses small groups; transaction count is not labeled learning; no school/child ranking; export requires authority.

#### `UC-DIST-04` — Review procurement readiness (`CURRENT` public / `PLANNED` app)

- **Main flow:** open readiness → inspect Working/Planned/Launch gate domains → open dated source artifact → return with state preserved.
- **Acceptance:** no FERPA/COPPA certification or accessibility-conformance claim; missing artifacts say missing; no dead purchase CTA.

### School leadership and operations

#### `UC-SCHOOL-01` — Create/configure school (`CURRENT`)

- **Actor:** new school founder/super admin.
- **Main flow:** find NCES school or enter name → confirm identity → create school → choose grades → arrive at school overview.
- **Alternates:** lookup miss supports manual entry; duplicate/permission error preserves form; creation creates the first super admin atomically per current rules.
- **Acceptance:** school is never left without a super admin; NCES data is informational; enabled grades do not imply curriculum availability.

#### `UC-SCHOOL-02` — Invite and scope staff (`CURRENT`)

- **Actor:** super admin/admin within hierarchy.
- **Main flow:** Add staff → enter email/metadata → select allowed role → set own/grades/school scope for teacher → review consequence → invite → pending invite appears → matching verified user claims it.
- **Alternates:** existing member/invite prevents duplicate; admin cannot create admin/super admin; cancel pending invite does not affect active user.
- **Acceptance:** narrowest scope default; claim matches normalized verified email; unauthorized roles are absent and denied server-side.

#### `UC-SCHOOL-03` — Request and resolve classroom access (`CURRENT`)

- **Actors:** classroom owner proposes; admin resolves.
- **Main flow:** owner selects eligible colleague → reviews award capability → submits → admin opens queue → approves/declines → grant and request state update.
- **Alternates:** duplicate/past request explained; removed colleague cannot be approved; permission change during review returns conflict.
- **Acceptance:** proposer cannot self-grant; resulting award grant cannot rename/delete/manage roster/store; server confirmation controls UI state.

#### `UC-SCHOOL-04` — Import students (`CURRENT` web/native code)

- **Main flow:** choose CSV → map fields → preview new/update/error → fix or exclude errors → review destination/count → commit chunks → show exact result.
- **Alternates:** malformed/oversized/duplicate IDs; partial batch failure; navigation with dirty mapping.
- **Acceptance:** no write before confirm; errors identify row without exposing data elsewhere; upsert matching follows existing school-ID behavior; retry does not duplicate successful rows.

#### `UC-SCHOOL-05` — Promote/archive/restore students (`CURRENT`)

- **Main flow:** filter source → select learners → choose destination or archive → review → commit → result.
- **Acceptance:** history/balance retained on archive; restore requires destination; list-query rule tests exist; unauthorized teacher cannot run flow.

#### `UC-SCHOOL-06` — Define and adjust implementation rhythm (`PLANNED`)

- **Main flow:** select natural routine → choose shared vocabulary/norms → link lessons → later review staff/student feedback → adjust.
- **Acceptance:** no discipline/PBIS replacement claim; no required daily lesson block; transaction volume alone is not success.

### Educators and instructional staff

#### `UC-EDU-01` — Open and prepare a lesson (`PLANNED` app over `CURRENT` content)

- **Main flow:** Learn → filter → open lesson → inspect complete contract → select classroom → choose product connection → print or start guided mode.
- **Acceptance:** every contract field is present; family/inclusion/framework notes remain intact; 7–12 is not claimed; no student record is required to browse.

#### `UC-EDU-02` — Record an individual earn/spend (`CURRENT`, expand)

- **Main flow:** classroom → learner → Earn/Spend → amount/reason → optional goal/reserve or spend category → effect preview → record → see new balance/history.
- **Alternates:** invalid amount; insufficient balance policy; offline; permission revoked; duplicate tap.
- **Acceptance:** no reauthentication; integer cents; type-specific tags only; transaction and balance update atomically as current implementation intends; success announced.

#### `UC-EDU-03` — Record for a group/class (`PLANNED`)

- **Main flow:** select learners or entire active class → action/amount each/reason/tags → review N recipients → submit chunked/idempotent operation → exact results.
- **Acceptance:** archived absent; partial failures explicit; retry failed only; no separate manual group abstraction; 48px targets and keyboard selection.

#### `UC-EDU-04` — Create and use a goal trail (`CURRENT` web mechanic / `PLANNED` parity)

- **Main flow:** learner → New goal → name/target → save → record Earn toward goal → see saved/target/remaining/checkpoint → optionally preview spend detour.
- **Acceptance:** goal saved amount is parallel progress, not a second balance; achieved derives from saved ≥ target; no public comparison.

#### `UC-EDU-05` — Run the classroom store decision lab (`CURRENT` web / `PLANNED` parity)

- **Main flow:** authorized admin configures items/prices → educator/learner selects item → composer prefills Spend → learner reviews balance/remainder/category → adult records.
- **Acceptance:** selection never auto-spends; price edits do not alter history; item is a simulated classroom choice, not merchandise/payment.

#### `UC-EDU-06` — Demonstrate interest (`CURRENT` web manual mechanic / `PLANNED` parity)

- **Main flow:** choose goal with saved amount → Interest practice → enter rate → show calculation → record interest Earn → compare progress.
- **Acceptance:** adult-run and visible; no background yield promise; simplified fictional disclaimer; positive rate and rounded integer cents.

#### `UC-EDU-07` — Connect a choice to reflection (`PARTIAL`)

- **Main flow:** choose learning tag/prompt → allow student decision → record → ask what happened/next → optionally mark discussion complete.
- **Acceptance:** oral/skip supported; no character label or forced financial disclosure; persistence of reflection awaits privacy-reviewed contract.

### Families

#### `UC-FAM-01` — Create a separate family context (`PLANNED`, backend prerequisite)

- **Main flow:** adult creates family → invites co-manager/links child identity → sees empty separate family balance → chooses family language.
- **Acceptance:** no classroom balance/history copied; one identity can switch contexts; authority/consent and deletion/export defined; current scalar student schema is not used as a shortcut.

#### `UC-FAM-02` — Notice, wonder, and try again (`PLANNED`)

- **Main flow:** choose child → Notice a choice → use neutral Wonder prompt → optionally record simulated outcome → later revisit.
- **Acceptance:** allowance/chores/real purchase not required; family resource disclosure absent; family activity cannot mutate classroom context.

#### `UC-FAM-03` — Use a family bridge (`CURRENT` public / `PLANNED` app)

- **Main flow:** browse age-appropriate lesson → open family bridge → do no-purchase activity → optional private completion.
- **Acceptance:** works without account, allowance, bank, or purchase; no child public sharing; completion not a performance score.

### Students

#### `UC-STU-01` — Claim account and view private balance/history (`CURRENT`)

- **Main flow:** authorized adult invites school email → student signs into matching verified account → claim links roster record → student-only home shows own context/balance/history.
- **Alternates:** wrong/unverified email; expired/cancelled invite; dual-role user.
- **Acceptance:** student cannot list peers/classroom; no edit controls; no other balance; context name shown without protected context read as current denormalization supports.

#### `UC-STU-02` — Check goal progress (`PLANNED` full student presentation)

- **Main flow:** Goals → open goal → see saved/target/remaining/checkpoints → compare optional spend detour → decide with adult.
- **Acceptance:** no shame, public streak, or peer rank; context-specific; arithmetic and labels screen-reader readable.

#### `UC-STU-03` — Complete a student mission (`PLANNED`)

- **Main flow:** age-filtered Learn → Pause → bounded Choose → Grow/reflection → return to private Today.
- **Acceptance:** direct age-appropriate language; adult help available; skip/oral reflection; no family-resource question.

#### `UC-STU-04` — Recover from a regretted choice (`PLANNED` reflection pattern)

- **Main flow:** open transaction/history → see effect and related goal/tradeoff → answer `What would you try next?` or discuss aloud → create/continue plan.
- **Acceptance:** history is not falsified or silently deleted; no `bad choice` label; adult correction/refund, if later designed, must be a traceable compensating entry.

## 6. Starter lesson-to-product traceability

| Lesson                     | Marketed product connection                                                 | Exact app surface                                      | Web state                                                         | Native state   |
| -------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- | -------------- |
| The Waiting Garden         | Familiar `save for later` action; lesson works without device               | `W/M-LEARN-03`; earn toward goal in `CLASS-02/03`      | Goal mechanic current; guided lesson planned                      | Planned parity |
| Need, Want, or Both?       | Name purpose and amount remaining before simulated purchase                 | Spend category and effect preview in `W/M-CLASS-02/03` | Spend category current                                            | Planned parity |
| The Three-Path Plan        | Assign simulated earnings to current use and a goal; sharing stays a prompt | Earn goal/reserve selector; lesson reflection          | Partial/current web tags; sharing intentionally not a transaction | Planned parity |
| Build a Goal Trail         | Compare paper trail to balance/history and record checkpoint                | Goal cards, goal-tagged Earn, spend detour preview     | Goal mechanic current; checkpoint UX expand                       | Planned parity |
| Classroom Store Budget     | Show price, balance, remainder, history together                            | Store catalog + Spend prefill/effect preview           | Store current; explicit review expand                             | Planned parity |
| Interest Joins the Team    | Base-tier interest practice, production mechanic described honestly         | Adult-led interest practice in goal card               | Manual current; no scheduled engine                               | Planned parity |
| Opportunity Cost Challenge | Ask which goal/alternative is not funded yet                                | Unfinished-goal reminder and optional reflection       | Current computed reminder; reflection expand                      | Planned parity |
| Plan for the Unexpected    | Label simulated savings `goal` or `just in case`                            | Earn savings label and reserve badge/filter            | Current                                                           | Planned parity |

### 6.1 Lesson-specific safety acceptance

| Lesson                     | Must preserve                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| The Waiting Garden         | Waiting aids and immediate option without shame; never score wait vs now as moral correctness       |
| Need, Want, or Both?       | `It depends` remains valid; no family affordability disclosure                                      |
| The Three-Path Plan        | Plans may differ; `Help others` is not proof of kindness and is not a required transaction          |
| Build a Goal Trail         | Fictional/classroom goals; no family savings/debt disclosure                                        |
| Classroom Store Budget     | Evaluate math/priority explanation, not “good/bad spender” identity                                 |
| Interest Joins the Team    | Simplified fictional model; no request for household savings/interest                               |
| Opportunity Cost Challenge | Neutral fictional constraints; distinguish next-best alternative from every rejected option         |
| Plan for the Unexpected    | Low-stakes fictional surprise; avoid housing, food, health, job-loss, or family-emergency scenarios |

## 7. Coverage release rule

Before a capability moves from `PLANNED`/`PARTIAL` to `CURRENT`:

1. Every mapped use case above passes its main and alternate flow.
2. Web and native state labels reflect actual platform parity separately.
3. Required rules/query tests pass; UI-only visibility is insufficient.
4. Marketing copy is changed only if the product truth changed.
5. Accessibility and child-safety acceptance is recorded.
6. Any launch gate remains visibly unresolved until its external/legal/operational evidence exists.
