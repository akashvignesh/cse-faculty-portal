# SQL Reference — every database call in this project

A map of all SQL the app issues, where it lives, what it touches, and how to
add a field at each layer. All SQL is server-side only, in two places:

1. **Plain knex queries** — `src/server/queries/*.ts` (reads + teaching-pref
   writes). Used by the `/api/v1/*` routes.
2. **DataTables Editor instances** — `src/app/api/editor/*/route.ts`
   (generated CRUD SQL for the editable `cfp_*` tables in the
   `WRITABLE_TABLES` allowlist — ten tables as of this writing).

```
Browser (components/, services/)            ← fetch JSON only, never SQL
  └── /api/v1/* route handlers (src/app/api/v1)
        └── src/server/data/index.ts        ← mode switch: db | local mock
              ├── src/server/queries/*.ts   ← knex SQL (this document)
              └── src/server/mocks/index.ts ← same contract, no SQL
  └── /api/editor/* route handlers (src/app/api/editor)
        └── datatables.net-editor-server    ← generates SELECT/INSERT/UPDATE/DELETE
              └── guarded by src/lib/db.ts WRITABLE_TABLES + lib/editor/locks.ts
```

Connection: `src/lib/db.ts` — knex singleton, mysql2, default schema
`ubs_emp`, `dateStrings: true`, pool max 5. Cross-schema reads use qualified
names (`people.*`, `dce.*`, `ps_rpt.*`, `committees.*`) and `CONVERT(...
USING utf8mb4)` on both sides of joins because charsets are mixed: the
`cfp_*` tables in `ubs_emp` are `utf8mb4_0900_ai_ci`, while the legacy
schemas they join to are `latin1` (`ps_rpt.*`, `dce.person_number`,
`committees.*`, `people.phd_advisors`) or `utf8`
(`people.cfp_faculty_teaching_prefs`).

> **Schema source of truth.** Column types, keys, and declared FKs in this
> document are taken from the live-DB export committed under
> [`scripts/db-schema/data/`](../scripts/db-schema/data/) (snapshot
> `2026-06-14`). That export captures columns, per-column key flags
> (PRI/UNI/MUL), declared foreign keys, and view column lists. It does **not**
> capture composite UNIQUE indexes or CHECK constraints — those are sourced
> from the migration DDL / app code and are called out as such below.

---

## 1. Identity bridge — `src/server/queries/identity.ts`

`dce.person_number` maps `person_number` ↔ `principal` (userid). The PK is
the composite `(person_number, principal)`, so several principals per person
are allowed; all lookups `ORDER BY` for determinism.

```sql
-- dce.person_number (latin1)
person_number  varchar(8)  NOT NULL,   -- PK part 1
principal      varchar(8)  NOT NULL,   -- PK part 2 (the userid)
status         char(1)     NULL,
unix_uid       int         NULL,
dt             datetime    NULL
-- PRIMARY KEY (person_number, principal)
```

| Function                                | SQL                                                                                              | Used by            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------ |
| `useridForPersonNumber` (line 14)       | `SELECT principal FROM dce.person_number WHERE person_number = ? ORDER BY principal LIMIT 1`     | prefs, history     |
| `personNumberForUserid` (line 26)       | `SELECT person_number FROM dce.person_number WHERE principal = ? ORDER BY person_number LIMIT 1` | detail, history    |
| `resolvePersonNumber` / `resolveUserid` | dispatch on `^\d{8}$` — 8 digits ⇒ already a person number                                       | every `[id]` route |

Every `/api/v1/faculty/[id]/...` route accepts **either** identifier because
of these resolvers.

## 2. Faculty roster — `listFaculty` in `src/server/queries/faculty.ts:74`

Route: `GET /api/v1/faculty?page=&size=&search=`

```sql
SELECT f.person_number                                   AS personNumber,
       COALESCE(n.name_display, f.person_number)         AS fullName,
       dpn.principal                                     AS userid,
       pa.address_line1 ... pa.country                   -- assembled in TS
FROM cfp_faculty f
LEFT JOIN ps_rpt.ub_display_name_v n   ON n.emplid = f.person_number      -- CONVERT both sides
LEFT JOIN (SELECT person_number, MIN(principal) principal
           FROM dce.person_number GROUP BY person_number) dpn ON ...      -- dedup principals
LEFT JOIN cfp_faculty_primary_address pa ON pa.person_number = f.person_number
WHERE COALESCE(n.name_display, f.person_number) LIKE '%token%'  -- per search token
ORDER BY n.name_display IS NULL, n.name_display, f.person_number
LIMIT ? OFFSET ?
```

Plus a `COUNT(*)` over the same `FROM`/`WHERE` for pagination. Office
address is formatted in TS (`formatOfficeAddress`). The aliases are the
wire field names the frontend mapper consumes. The roster renders only
Name/Userid/Office Address, so `cfp_appointments` (title/rank/standardLoad)
and `cfp_faculty_primary_email` are intentionally **not** joined here.

## 3. Faculty detail — `getFacultyDetail` in `src/server/queries/faculty.ts:162`

Route: `GET /api/v1/faculty/[id]`. One anchor query + **8 parallel**
person-number-keyed queries (`Promise.all`), then **2 userid-keyed**
follow-ups (students + campus office) once the principal is known:

| #      | Table                                                    | Columns → wire aliases                                                                                                                                        |
| ------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| anchor | `cfp_faculty`                                             | `person_number→personNumber`, `cv_document_id→cvDocumentId`                                                                                                   |
| 1      | `ps_rpt.ub_display_name_v`                               | `name_display→fullName` (fallback personNumber)                                                                                                               |
| 2      | `dce.person_number`                                       | `principal→userid`                                                                                                                                            |
| 3      | `cfp_appointments`                                        | `official_job_title→title`, `appointment_type→rank`, `in_house_title→titleLine`, `standard_course_load→standardLoad`, `next_promotion_date→nextPromotionDate` |
| 4      | `cfp_faculty_primary_email`                               | `email_address→contact.email`                                                                                                                                 |
| 5      | `cfp_faculty_primary_address`                             | `address_line1/2, city, state_province, postal_code, country → contact.officeAddress{}` + formatted `officeAddress`                                           |
| 6      | `cfp_faculty_research_areas` ⋈ `cfp_research_area_master` | `area_name → researchAreas[]`                                                                                                                                 |
| 7      | `cfp_faculty_leave`                                       | `leave_type→leaveType`, `start_date`, `end_date`, `location`, `reason`, `backup_person_number→backupFacultyPersonNumber`                                      |
| 8      | `ubs_rf.award_v`                                          | `award_number→awardId`, `title→awardName`, `YEAR(award_start)→awardYear` (no sponsor column, so Organization stays blank); keyed `person_number`               |

Then two **userid/principal**-keyed follow-ups run once query #2 yields the
principal:

- **Students** — `fetchStudents` (below).
- **Campus office** — `fetchCampusOffice` (`faculty.ts:159`):

  ```sql
  SELECT b.building_name AS buildingName, o.bldabr, o.room
  FROM facilities.occupants o
  LEFT JOIN facilities.buildings b
    ON CONVERT(b.building_abbr USING utf8mb4) = CONVERT(o.bldabr USING utf8mb4)
  WHERE CONVERT(o.userid USING utf8mb4) = CONVERT(<principal> USING utf8mb4)
  ORDER BY o.room IS NULL, o.room ASC
  LIMIT 1
  ```

  → `campusOffice` = `"<building_name|bldabr> <room>"`. Note `occupants.userid`
  is a **principal**, not a person_number, so this fetch waits for query #2.

> Removed (fetched-but-never-rendered): `cfp_faculty_primary_phone_number`
> (no phone field in the UI) and `cfp_teaching_reductions` (no reductions tab).
> Never queried at all: `ps_rpt.ps_class_capacity_v` (no enrollment-capacity
> feature) — present in the DB/ER model but untouched by any endpoint.

Live types for the columns this query selects (all `cfp_*` are `utf8mb4`):

```sql
-- ubs_emp.cfp_faculty (anchor, PK person_number)
person_number   varchar(8)       NOT NULL,   -- PK
cv_document_id  bigint unsigned  NULL         -- → ubs_emp.cfp_documents.document_id

-- ubs_emp.cfp_appointments (PK person_number) — WIDER than the 5 aliased cols:
--   employer, appointment_term, base_entity, appointment_effective_date,
--   appointment_end_date are also present but not surfaced.
official_job_title    varchar(100)    NOT NULL,  -- → title
appointment_type      varchar(50)     NOT NULL,  -- → rank
in_house_title        varchar(255)    NULL,       -- → titleLine
standard_course_load  decimal(4,2)    NULL,       -- → standardLoad
next_promotion_date   date            NULL        -- → nextPromotionDate

-- ubs_emp.cfp_faculty_research_areas (FK person_number, research_area_id)
--   joined to cfp_research_area_master.area_name varchar(255) → researchAreas[]
-- ubs_emp.cfp_faculty_leave: start_date/end_date are NOT NULL date;
--   reason is TEXT; backup_person_number varchar(8) → backupFacultyPersonNumber
--   This read feeds the detail view; the same table is now EDITABLE through the
--   faculty-leave Editor route (§7), so the Leave tab is a CRUD grid in db mode.
```

The name/userid joins read `ps_rpt.ub_display_name_v` (`emplid` PK =
person_number, `name_display varchar(50)`) and the `dce.person_number`
bridge above. Both are `latin1`, hence the `CONVERT(... USING utf8mb4)`.

**Students** — `fetchStudents` (`faculty.ts:131`), runs after the userid is
known:

```sql
SELECT pa.userid, dpn.person_number AS studentPersonNumber, n.name_display AS fullName
FROM people.phd_advisors pa
LEFT JOIN (dce dedup by principal) dpn ON dpn.principal = pa.userid
LEFT JOIN ps_rpt.ub_display_name_v n   ON n.emplid = dpn.person_number
WHERE pa.advisor = <faculty userid> AND pa.active = 1
ORDER BY n.name_display
```

`program` is hardcoded `"PhD"` (no program column in `phd_advisors`).

**Photo** — `getFacultyPhoto` (`faculty.ts:329`), route
`GET /api/v1/faculty/[id]/photo`. Resolves to a `person_number`, then:

```sql
SELECT image
FROM sunycard.cfp_cse_faculty_photos_v          -- PK person_number, image mediumblob
WHERE CONVERT(person_number USING utf8mb4) = CONVERT(? USING utf8mb4)
LIMIT 1
```

This route streams **binary**, not JSON — it bypasses the `ok()` /
`withErrorHandler` envelope, sniffs the MIME from the blob's magic bytes
(`sniffImageMime`, defaults JPEG), sets `Cache-Control: private, max-age=3600`,
and returns **404** on no/empty image so the client falls back to initials.

## 4. Teaching history — `src/server/queries/teachingHistory.ts:62`

Route: `GET /api/v1/faculty/[id]/teaching-history`

```sql
SELECT cs.faculty, cs.facultysourcekey, cs.classnumber, cs.termsourcekey,
       cs.coursetype, cs.coursecareersourcekey, cs.courseid,
       cc.primarycatalognumber, cc.coursetitlelong
FROM ps_rpt.classschedule_v cs
LEFT JOIN ( ranked ps_rpt.ps_course_catalog_v — latest active row per crse_id ) cc
  ON cc.crse_id = cs.courseid
WHERE cs.facultysourcekey = ?            -- person_number
ORDER BY cs.termsourcekey DESC, cs.classnumber, cs.courseid
```

Post-processing in TS: `termsourcekey` decoded via `src/lib/term.ts`
(`2259` = Fall 2025; digit 0 = winter, intentionally skipped), rows grouped
into `{year, spring[], summer[], fall[]}` sorted newest-first; course name =
`catalogNumber-title` with fallbacks. Note: the schedule view also carries
`coursedescription`/`catalognumbersourcekey` directly — the catalog join
could be dropped if abbreviated titles are acceptable.

## 5. Teaching preferences — `src/server/queries/teachingPrefs.ts`

The only **plain-knex writes** in the app (cross-schema table, so not
Editor). Table `people.cfp_faculty_teaching_prefs` (`utf8`):

```sql
id          int          NOT NULL AUTO_INCREMENT,  -- PK (surrogate)
userid      varchar(8)   NOT NULL,                 -- indexed
crse_id     varchar(6)   NOT NULL,                 -- indexed
term_code   varchar(4)   NOT NULL,                 -- indexed
pref        tinyint      NOT NULL,
editor      varchar(8)   NULL,
dt          datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
ts          timestamp    NULL     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
-- PRIMARY KEY (id)
-- UNIQUE (userid, crse_id, term_code) + CHECKs — from migration DDL, not the
-- column export; see the source-of-truth note at the top.
```

The app upserts on the logical key `(userid, crse_id, term_code)`, not `id`.

| Function                             | SQL                                                                                                                                                                                                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getTeachingPreferences` (line 60)   | `SELECT ftp.userid facultyId, ftp.crse_id courseId, ftp.pref, ftp.term_code termCode, cc.primarycatalognumber, cc.coursetitlelong FROM people.cfp_faculty_teaching_prefs ftp LEFT JOIN (ranked catalog) cc ON cc.crse_id = ftp.crse_id WHERE ftp.userid = ? ORDER BY crse_id` |
| `resolveCatalogCourse` (≈104)        | `SELECT crse_id, ... FROM (ranked catalog) WHERE TRIM(primarycatalognumber)=? AND TRIM(coursetitlelong)=?` — input `"<catalog>-<title>"`; 0 hits → 404, >1 → 409                                                                                                              |
| `saveTeachingPreferences` (line 157) | per item, keyed `(userid, crse_id, term_code)`: pref null → `DELETE`; else `UPDATE ... SET pref=?, editor=?, ts=NOW()` (rows>0 → UPDATED) or `INSERT (userid, crse_id, term_code, pref, editor, ts)` (→ SAVED)                                                                |

Validation lives in `src/server/queries/teachingPrefsValidation.ts` (a pure,
unit-tested module kept free of `server-only` so it can be imported by tests).
Guard rails enforced **before** SQL (clear 400s): `termCode` required + must
match `^[0-9]{3}[569]$` (DB CHECK), `pref` an integer 0..5 (`0` = Not
Qualified). The DB `chk_pref_range` was widened from 0–4 to **0–5** by
[`db/migration/widen_teaching_pref_check.sql`](../db/migration/widen_teaching_pref_check.sql),
so the full UI rating scale now round-trips.

## 6. Committees / courses (legacy reads)

| Function                                      | Route                                        | SQL                                                                                                                                                      |
| --------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getCommitteeMemberships` — `committees.ts:6` | `GET /api/v1/committees/memberships?userId=` | `SELECT c.name committeeName, m.role FROM committees.committees c JOIN committees.members m ON m.committee_id = c.id WHERE m.userid = ? ORDER BY c.name` |
| `getActiveCourses` — `courses.ts:13`          | `GET /api/v1/courses/active`                 | ranked `ps_rpt.ps_course_catalog_v` (latest active row per `crse_id`) → `courseId`, `subject`, `courseName` (`"<catalog>-<title>"`)                      |

Schema notes: `committees.members.role` is a free-text `varchar(16)` (not an
enum — the `cfp_committee_assignment.role_code` ENUM is the editable side);
`committees.committees.name varchar(255)` is `UNIQUE`; `committee_id` →
`committees.committees.id` is a declared FK. The catalog view's relevant
columns are `crse_id varchar(6)` (PK), `primarysubject varchar(3)`,
`primarycatalognumber varchar(10)`, `coursetitlelong varchar(100)`,
`effectivestatus varchar(1)`, `effectivedate date` — the "ranked latest
active row per crse_id" CTE orders by `effectivedate` desc filtered on
`effectivestatus = 'A'`.

## 7. Editor routes (generated CRUD) — `src/app/api/editor/*/route.ts`

Each route builds one Editor instance: declared fields = exactly what is
SELECTed/INSERTed/UPDATEd, `where()` = GET filters. Writes allowed only on
tables in `WRITABLE_TABLES` (`src/lib/db.ts`). Every route auto-stamps
`editor` (= `DEV_USERID` via `src/lib/auth.ts`) and `dt` via
`auditFields()` in `src/lib/editor/factory.ts`; `ts` is DB-managed. The
pkey is exposed as a read-only field on every editor (`.set(false)`).

| Route                   | Table (pkey)                                           | Editable fields + validators                                                                                                                      | Join (read-only fields)                                               | GET filters                                        |
| ----------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| `committee-catalog`     | `cfp_committee_catalog` (`catalog_id`)                 | `source_committee_id` num, `name` notEmpty+max255, `kind` ∈ leadership/committee/taskforce/seas/pool, `service_category` 1–6, `display_order` num | —                                                                     | —                                                  |
| `committee-assignments` | `cfp_committee_assignment` (`assignment_id`)           | `catalog_id` req+num, `userid` req+max8, `role_code` ∈ P/C/V/X/A, `academic_year` req+`YYYY-YYYY`                                                 | `cfp_committee_catalog`: `name`, `kind`, `service_category`           | `academic_year`, `userid`                          |
| `service-summary`       | `cfp_committee_service_summary` (`service_summary_id`) | `userid` req+max8, `academic_year` req+`YYYY-YYYY`, `others_count` num, `service_points_override` num, `comments` max1024                         | —                                                                     | `academic_year`, `userid`                          |
| `course-plan`           | `cfp_faculty_course_plan` (`course_plan_id`)           | `person_number` req+max8, `academic_year` req+`YYYY-YYYY`, `faculty_type` ∈ Prof Track/Lecture 10/Lecture 12, `locked` 0/1                        | —                                                                     | `person_number`, `academic_year`                   |
| `semester-plan`         | `cfp_faculty_semester_plan` (`semester_plan_id`)       | `course_plan_id` req+num, `term` ∈ summer/fall/spring, `slot_status` ∈ Teaching/Not Teaching, `slot_comment` max60                                | `cfp_faculty_course_plan`: `person_number`, `academic_year`, `locked` | `course_plan_id`, `person_number`, `academic_year` |
| `faculty-role`          | `cfp_faculty_role` (`role_id`)                         | `person_number` req+max8, `academic_year` req+`YYYY-YYYY`, `role` req+`values(ALL_ROLES)` (Chair, Associate Chair, the four directors, Center Director) | —                                                                | `person_number`, `academic_year`                   |
| `faculty-leave`         | `cfp_faculty_leave` (`leave_id`)                       | `person_number` req+max8, `leave_type` req+`values(LEAVE_TYPES)` (SY/SS/LWOP/PL/Buyout/Release), `start_date` req, `end_date`, `location`, `reason`, `backup_person_number` max8 | —                                       | `person_number`                                    |
| `area-tag-master`       | `cfp_area_tag_master` (`tag_id`)                       | `name` req+max64 (the canonical AI/Systems/PL/Theory/Special Topics list; seeded by the migration)                                               | —                                                                     | —                                                  |
| `course-area-tag`       | `cfp_course_area_tag` (`course_area_tag_id`)           | `crse_id` req+max10, `tag_id` req+num                                                                                                            | `cfp_area_tag_master`: `name`                                         | `crse_id`                                          |
| `service-categories`    | `cfp_service_categories`                               | **GET-only** plain knex: `SELECT category, label, points ORDER BY category` (static seed fallback in local mode)                                  | —                                                                     | —                                                  |

`ALL_ROLES` (`src/components/course-preference/coursePreferenceUtils.ts`) and
`LEAVE_TYPES` (`src/lib/leaveTypes.ts`) are the single sources of truth shared
between each route's `Validate.values(...)` and the editing UI.

**Committee auto-populate** (not an HTTP route) —
[`db/migration/autofill_committee_assignments.sql`](../db/migration/autofill_committee_assignments.sql)
is a re-runnable, non-destructive script (idempotent via `NOT EXISTS`,
tagged `editor='AUTOFILL'`) that derives `cfp_committee_assignment` rows from
the live `committees.members` roster and from `cfp_faculty_role` leadership.
It opens with `SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci` so literals,
variables, and `CONVERT(...)` results all match the `cfp_*` column collation.

**Wire format** (`src/lib/editor/client.ts` speaks it): GET returns
`{data: [{DT_RowId: "row_<pk>", "<table>": {col: val}, "<joined table>": {...}}]}`;
POST body `{action: "create"|"edit"|"remove", data: {"<rowId>": {"<table>": {col: val}}}}`;
validation failures return `fieldErrors: [{name: "<table>.<col>", status}]`,
duplicates → 409, CHECK violations → 400 (mapped in `src/lib/api/errors.ts`).

**Lock guards** — `src/lib/editor/locks.ts` (global validators, run extra
SELECTs before any write):

- `coursePlanLockValidator`: edits/removes of a locked plan are rejected
  unless the edit sets `locked=0`.
- `semesterPlanLockValidator`: collects `course_plan_id`s from the submit
  (+ `SELECT course_plan_id FROM cfp_faculty_semester_plan WHERE
semester_plan_id IN (...)` for edits/removes), rejects when any
  `cfp_faculty_course_plan.locked = 1`.

## 8. Who calls what (client side, no SQL)

| UI                 | Client service                                 | API                                                                                                              |
| ------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Roster page        | `services/faculty/facultyService.ts`           | `GET /api/v1/faculty?size=500`                                                                                   |
| Detail page + tabs | `services/faculty/facultyDetailService.ts`     | detail, teaching-history, memberships, teaching-preferences (lazy per tab)                                       |
| Leave tab (edit)   | `services/faculty/leaveService.ts`             | editor faculty-leave (load + diff-save add/edit/remove); read-only fallback in mock mode                         |
| Committee matrix   | `services/committee/committeeMatrixService.ts` | editor catalog/assignments/service-summary (load + diff-save), service-categories                                |
| Course planner     | `services/course-plan/coursePlanService.ts`    | editor course-plan/semester-plan (header upsert + slot replace) **+ faculty-role (replace)**, teaching-preferences POST; `GET /api/v1/courses/active` feeds the preference grid |
| Course area tags   | `services/courseTags/courseTagService.ts`      | editor area-tag-master (list) + course-area-tag (per-course create/remove); `GET /api/v1/courses/active` for the course picker |

---

## How to add a field

### A. New column on an _editable_ `cfp_*` table (Editor route)

1. **DB**: `ALTER TABLE ubs_emp.cfp_... ADD COLUMN ...` (your call — the app
   never alters tables).
2. **Route**: add `new Field("cfp_table.new_col").validator(...)` in the
   route's `buildEditor()` (`src/app/api/editor/<name>/route.ts`). Use
   `Validate.values([...])` for enums, `Validate.maxLen(n)` for varchars,
   `.set(false)` if read-only.
3. **Client service**: add the column to the row interface and load/save
   payloads (`committeeMatrixService.ts` or `coursePlanService.ts`).
4. **UI**: render/edit it in `CommitteeMatrixView.tsx` /
   `CoursePreferenceView.tsx` (+ the diff in the save handler).
5. Optional: extend `tests/api/editorRoutes.db.test.ts`.

### B. New field on the faculty _list_

1. Add the select alias in `listFaculty` (`src/server/queries/faculty.ts:74`)
   — joins are 1:1, so a plain `"tbl.col as wireName"` is enough.
2. Add the same field to the mock records (`src/data/facultyMockData.ts`) so
   local mode stays in parity.
3. Surface it: `src/types/faculty.ts` (Faculty interface) →
   `src/services/faculty/facultyMapper.ts` (`normalizeField(record?.wireName)`)
   → the component (`FacultyTable.tsx`).

### C. New field on the faculty _detail_

Same as B, but in `getFacultyDetail` (`faculty.ts:162`): either add a column
to one of the 9 parallel queries or add a 10th query to the `Promise.all`,
then add it to the assembled return object → mapper → detail component
(`FacultySummaryCard` / `FacultyAboutCard` / a tab).

### D. New read endpoint entirely

1. Query module in `src/server/queries/<thing>.ts` (import `getDb`, alias
   columns to camelCase).
2. Add the function to the `FacultyDataSource` contract
   (`src/server/data/types.ts`), wire it in `src/server/data/index.ts`, and
   give `src/server/mocks/index.ts` a mock implementation.
3. Route handler under `src/app/api/v1/.../route.ts` (copy an existing one —
   `runtime nodejs`, `force-dynamic`, `withErrorHandler`, `ok()` envelope).
4. Client fetcher + component.

---

## Constraints cheat sheet (live DB, verified 2026-06)

- `cfp_committee_assignment`: UNIQUE `(catalog_id, userid, academic_year)`;
  `role_code` ENUM P/C/V/X/A. UI mapping: role columns X↔P; committee
  columns R↔P, C↔C, V↔V, M↔X (A displays as M).
- `cfp_faculty_course_plan`: UNIQUE `(person_number, academic_year)`;
  `faculty_type` ENUM; `locked` gates all plan/slot writes.
- `cfp_faculty_semester_plan`: FK → course_plan `ON DELETE CASCADE`;
  `term` / `slot_status` ENUMs; `slot_comment` ≤ 60.
- `cfp_committee_service_summary`: UNIQUE `(userid, academic_year)`.
- `cfp_faculty_role`: surrogate PK `role_id`; UNIQUE
  `(person_number, academic_year, role)`; `role` ∈ `ALL_ROLES`. Drives the
  teaching-load release (Chair −2.5; DGS/DUS/Admissions −1; others 0).
- `cfp_faculty_leave`: PK `leave_id`; `leave_type` constrained to `LEAVE_TYPES`
  at the app layer (no DB enum). **Writable** via the leave editor (a
  pre-existing `cfp_*` table added to the allowlist).
- `cfp_area_tag_master`: PK `tag_id`; UNIQUE `name`; seeded with
  AI/Systems/PL/Theory/Special Topics by the migration.
- `cfp_course_area_tag`: PK `course_area_tag_id`; UNIQUE `(crse_id, tag_id)`;
  FK `tag_id → cfp_area_tag_master` `ON DELETE CASCADE`.
- `people.cfp_faculty_teaching_prefs`: UNIQUE `(userid, crse_id, term_code)`;
  CHECK `pref BETWEEN 0 AND 5` (widened from 0–4 by
  `db/migration/widen_teaching_pref_check.sql`);
  CHECK `term_code REGEXP '^[0-9]{3}[569]$'`.
- Everything else (`ps_rpt.*`, `dce.*`, `committees.*`, `people.*` non-prefs,
  `cfp_faculty`, `cfp_appointments`, `cfp_faculty_primary_*`,
  `cfp_teaching_reductions`, `cfp_faculty_load_balance`) is **read-only** by
  ground rule and by the app's allowlist.
- Currently unpopulated on the dev DB: `cfp_faculty`, `cfp_appointments`,
  primary-contact tables, `dce.person_number`, `ub_display_name_v`,
  `phd_advisors`, `sunycard.cfp_cse_faculty_photos_v` — the roster stays
  empty until these are loaded.
- **Declared FKs** are sparse by design (legacy MySQL schemas). Enforced ones:
  `committees.members.committee_id → committees.id`,
  `ubs_emp.cfp_committee_assignment.catalog_id → cfp_committee_catalog`,
  `ubs_emp.cfp_faculty_semester_plan.course_plan_id → cfp_faculty_course_plan`,
  and `ubs_emp.cfp_course_area_tag.tag_id → cfp_area_tag_master` (the last two
  with `ON DELETE CASCADE`). All other "relationships" above are join
  conventions, not enforced constraints.
- The UNIQUE indexes and CHECK constraints listed in this section are **not**
  in the column export (it only carries per-column PRI/UNI/MUL flags); they
  come from the migration DDL and the app's runtime guards. Re-run
  [`scripts/db-schema/export_schema.py`](../scripts/db-schema/export_schema.py)
  after any `ALTER` to refresh the committed snapshot.
