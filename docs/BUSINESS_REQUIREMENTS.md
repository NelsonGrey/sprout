# Sprout Streak - Business Requirements Document

> **Planning baseline (written 2026-08-16):** This document describes the target product for a freshly scaffolded repository. Only the auth layer, monorepo skeleton, Firebase project trio, and CI/CD are actually built — see [TECHNICAL_REQUIREMENTS.md](TECHNICAL_REQUIREMENTS.md) §2 for an honest implementation-status table. Everything else below is planning intent, not a shipped feature.

**Version**: 1.0
**Last Updated**: August 16, 2026
**Status**: Draft
**Owner**: Mark Nelson

---

## Executive Summary

**Product Overview**:
Sprout Streak is a subscription, no-ads classroom-and-family financial-literacy platform: a digital "earn and spend" system that replaces paper sticker charts and plastic token cards with a real mobile/web app, while teaching kids genuine money-management concepts (saving, budgeting, delayed gratification) rather than just gamified points.

**Origin**: This product was conceived while conducting an App Store teardown of **ETM Machine** (Educational Classroom Systems, LLC) — see Appendix A. ETM Machine validates real demand for this category (physical-card classroom banking has been sold since 2018) but is a cautionary tale in execution: 3.3★ from only 8 ratings after 8 years live, no version update since February 2020 despite crash reports through 2025, a forced logout after every single transaction, no student-facing balance view, no accessibility support, and a plastic-card supply chain that adds cost and friction most classrooms won't tolerate on a trial basis.

**Problem Statement**:
Teachers and parents want a low-friction way to reinforce good behavior and teach real financial concepts, but the market splits into two unsatisfying camps: (1) general-purpose behavior trackers (ClassDojo, PBIS Rewards) with no real financial-literacy depth, and (2) financial-literacy-specific tools (ETM Machine, ClassBank) that are either poorly executed and stagnant (ETM Machine) or free-tier-crippled and classroom-only, with no native mobile app and no home/family continuity (ClassBank — see §1.2).

**Solution**:
Sprout Streak is a native mobile (Flutter, iOS + Android) and web (React) app, backed by Firebase, that:
- Fixes every specific failure mode identified in ETM Machine (see §1.3): no forced logout, real student/parent balance visibility, accessibility built in from day one, no physical-card dependency, actively maintained.
- Goes beyond ClassBank's classroom-only, web-only, free-tier-crippled model with a real native mobile experience, cross-context continuity between classroom and family use, and deeper financial-literacy content (not just a re-skinned points ledger).
- Ships with COPPA/FERPA-appropriate data handling from the start rather than as an afterthought, since this app is squarely aimed at K-12 children's data.

**Key Metrics Target**:
| Metric | Current (Aug 2026) | 6-Month Target | 12-Month Target |
|--------|---------------------|----------------|------------------|
| Paying classrooms/families | 0 (pre-launch) | 250 | 1,500 |
| Students with an active account | 0 | 5,000 | 30,000 |
| App Store rating | — | 4.5+ | 4.6+ |
| Monthly Recurring Revenue (MRR) | $0 | $1,000 | $6,000 |
| D30 classroom retention | — | 70% | 80% |

---

## 1. Market Analysis

### 1.1 Market Opportunity
- **Total Addressable Market (TAM)**: ~130,000 K-12 schools in the US (NCES), each with multiple classrooms; classroom behavior/economy software is a recognized budget line in most.
- **Serviceable Addressable Market (SAM)**: Financial-literacy-specific classroom tools (the ETM Machine / ClassBank segment, not general behavior trackers), plus the family/home segment neither competitor seriously serves.
- **Serviceable Obtainable Market (SOM)**: Individual teachers and families adopting bottom-up (matching ETM Machine's and ClassBank's actual go-to-market — both grew teacher-by-teacher, not via district procurement, at least initially).

**Market Dynamics** (see full teardown in Appendix A):
- The category (PBIS/behavior-management software) is real and growing, but trending toward **integrated platforms** (behavior + gamification + parent comms + academic data) rather than standalone point trackers — per 2026 market surveys of ClassDojo alternatives.
- Financial-literacy-as-classroom-economy is a validated sub-niche: University of Wisconsin's Center for Financial Security found classroom-economy programs produce financial-literacy gains comparable to formal personal-finance courses after just 10 weeks (cited in ClassBank's marketing, and consistent with independent financial-literacy research).
- No incumbent in this specific sub-niche has solved the **classroom-to-home continuity** problem — every competitor is either classroom-only (ClassBank, ETM Machine) or has no financial-literacy depth (ClassDojo).

### 1.2 Competitive Landscape

| Competitor | Strengths | Weaknesses | Market Position | Our Differentiation |
|---|---|---|---|---|
| **ETM Machine** (source app — see Appendix A) | Established niche positioning ("financial literacy" branding); simple mental model | Stagnant (no update since Feb 2020); crashes on cellular; forced logout after every entry; no student balance view; no VoiceOver; physical-card supply chain cost; 3.3★/8 ratings after 8 years | Long-tail, low-traction incumbent | Fix every one of these directly — see §1.3 |
| **ClassBank** (leading competitor — deep dive in §1.4) | 1M+ teachers, real district adoption (NYC, Columbus, Orange County); free tier; strong financial-literacy mechanics (jobs, bills, interest); University-backed research citation; <10 min setup | Web-only for students (no native mobile app); interest-earning savings and co-teacher sharing locked behind $100/yr Pro; classroom-only — no family/home mode; unclear accessibility posture | Category leader by adoption | Native mobile from day one; deeper free tier; classroom **and** family continuity; accessibility as a launch requirement, not a backlog item |
| **ClassDojo** | Massive install base, strong parent-communication network effects, free | No real financial-literacy mechanics — points, not money concepts | Category-dominant generalist | We don't compete head-on here; we win specifically on financial-literacy depth ClassDojo doesn't attempt |
| **PBIS Rewards** (Navigate360) | School-wide PBIS alignment, district-grade | Not financial-literacy-focused; institutional sales motion, slow bottom-up adoption | PBIS-at-scale specialist | Faster bottom-up adoption path, financial-literacy-specific |
| **Kickboard** | Behavior analytics, admin reporting | Analytics/reporting-first, not a kid-facing experience | Admin/leadership tool | We're a kid-facing product, not primarily a reporting dashboard |
| **Classcraft** | Heavily gamified, high engagement | Gamification-first, no real-world money literacy | Gamification specialist | Real financial concepts, not just XP/points |

### 1.3 What ETM Machine Got Wrong (and How Sprout Streak Fixes It)

Sourced from the App Store teardown that motivated this project, plus direct field feedback from a current ETM Machine teacher user collected 2026-08-16 (full detail in Appendix A):

| ETM Machine failure | Sprout Streak requirement |
|---|---|
| App crashes on cellular data (reported 2021–2025, never fixed) | **BR-1.3.1**: Native app must maintain a stable session across network transitions (WiFi↔cellular) without crashing or losing in-progress state |
| Forced logout after every single transaction ("not functionally useful" — Sept 2025 review) | **BR-1.3.2**: A teacher/parent must be able to complete a full session (many transactions) without re-authenticating between each one |
| No student-facing balance view (requested since 2021, never shipped) | **BR-1.3.3**: Students must be able to see their own balance and transaction history in-app, not just the adult administering the account |
| No VoiceOver/accessibility support (requested 2021, never shipped) | **BR-1.3.4**: Core flows (sign-in, balance check, scan/select actions) must be usable with a screen reader from v1.0, not deferred |
| No version update since Feb 2020 despite live bug reports through 2025 | **BR-1.3.5**: This is a process/business requirement, not a feature — commit to a visible update cadence and a public changelog |
| Physical plastic card + QR code required, $50 custom-design setup fee | **BR-1.3.6**: No physical hardware required to use the product; a phone/tablet is the only required device |
| No FERPA/COPPA compliance messaging anywhere in the product or marketing | **BR-1.3.7**: Publish a compliance/data-handling statement appropriate for K-12 procurement before any school-facing marketing (see §9) |
| Near-zero organic growth (8 App Store ratings after 8 years) — no parent-invite/viral loop | **BR-1.3.8**: Ship a parent/co-teacher invite flow from v1.0 — this is a growth requirement, not just a feature |
| No multi-select/bulk actions — moving a class of students to a new teacher (e.g., end-of-year promotion) takes roughly 15 clicks per student, one at a time | **BR-1.3.9**: Teachers/admins must be able to select multiple students at once and apply an action (move to another class, transact) to the whole selection in a single operation |
| No "mass deposit" to a class — teachers fake it with manually-maintained "groups," adding/removing each student one by one whenever their teacher assignment changes | **BR-1.3.10**: A transaction (earn/spend/deposit) must be applicable to an entire class or an arbitrary multi-select of students in one action, without a separate group abstraction to keep in sync by hand |
| No secondary/co-teacher assignment — a specials teacher (PE, art, music) who serves many classes across grade levels has no way to be added to those classes without a workaround | **BR-1.3.11**: A teacher must be assignable to multiple classes/sections, or added as a secondary teacher on another teacher's class, the way a middle/high-school teacher's schedule works — without needing a separate account per class |
| Binary teacher/admin roles only — a specials teacher who needs cross-class or whole-school visibility has to be given a full "admin" account just to see their students, a serious over-privileging workaround | **BR-1.3.12**: Support a scoped role between single-class teacher and full admin (e.g., a specialist role with visibility across assigned classes/grade levels), so cross-class visibility never requires granting school-wide administrative privileges |

### 1.4 Deep Dive: ClassBank (Leading Competitor)

ClassBank (classbank.com) is the most direct, most successful existing competitor discovered during this project's setup — "loved by 1M+ teachers and students in all 50 states," with adoption by NYC Public Schools, Columbus City Schools, and Orange County Public Schools. It is free for individual classrooms, with a $100/year Pro tier and a Schoolwide/institutional plan.

**What ClassBank does well** (the bar Sprout Streak must clear):
- Full classroom-economy mechanics: classroom jobs (students apply for and hold positions like Banker or Store Manager), automatic paychecks, optional bills, a digital class store with inventory tracking, and real bank-style checking/savings accounts.
- Genuine financial-literacy depth: savings goals, interest-earning savings (Pro tier), budgeting practice through store purchases — this is a materially deeper simulation than ETM Machine's flat earn/spend ledger.
- Setup friction is genuinely low (under 10 minutes, plug-and-play defaults), which is a real growth lever ETM Machine lacks entirely.
- District-credible: multilingual support, SIS integration and centralized admin dashboards at the Schoolwide tier, real research backing (University of Wisconsin).

**Where ClassBank falls short — Sprout Streak's opportunity to exceed it**:
1. **No native student mobile app.** ClassBank's teacher app is mobile (iOS/Android); students access their accounts via web browser only. Sprout Streak is a native Flutter app for every role (teacher, parent, and student), which is a materially better experience for the K-12 audience actually using it day-to-day, and is table stakes for the family/home use case ClassBank doesn't attempt.
   → **BR-1.4.1**: Ship a first-class native mobile experience for the student role, not just teachers/admins.
2. **Classroom-only — no family/home continuity.** ClassBank has no concept of a student's account following them home, or a parent independently running the same system for household chores/allowance. Sprout Streak's original conception (from the ETM Machine teardown) explicitly targets both contexts.
   → **BR-1.4.2**: A student's Sprout Streak identity/account can be used in both a classroom context (managed by a teacher) and a family context (managed by a parent), potentially simultaneously, without being two separate products.
3. **Core financial mechanics are Pro-gated.** Interest-earning savings and co-teacher sharing sit behind the $100/yr paywall — the free tier's "savings account" doesn't actually teach compound growth, which is arguably the single most important financial-literacy concept a tool like this could teach.
   → **BR-1.4.3**: Interest/compound-growth mechanics on savings should be available at Sprout Streak's base tier, not gated behind a premium upsell — it's core to the value proposition, not a nice-to-have.
4. **Accessibility posture is undocumented.** No public statement or evidence of screen-reader support was found. Given ETM Machine's identical, well-documented failure here, this is a low-cost, high-differentiation opportunity for Sprout Streak to compete on.
   → **BR-1.4.4**: Publish an accessibility statement and hit WCAG 2.1 AA-equivalent behavior on mobile (see TRD §7).
5. **Pricing model opacity below the Pro tier**, and no visible sub-$100 middle tier for a single teacher who wants *some* premium mechanics without a full $100/yr commitment. ETM Machine's per-student pricing ($2/student for 1–100 students, $1.50/student for 101–1,000) is more transparent and scales with class size — worth borrowing that transparency while beating ClassBank's actual feature depth.
   → **BR-1.4.5**: Publish transparent, per-seat pricing (see §4) rather than an opaque "Pro" bundle.

### 1.5 Market Trends
- Category consolidation toward integrated platforms (behavior + gamification + parent comms + academic data) — Sprout Streak should design its data model to support this expansion later without a rewrite (see TRD §3.2), even though v1.0 stays focused on the financial-literacy core.
- Rising scrutiny of K-12 ed-tech data handling (state student-privacy laws expanding beyond COPPA/FERPA) — compliance-by-default is now a competitive requirement, not just legal hygiene.
- Bottom-up (teacher/parent-led) adoption remains the dominant go-to-market in this category — neither ETM Machine nor ClassBank primarily sold through district procurement to reach their current scale.

---

## 2. Target Users & Personas

### Primary Persona: "The Classroom Teacher"
**Demographics**: Elementary/middle school teacher, 25–55, manages 1–2 classrooms of 15–30 students.

**Goals**:
- Reduce time spent on manual behavior tracking (stickers, paper charts, physical tokens).
- Give students a tangible, motivating reason to demonstrate good behavior.
- Teach real financial concepts as a byproduct of classroom management, without needing a separate curriculum block.

**Pain Points** (informed directly by ETM Machine's real user reviews and by field feedback from a current ETM Machine teacher user, 2026-08-16):
- Existing tools crash or lock them out mid-class ("the app crashes, and they have yet to be able to log in").
- No way for students to independently check their own balance, creating constant "how much do I have?" interruptions.
- Physical tokens/cards are a logistics and cost burden (printing, replacement, $50 custom-design fees).
- No bulk actions — moving a class roster to next year's teacher, or mass-depositing to a class, is a one-by-one slog (reported as ~15 clicks per student for a roster transfer, see BR-1.3.9/1.3.10).
- The teacher/admin role split is too coarse — specialist teachers (PE, art, music) who need multi-class or school-wide visibility either can't get real accounts or have to be over-privileged as full admins (see BR-1.3.11/1.3.12).

**Behaviors**: Sets up the system once at the start of the year, administers transactions daily/weekly, wants a system a substitute teacher or co-teacher could also use.

### Secondary Persona: "The Parent"
**Demographics**: Parent of a school-age child, wants to reinforce chores/allowance/good behavior at home using the same mental model as school (or independently of it).

**Goals**: Teach money management at home; optionally mirror or extend what's happening in their child's classroom.

**Pain Points**: Every competitor in this space (ETM Machine, ClassBank) is built classroom-first with no serious home/family mode — parents are an afterthought, not a first-class user type.

### Tertiary Persona: "The Student"
**Demographics**: K-8, the actual account holder.

**Goals**: Know their balance, understand what they're earning/spending on, feel a sense of ownership and progress.

**Pain Points**: In every competitor studied, the student is the *least* served user — ETM Machine has no student balance view at all; ClassBank's student experience is web-only, with no native app.

---

## 3. Business Objectives & Strategy

### 3.1 Strategic Goals
**Vision (3–5 years)**: Become the default financial-literacy app that follows a child from classroom to home — the only product in this category that treats "school" and "family" as one continuous context instead of two separate markets.

**Mission**: Teach real financial habits through daily use, not a once-a-year curriculum unit — and do it in a product that's reliable, accessible, and respects the fact that its primary audience is children.

**Core Values**:
- **No ads, ever** — this is a subscription product aimed partly at children; ad-based monetization is both a compliance risk and a trust-eroding choice this category can't afford (see [[modulo_squares_auth_design]]-adjacent reasoning: platform-appropriate defaults matter).
- **Reliability over feature count** — ETM Machine's core failure was neglect, not a missing feature; Sprout Streak's first commitment is that the basics never break.
- **Accessibility is not optional** — built in from v1.0, not a backlog item.

### 3.2 Business Objectives

#### Short-Term (6 months)
| Objective | Success Metric | Target | Priority |
|---|---|---|---|
| Ship MVP (single classroom/family, core earn/spend/save loop) | Feature-complete MVP | Complete | High |
| Validate with real classrooms | Active paying classrooms | 25 | High |
| Zero-crash reliability bar | Crash-free session rate | 99.5%+ | High |
| Accessibility baseline | VoiceOver/TalkBack pass on core flows | 100% of core flows | High |

#### Mid-Term (12–18 months)
| Objective | Success Metric | Target | Priority |
|---|---|---|---|
| Family-mode launch | Active family accounts | 1,000 | High |
| District pilot | Schoolwide pilot signed | 1 district | Medium |
| Parent invite/growth loop | % of classrooms with ≥1 parent connected | 40% | Medium |

#### Long-Term (2+ years)
| Objective | Success Metric | Target | Priority |
|---|---|---|---|
| Category leadership in financial-literacy sub-niche | Paying seats vs. ClassBank Pro (directional) | Meaningful share | Medium |
| Platform expansion (behavior + academic data) | Optional module adoption | 20% of accounts | Low |

### 3.3 Go-to-Market Strategy
**Distribution**: Bottom-up, teacher/parent-led adoption (matching how both ETM Machine and ClassBank actually grew) — App Store/Play Store + a marketing website, not a district-sales-first motion.

**Pricing Strategy**: Transparent per-seat pricing (see §4), undercutting or matching ETM Machine's published rates while delivering materially more (and more reliable) functionality; a genuinely useful free tier to compete with ClassBank's free plan rather than ETM Machine's all-paid model.

**Marketing Approach**: Teacher-community channels (the same audience ClassBank and ETM Machine reach — Teachers Pay Teachers-adjacent communities, classroom-economy educator forums), App Store Optimization around "classroom economy," "financial literacy for kids," and "ETM Machine alternative" / "ClassBank alternative" search intent.

---

## 4. Revenue Model & Economics

### 4.1 Monetization Strategy

| Stream | Model | Pricing | Notes |
|---|---|---|---|
| Classroom/family subscription | Per-student/per-child, annual | Target: $1.50–$2.00/student/year (matches ETM Machine's published rate, undercutting where possible) | Transparent, published pricing (§1.4.5) — not an opaque bundle like ClassBank's Pro tier |
| Free tier | Single classroom or family, capped seats | Free | Directly competes with ClassBank's free plan; core mechanics (including interest/savings — §1.4.3) available, not crippled |
| Schoolwide/district plan | Per-school or per-district license | Custom | Mirrors ClassBank's Schoolwide tier; not a v1.0 priority |

No advertising revenue stream, at any tier, for any user type — this is a firm product boundary given the child-data context (§9).

### 4.2 Cost Structure
Firebase (Auth, Firestore, Functions, Hosting) scales with usage; no physical hardware/card supply chain (unlike ETM Machine), which removes an entire cost and logistics category the incumbent carries.

---

## 5. Success Metrics & KPIs

### 5.1 North Star Metric
**Weekly Active Transacting Classrooms/Families** — a classroom or family where at least one earn/spend/save transaction happened in the past 7 days. Chosen because it measures genuine habitual use, not just account creation (the metric ETM Machine's own reviews suggest it never achieved — a product that logs users out after every entry cannot sustain habitual use).

### 5.2 Key Performance Indicators
- **Crash-free session rate**: 99.5%+ (directly answers ETM Machine's #1 complaint)
- **Student-balance-check rate**: % of students who independently check their own balance in a given week (a metric ETM Machine structurally cannot report, since it never shipped this feature)
- **D30 classroom/family retention**: 70%+ target
- **App Store rating**: 4.5+ (vs. ETM Machine's 3.3★/8 ratings)
- **Parent-invite conversion**: % of classroom accounts with at least one connected parent within 30 days

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Repeating ETM Machine's reliability failures | Medium | Critical | Session-persistence and offline-tolerance are explicit v1.0 requirements (TRD §3), not deferred |
| K-12 data-privacy/compliance misstep | Medium | Critical | COPPA/FERPA-appropriate data model designed before any school-facing launch (§9, TRD §7) |
| ClassBank/ClassDojo network-effect moat (1M+ teachers) is hard to unseat | High | High | Don't compete head-on for classroom share alone — win on family/home continuity, a segment neither addresses |
| Bootstrap/solo-developer bandwidth (same constraint as the org's other apps) | Medium | High | Scope v1.0 tightly to the earn/spend/save loop; defer schoolwide/SIS integration, gamification, and academic-data modules |
| Physical-hardware-free positioning turns out to matter less than expected (some teachers may want a tangible artifact) | Low | Medium | Keep printable/optional QR cards as an opt-in, not a requirement — cheap to support, expensive to require |

---

## 7. Constraints & Assumptions

**Business Constraints**: Bootstrap project, solo developer + contractors, same operating model as modulo-squares/vehicle-vitals/wishlist-wizard.

**Key Assumptions**:
- Financial-literacy classroom tools remain a durable sub-niche distinct from general behavior trackers — **Confidence: High** (ClassBank's 1M+ teacher base and ETM Machine's 8-year survival despite poor execution both support this).
- A meaningful share of ETM Machine's existing (dissatisfied) user base is reachable via "alternative to ETM Machine" search/marketing — **Confidence: Medium**, needs validation.
- Family/home mode is a real unmet need, not just a theoretical gap — **Confidence: Medium**, needs direct validation with parent interviews before over-investing.

---

## 8. Stakeholder Requirements

### 8.1 User Requirements (high-level, not features)
**Must Have**:
- As a teacher, I need the app to never lock me out mid-session, so a full day of transactions doesn't require repeated re-authentication.
- As a student, I need to see my own balance and history, so I don't have to ask an adult every time.
- As a parent, I need my own account context (not just a read-only view into a classroom), so I can run this at home independently of school.
- As any user with a screen reader, I need core flows to be fully operable, not silently broken.

**Should Have**: Co-teacher/family-member sharing without a premium paywall; savings that actually earn interest at the free tier.

**Nice to Have**: Optional physical card/QR support for classrooms that want a tangible artifact.

### 8.2 Business Stakeholder Requirements
**Marketing**: SEO/ASO targeting "ETM Machine alternative" and "ClassBank alternative" search intent; teacher-community outreach.
**Legal**: COPPA/FERPA-appropriate privacy policy and data processing terms published before any school-facing launch — this is a harder requirement than the org's game portfolio carries, given the K-12 institutional context.

---

## 9. Regulatory & Compliance

Given this product handles K-12 student data directly (unlike the org's other apps, which have no live users yet — see [[feedback_no_live_users_yet]] for context on why that framing has mattered elsewhere, though Sprout Streak's eventual school-facing nature raises the bar higher than a general consumer app):

- **COPPA**: No behavioral advertising to any user, ever (§3.1); minimal data collection; parental/teacher consent model appropriate for under-13 users.
- **FERPA**: Since this product may be adopted by schools and touch education records, data-handling terms need to be FERPA-appropriate (data processing agreement availability) before any district-facing marketing — a gap ETM Machine never addressed publicly (§1.3.7).
- **Accessibility**: WCAG 2.1 AA-equivalent behavior on mobile as a v1.0 requirement, not deferred (§1.3.4, §1.4.4) — see TRD §7 for the technical implementation.

---

## Appendix A: Source Analysis — ETM Machine

Full teardown conducted 2026-08-16 as the origin of this project. Summary of findings:
- **What it is**: A credit-card-style classroom/family reward system (Educational Classroom Systems, LLC, Sterling VA, founded 2018) using reusable plastic QR cards.
- **Quality**: 3.3★ from 8 ratings; recurring, unresolved 2021–2025 complaints (crashes, forced logout, no balance view, no accessibility); last shipped version dated February 2020.
- **Pricing**: $2.00/student/year (1–100 students), $1.50/student/year (101–1,000 students), $50 custom card-design setup fee.
- **Market**: Sits in a crowded but consolidating category (ClassDojo, PBIS Rewards, Kickboard, Classcraft, LiveSchool, Hero K12) where its narrow "financial literacy + physical card" differentiation is real but underexploited due to poor execution.

**Supplementary source — field feedback (2026-08-16)**: Direct feedback from a current ETM Machine classroom teacher (relayed via a colleague, "Rob," regarding specials-teacher access) surfaced operational failures the App Store teardown couldn't see from the outside — bulk roster management and role/permission granularity. See BR-1.3.9–1.3.12 above. Two workflows in particular:
- **Roster transfer**: moving a class of students to their next year's teacher is a fully manual, one-student-at-a-time process (~15 clicks/student), with no multi-select.
- **Mass deposit**: there is no way to transact against an entire class at once; the only workaround is manually maintaining a "group" per teacher and moving each student's group membership by hand whenever their teacher changes.
- **Specialist/PE teacher access**: teachers who see multiple classes across grade levels (PE, art, music) can't be given a secondary-teacher or multi-section assignment, and can't get a scoped "sees the whole school" role short of being made a full admin.

## Appendix B: Referenced Documents
- [Technical Requirements](TECHNICAL_REQUIREMENTS.md)
- [Root README](../README.md)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Aug 16, 2026 | Mark Nelson | Initial BRD, including ETM Machine source analysis and ClassBank competitive deep dive |
| 1.1 | Aug 16, 2026 | Mark Nelson | Added BR-1.3.9–1.3.12 (bulk actions, mass deposit, secondary/multi-section teachers, scoped specialist role) from direct ETM Machine teacher field feedback |

---

## Approvals

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Business Owner | Mark Nelson | | |
| Product Manager | Mark Nelson | | |
| Engineering Lead | Mark Nelson | | |
