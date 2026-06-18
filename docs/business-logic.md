# Business Logic — the rules the portal encodes

Every non-trivial domain rule in the portal, where it lives, and the exact
numbers/behaviour it implements. This is the companion to
[`sql-reference.md`](sql-reference.md) (which covers *storage*) — this document
covers *behaviour*. All rules below are sourced from the PDF spec
("Faculty Portal" requirements) and verified against the live code.

The pure logic is deliberately kept out of React/`server-only` so it stays
unit-testable; the tests in `tests/` are the executable form of this document.

---

## 1. Faculty types and default annual load

Source: [`coursePreferenceUtils.ts`](../src/components/course-preference/coursePreferenceUtils.ts) (`DEFAULT_ANNUAL_LOAD`).

Each faculty member has a *type* that fixes a baseline teaching load, measured
in **courses per academic year**:

| Faculty type | Default annual load |
| ------------ | ------------------- |
| Lecture 10   | 6 courses           |
| Lecture 12   | 8 courses           |
| Prof Track   | 2.5 courses         |

`getDefaultLoad()` falls back to **Prof Track (2.5)** for any unknown type.

---

## 2. Roles and teaching-load release

Source: `ROLE_ADJUSTMENTS_CONFIG`, `getTotalRoleRelease`, `getComputedAnnualLoad`
in [`coursePreferenceUtils.ts`](../src/components/course-preference/coursePreferenceUtils.ts).
The role vocabulary is mirrored server-side in
[`faculty-role/route.ts`](../src/app/api/editor/faculty-role/route.ts)
(`Validate.values(ALL_ROLES)`).

Administrative roles buy down teaching load. Each role carries a fixed
**release** (in courses), per the PDF "Implications on Roles" (p3):

| Role                              | Release | Rationale (PDF p3)                              |
| --------------------------------- | ------- | ----------------------------------------------- |
| Chair                             | −2.5    |                                                 |
| Director of Graduate Studies      | −1      | chairs GAC, on Executive Committee              |
| Director of Undergraduate Studies | −1      | chairs UGAC, on Executive Committee             |
| Director of Admissions            | −1      | chairs Admissions, on Executive Committee       |
| Director of Research              | 0       | on Executive Committee, no automatic release    |
| Center Director                   | 0       | nothing special at this point                   |
| Associate Chair                   | 0       | no automatic release in the spec                |

Rules:

- **Releases are additive.** `getTotalRoleRelease(roles)` sums the release of
  every role a person holds (a Chair who is also DGS gets −3.5).
- **Computed annual load** = `max(0, defaultLoad(type) − totalRelease)`. It can
  never go below 0 — a heavily-released faculty member simply owes 0 courses,
  not negative.
- Roles are stored **per academic year** (`cfp_faculty_role`, UNIQUE on
  `person_number + academic_year + role`), so the same person can be Chair one
  year and not the next.

---

## 3. Per-semester distribution of the annual load

Source: `getDefaultSemesterDistribution`, `SUMMER_COUNTS_TOWARD_LOAD` in
[`coursePreferenceUtils.ts`](../src/components/course-preference/coursePreferenceUtils.ts).

The annual load is split across three semesters. The default split:

- **Summer is always 0** by default.
- The annual load is rounded **up** (`ceil`) to a whole number of courses first.
- **Fall gets the ceiling half**, **Spring gets the floor half**
  (e.g. 6 → Fall 3 / Spring 3; an odd 5 → Fall 3 / Spring 2).

**Does Summer count toward the annual load?** Only for **Lecture 12**:

| Faculty type | Summer counts toward load? |
| ------------ | -------------------------- |
| Lecture 10   | No                         |
| Lecture 12   | Yes                        |
| Prof Track   | No                         |

This matters for validation (§5): for Lecture 10 / Prof Track, courses parked in
Summer do **not** help satisfy the annual obligation.

---

## 4. Semester plan slots

Source: `SEMESTER_STATUS_OPTIONS`, `TEACHING_COMMENT_OPTIONS`,
`NOT_TEACHING_COMMENT_OPTIONS`, `MAX_LOAD_PER_SEMESTER` in
[`coursePreferenceUtils.ts`](../src/components/course-preference/coursePreferenceUtils.ts).

A semester plan is a list of **slots** per semester. Each slot has a **status**
and a **comment**:

- **Status:** `Teaching` | `Not Teaching`.
- **Teaching comments:** `Regular`, `Biannual`.
- **Not-Teaching comments:** `Sabbatical – Year (SY)`, `Sabbatical – Semester (SS)`,
  `Leave without Pay (LWOP)`, `Paid Leave (PL)`, `Deferred or Taught Biannual`,
  `Course Buyout`, `Course Release`.
- **Cap:** at most **3 courses per semester** (`MAX_LOAD_PER_SEMESTER`); inputs
  must be in **half-course increments** (0, 0.5, 1, 1.5, …) — see
  `validateLoadInputs`.

`syncSemesterPlanToRequestedLoad` / `resizeSemesterRows` keep the slot rows in
sync with the requested per-semester counts (truncating extras, appending blank
`Teaching/Regular` rows as needed).

---

## 5. Load validation

Source: `validateSemesterPlan` (and the legacy `validateLoadInputs`) in
[`coursePreferenceUtils.ts`](../src/components/course-preference/coursePreferenceUtils.ts).

`validateSemesterPlan(plan, annualLoad, facultyType)` compares the **number of
planned slots** to the **expected load** (`ceil(annualLoad)`):

- Count = Fall slots + Spring slots, **plus Summer slots only when
  `SUMMER_COUNTS_TOWARD_LOAD[type]` is true** (i.e. Lecture 12).
- `count < expected` → **warning**: "add more slots to complete your plan".
- `count > expected` → **warning**: "exceeds your standard annual load".
- `count === expected` → no message.

These are **warnings, not hard errors** — the spec lets a faculty member submit
an over/under plan with the discrepancy flagged for the Chair to review.

---

## 6. Course-preference ranking scale (NQ + 1–5)

Source: `RANKING_OPTIONS`, `RANKING_LABELS` in
[`coursePreferenceUtils.ts`](../src/components/course-preference/coursePreferenceUtils.ts);
write validation in
[`teachingPrefsValidation.ts`](../src/server/queries/teachingPrefsValidation.ts).

Each course a faculty member could teach is rated on a **0–5** scale:

| Value | Meaning            |
| ----- | ------------------ |
| 0     | Not Qualified (NQ) |
| 1     | Least Preferred    |
| 2–4   | (intermediate)     |
| 5     | Most Preferred     |

Server rules (`validatePref`):

- `null` / `undefined` → returns `null`, meaning **delete the preference row**.
- Otherwise must be an **integer 0–5** inclusive, else `BadRequestError`.
- Backed by the DB CHECK `chk_pref_range` = `pref BETWEEN 0 AND 5`
  (widened from the legacy 0–4 — see
  [`widen_teaching_pref_check.sql`](../db/migration/widen_teaching_pref_check.sql)).

This replaces the legacy Java `preference1/2/3` labels. Preferences are threaded
with a **term code** matching `TERM_CODE_PATTERN` = `^[0-9]{3}[569]$` (the live
`regexp_like` CHECK; trailing digit 5/6/9 = Spring/Summer/Fall).

---

## 7. Academic-year locking and "Add Year"

Source: `addAcademicYear`, `getNextYearString` in
[`coursePreferenceUtils.ts`](../src/components/course-preference/coursePreferenceUtils.ts);
UI in [`AcademicYearSelector.tsx`](../src/components/course-preference/AcademicYearSelector.tsx).

Course preferences are kept per academic year (`"2025-2026"` form). Adding a
year (PDF p4) does three things atomically:

1. **Locks every existing year** (`locked: true`) → past years become read-only
   (lock icon + "Read-only" badge in the UI).
2. **Appends the next year** unlocked. The next year is `start+1`-`end+1`
   (`"2025-2026"` → `"2026-2027"`). A **malformed latest year**, or a next year
   that **already exists**, aborts the operation (`addAcademicYear` returns
   `null`).
3. **Copies the latest year's content forward** (`deepCopyYearData`, with fresh
   slot ids) and **advances the biannual alternation** (§8).

---

## 8. Biannual (every-other-year) carry-forward

Source: `getBiannualCarryInSlots`, `applyBiannualCarryIn` in
[`coursePreferenceUtils.ts`](../src/components/course-preference/coursePreferenceUtils.ts).

Some courses are taught every *other* year. This is modelled as a **two-way
alternating trigger** that only applies to **Fall and Spring** (never Summer):

- A `Not Teaching` + `Deferred or Taught Biannual` slot in year *N*
  → auto-creates a `Teaching` + `Biannual` slot in year *N+1*.
- A `Teaching` + `Biannual` slot in year *N+1*
  → auto-creates a `Not Teaching` + `Deferred or Taught Biannual` slot in year
  *N+2*.

The chain is **self-sustaining**: once started, each year flips the slot to the
opposite state, producing the every-other-year rhythm indefinitely. When
carry-in slots are injected (`applyBiannualCarryIn`), any **existing biannual
slots of either kind are replaced** so the alternation can't duplicate.

---

## 9. Leave records

Source: controlled vocabulary in [`leaveTypes.ts`](../src/lib/leaveTypes.ts);
diff logic in [`leaveService.ts`](../src/services/faculty/leaveService.ts);
write validation in
[`faculty-leave/route.ts`](../src/app/api/editor/faculty-leave/route.ts).

Leaves are a controlled vocabulary (the route validates `leave_type` against it,
so UI and storage never drift):

`Sabbatical – Year (SY)`, `Sabbatical – Semester (SS)`,
`Leave without Pay (LWOP)`, `Paid Leave (PL)`, `Course Buyout`, `Course Release`.

(These mirror the planner's not-teaching comments, **minus** "Deferred", which is
a teaching-plan comment, not a leave.)

**Save = diff against the loaded baseline** (`computeLeaveMutations`):

- A row with **no `leaveId`** → **create**.
- A row whose fields differ from its baseline (by `leave_type / start / end /
  location / reason / backup`) → **edit**.
- A baseline row **no longer present** → **remove**.

Submits are batched per operation in **remove → edit → create** order.

---

## 10. Committee preference matrix

Source: [`committeeMatrixService.ts`](../src/services/committee/committeeMatrixService.ts);
UI in [`CommitteeMatrixView.tsx`](../src/components/committee-preference/CommitteeMatrixView.tsx).

The matrix has one row per faculty member and one column per **role** or
**committee** (from `cfp_committee_catalog`). Cells carry a code:

| Column type | UI codes                                        |
| ----------- | ----------------------------------------------- |
| role        | `X` (holds the role) or empty                   |
| committee   | `R` (chaiR/Presiding), `C`, `V`, `M` (Member)   |

The DB stores `role_code` as `ENUM('P','C','V','X','A')`; the service maps both
ways:

- **DB → UI:** on a role column, `P → X`; on a committee column,
  `P → R`, `C → C`, `V → V`, and **everything else (`X` member, `A` alternate) →
  `M`** (members and alternates both display as "Member").
- **UI → DB:** `X`/`R → P`, `C → C`, `V → V`, `M → X`.

**Service points** for a committee come from its `service_category`, looked up
in `cfp_service_categories` (a column may have a category but no points).

**Save = diff the in-memory cells against the loaded assignments**
(`saveMatrix`), keyed `${userid}-${catalogId}`:

- cell set, no baseline → **create**; cell changed → **edit**; cell cleared or
  baseline key absent from current state → **remove**.
- **Service summaries** (the per-person "others / service-points override /
  comments" extras) are **upserted**: one row per userid that has any manual
  value; empty extras are skipped on create.

Assignments and summaries are **scoped to the selected `academic_year`**.

---

## 11. Course area tags

Source: [`courseTagService.ts`](../src/services/courseTags/courseTagService.ts);
routes [`area-tag-master`](../src/app/api/editor/area-tag-master/route.ts) +
[`course-area-tag`](../src/app/api/editor/course-area-tag/route.ts);
UI [`course-tags/page.tsx`](../src/app/course-tags/page.tsx).

A canonical area-tag list (`cfp_area_tag_master`, seeded **AI / Systems / PL /
Theory / Special Topics**) is many-to-many with courses via
`cfp_course_area_tag` (FK → master, `ON DELETE CASCADE`).

**Save = diff selected tag ids against stored assignments**
(`computeTagMutations`):

- a selected tag with **no baseline assignment** → **create** the mapping row.
- a baseline assignment whose tag is **no longer selected** → **remove** that row.

> Seeding note: live `primarycatalognumber` values carry suffixes (`368LR`), so
> the seed normalises with `REGEXP_REPLACE(primarycatalognumber, '[^0-9].*', '')`
> before matching catalog numbers to courses.

---

## 12. Cross-cutting invariants

These apply to **every** write path above:

- **Audit stamping** — each write sets `editor` (the userid) and `dt`; `ts` is
  DB-managed. The user comes from `getCurrentUser()` in
  [`auth.ts`](../src/lib/auth.ts) (returns `DEV_USERID` until SSO lands).
- **Identity bridge** — course/semester plans and leaves key on
  `person_number`; committee assignments and teaching prefs key on `userid`.
  `dce.person_number` maps between them
  ([`identity.ts`](../src/server/queries/identity.ts)); API routes accept either.
- **Term codes** — `[century][YY][term]`, century digit `+18`
  (Fall 2025 = `2259`); see [`term.ts`](../src/lib/term.ts).
- **Data mode** — in **local mock** mode the editor routes answer 503 and every
  service falls back to bundled mock data (saves are acknowledged, not
  persisted); in **db** mode the same contract hits `cfp_*`. See the mode switch
  in `src/server/data/index.ts`.
- **Write allowlist** — only the ten `WRITABLE_TABLES` `cfp_*` tables accept DML
  (plus `people.cfp_faculty_teaching_prefs` via plain knex); see
  [`sql-reference.md`](sql-reference.md).
