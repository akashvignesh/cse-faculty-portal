# SQL Reference — every database call in this project

A map of all SQL the app issues, where it lives, what it touches, and how to
add a field at each layer. All SQL is server-side only, in two places:

1. **Plain knex queries** — `src/server/queries/*.ts` (reads + teaching-pref
   writes). Used by the `/api/v1/*` routes.
2. **DataTables Editor instances** — `src/app/api/editor/*/route.ts`
   (generated CRUD SQL for the six editable `cfp_*` tables).

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
USING utf8mb4)` on both sides of joins (legacy schemas are latin1).

---

## 1. Identity bridge — `src/server/queries/identity.ts`

`dce.person_number` maps `person_number` ↔ `principal` (userid). Composite
PK means several principals per person; all lookups `ORDER BY` for
determinism.

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
       COALESCE(app.in_house_title, app.official_job_title) AS title,
       app.appointment_type                              AS rank,
       app.standard_course_load                          AS standardLoad,
       pe.email_address                                  AS primaryEmail,
       pa.address_line1 ... pa.country                   -- assembled in TS
FROM cfp_faculty f
LEFT JOIN ps_rpt.ub_display_name_v n   ON n.emplid = f.person_number      -- CONVERT both sides
LEFT JOIN (SELECT person_number, MIN(principal) principal
           FROM dce.person_number GROUP BY person_number) dpn ON ...      -- dedup principals
LEFT JOIN cfp_appointments app          ON app.person_number = f.person_number   -- 1 row per person
LEFT JOIN cfp_faculty_primary_email pe  ON pe.person_number  = f.person_number
LEFT JOIN cfp_faculty_primary_address pa ON pa.person_number = f.person_number
WHERE COALESCE(n.name_display, f.person_number) LIKE '%token%'  -- per search token
ORDER BY n.name_display IS NULL, n.name_display, f.person_number
LIMIT ? OFFSET ?
```

Plus a `COUNT(*)` over the same `FROM`/`WHERE` for pagination. Office
address is formatted in TS (`formatOfficeAddress`). The aliases are the
wire field names the frontend mapper consumes.

## 3. Faculty detail — `getFacultyDetail` in `src/server/queries/faculty.ts:162`

Route: `GET /api/v1/faculty/[id]`. One anchor query + 8 parallel queries,
each keyed by the resolved `person_number`:

| #      | Table (line)                                                    | Columns → wire aliases                                                                                                                                        |
| ------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| anchor | `cfp_faculty` (169)                                             | `person_number→personNumber`, `cv_document_id→cvDocumentId`                                                                                                   |
| 1      | `ps_rpt.ub_display_name_v` (≈178)                               | `name_display→fullName` (fallback personNumber)                                                                                                               |
| 2      | `dce.person_number` (184)                                       | `principal→userid`                                                                                                                                            |
| 3      | `cfp_appointments` (198)                                        | `official_job_title→title`, `appointment_type→rank`, `in_house_title→titleLine`, `standard_course_load→standardLoad`, `next_promotion_date→nextPromotionDate` |
| 4      | `cfp_faculty_primary_email` (212)                               | `email_address→contact.email`                                                                                                                                 |
| 5      | `cfp_faculty_primary_phone_number` (217)                        | `phone_number→contact.phone`                                                                                                                                  |
| 6      | `cfp_faculty_primary_address` (229)                             | `address_line1/2, city, state_province, postal_code, country → contact.officeAddress{}` + formatted `officeAddress`                                           |
| 7      | `cfp_faculty_research_areas` ⋈ `cfp_research_area_master` (234) | `area_name → researchAreas[]`                                                                                                                                 |
| 8      | `cfp_teaching_reductions` (247)                                 | `term_code→termCode`, `reduction_type→reductionType`, `reduction_load→reductionAmount`, `reason`, `approval_document_id→approvalDocumentId`, `dt→createdAt`   |
| 9      | `cfp_faculty_leave` (262)                                       | `leave_type→leaveType`, `start_date`, `end_date`, `location`, `reason`, `backup_person_number→backupFacultyPersonNumber`                                      |

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
Editor). Table: `people.cfp_faculty_teaching_prefs`
(`userid, crse_id, term_code, pref, editor, dt, ts`; unique
`(userid, crse_id, term_code)`).

| Function                             | SQL                                                                                                                                                                                                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getTeachingPreferences` (line 60)   | `SELECT ftp.userid facultyId, ftp.crse_id courseId, ftp.pref, ftp.term_code termCode, cc.primarycatalognumber, cc.coursetitlelong FROM people.cfp_faculty_teaching_prefs ftp LEFT JOIN (ranked catalog) cc ON cc.crse_id = ftp.crse_id WHERE ftp.userid = ? ORDER BY crse_id` |
| `resolveCatalogCourse` (≈104)        | `SELECT crse_id, ... FROM (ranked catalog) WHERE TRIM(primarycatalognumber)=? AND TRIM(coursetitlelong)=?` — input `"<catalog>-<title>"`; 0 hits → 404, >1 → 409                                                                                                              |
| `saveTeachingPreferences` (line 157) | per item, keyed `(userid, crse_id, term_code)`: pref null → `DELETE`; else `UPDATE ... SET pref=?, editor=?, ts=NOW()` (rows>0 → UPDATED) or `INSERT (userid, crse_id, term_code, pref, editor, ts)` (→ SAVED)                                                                |

Live-DB guard rails enforced **before** SQL (clear 400s):
`termCode` required + must match `^[0-9]{3}[569]$` (DB CHECK), `pref` 0..4
(`chk_pref_range` — UI scale is 0..5; widen the CHECK to enable 5).

## 6. Committees / courses (legacy reads)

| Function                                      | Route                                        | SQL                                                                                                                                                      |
| --------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getCommitteeMemberships` — `committees.ts:6` | `GET /api/v1/committees/memberships?userId=` | `SELECT c.name committeeName, m.role FROM committees.committees c JOIN committees.members m ON m.committee_id = c.id WHERE m.userid = ? ORDER BY c.name` |
| `getActiveCourses` — `courses.ts:13`          | `GET /api/v1/courses/active`                 | ranked `ps_rpt.ps_course_catalog_v` (latest active row per `crse_id`) → `courseId`, `subject`, `courseName` (`"<catalog>-<title>"`)                      |

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
| `service-categories`    | `cfp_service_categories`                               | **GET-only** plain knex: `SELECT category, label, points ORDER BY category` (static seed fallback in local mode)                                  | —                                                                     | —                                                  |

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

| UI                 | Client service                                 | API                                                                                        |
| ------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Roster page        | `services/faculty/facultyService.ts`           | `GET /api/v1/faculty?size=500`                                                             |
| Detail page + tabs | `services/faculty/facultyDetailService.ts`     | detail, teaching-history, memberships, teaching-preferences (lazy per tab)                 |
| Committee matrix   | `services/committee/committeeMatrixService.ts` | editor catalog/assignments/service-summary (load + diff-save), service-categories          |
| Course planner     | `services/course-plan/coursePlanService.ts`    | editor course-plan/semester-plan (header upsert + slot replace), teaching-preferences POST |

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
- `people.cfp_faculty_teaching_prefs`: UNIQUE `(userid, crse_id, term_code)`;
  CHECK `pref BETWEEN 0 AND 4` (widen to 0–5 for the full UI scale);
  CHECK `term_code REGEXP '^[0-9]{3}[569]$'`.
- Everything else (`ps_rpt.*`, `dce.*`, `committees.*`, `people.*` non-prefs,
  `cfp_faculty`, `cfp_appointments`, `cfp_faculty_primary_*`,
  `cfp_faculty_leave`, `cfp_teaching_reductions`, `cfp_faculty_load_balance`)
  is **read-only** by ground rule and by the app's allowlist.
- Currently unpopulated on the dev DB: `cfp_faculty`, `cfp_appointments`,
  primary-contact tables, `dce.person_number`, `ub_display_name_v`,
  `phd_advisors`, `sunycard.cfp_cse_faculty_photos_v` — the roster stays
  empty until these are loaded.
