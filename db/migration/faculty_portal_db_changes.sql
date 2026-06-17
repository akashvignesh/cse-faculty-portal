-- =============================================================================
-- Faculty Portal — DB change script  (Teaching Preference + Committee)
-- Target: MySQL 8 / MariaDB
-- GROUND RULE: no ALTER to any existing table. Only NEW cfp_* tables (in ubs_emp).
-- Existing tables (committees.*, people.*, ps_rpt.*, current cfp_*) are read-only.
-- Idempotent: CREATE TABLE IF NOT EXISTS; seeds use INSERT … WHERE NOT EXISTS.
--
-- NOTE: ubs_emp defaults to latin1; these new tables are forced to utf8mb4 so text
--       comparisons against utf8mb4 literals don't raise "illegal mix of collations".
--
-- Confirmed against live dump:
--   people.cfp_faculty_teaching_prefs(userid,crse_id,term_code,pref tinyint,…)  -- per-year ready
--   ubs_emp.cfp_faculty_load_balance(person_number,term_code,standard/actual/diff/carry) -- read-only
--   committees.committees(id,name,…) / committees.members(committee_id,userid,role) -- read-only, seed source
--   term_code: [century][YY][term]; 20xx=3, Fall=9 → Fall 2025 = '3259'
-- =============================================================================

-- Clean slate for re-runs — all brand-new, empty cfp_* tables (children first).
DROP TABLE IF EXISTS ubs_emp.cfp_committee_assignment;
DROP TABLE IF EXISTS ubs_emp.cfp_committee_service_summary;
DROP TABLE IF EXISTS ubs_emp.cfp_committee_catalog;
DROP TABLE IF EXISTS ubs_emp.cfp_service_categories;
DROP TABLE IF EXISTS ubs_emp.cfp_faculty_semester_plan;
DROP TABLE IF EXISTS ubs_emp.cfp_faculty_course_plan;
DROP TABLE IF EXISTS ubs_emp.cfp_faculty_role;
DROP TABLE IF EXISTS ubs_emp.cfp_course_area_tag;
DROP TABLE IF EXISTS ubs_emp.cfp_area_tag_master;

-- ── A. TEACHING PREFERENCE ───────────────────────────────────────────────────
-- A1 (no DDL): people.cfp_faculty_teaching_prefs already has term_code + pref.
--   • pref scale 0..5 — verify no leftover CHECK 0..4 on that table; widen if present.
--   • Backend: thread term_code (Fall anchor) through INSERT/UPDATE/DELETE/COUNT.

-- A2a. Planner header — one row per faculty per academic year
CREATE TABLE IF NOT EXISTS ubs_emp.cfp_faculty_course_plan (
  course_plan_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  person_number  VARCHAR(8) NOT NULL,
  academic_year  VARCHAR(9) NOT NULL,                              -- '2025-2026'
  faculty_type   ENUM('Prof Track','Lecture 10','Lecture 12') NULL,
  locked         TINYINT NOT NULL DEFAULT 0,
  editor         VARCHAR(8) NULL,
  dt             DATETIME NULL,
  ts             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (course_plan_id),
  UNIQUE KEY uq_plan_person_year (person_number, academic_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- A2b. Semester-plan slots (Teaching/Not-Teaching + comment; biannual carry logic)
CREATE TABLE IF NOT EXISTS ubs_emp.cfp_faculty_semester_plan (
  semester_plan_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  course_plan_id   BIGINT UNSIGNED NOT NULL,
  term             ENUM('summer','fall','spring') NOT NULL,
  slot_status      ENUM('Teaching','Not Teaching') NOT NULL,
  slot_comment     VARCHAR(60) NULL,        -- 'Regular','Biannual','Deferred or Taught Biannual','Course Buyout',…
  editor           VARCHAR(8) NULL,
  dt               DATETIME NULL,
  ts               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (semester_plan_id),
  KEY idx_slot_plan (course_plan_id),
  CONSTRAINT fk_slot_plan FOREIGN KEY (course_plan_id)
    REFERENCES ubs_emp.cfp_faculty_course_plan (course_plan_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- A3. Faculty roles per academic year. Drives the teaching-load release
-- (Chair −2.5; DGS/DUS/Admissions −1; others 0) and can seed committee leadership.
-- Surrogate pkey for the Editor protocol; business key is unique.
CREATE TABLE IF NOT EXISTS ubs_emp.cfp_faculty_role (
  role_id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  person_number VARCHAR(8)  NOT NULL,
  academic_year VARCHAR(9)  NOT NULL,                          -- '2025-2026'
  role          VARCHAR(64) NOT NULL,                          -- 'Chair','Director of Graduate Studies',…
  editor        VARCHAR(8)  NULL,
  dt            DATETIME    NULL,
  ts            TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id),
  UNIQUE KEY uq_faculty_role (person_number, academic_year, role),
  KEY idx_role_person_year (person_number, academic_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── B. COMMITTEE ─────────────────────────────────────────────────────────────

-- B3. Category → points lookup
CREATE TABLE IF NOT EXISTS ubs_emp.cfp_service_categories (
  category TINYINT NOT NULL,
  label    VARCHAR(120) NOT NULL,
  points   DECIMAL(5,2) NOT NULL,
  PRIMARY KEY (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
INSERT INTO ubs_emp.cfp_service_categories (category,label,points) VALUES
  (1,'SEAS / Pools / low',1),
  (2,'Learning / Planning / Assessment',2),
  (3,'Searches / GAC / UGAC / Admissions / Executive / Task forces',3),
  (4,'Directors (DGS/DGA/DUS, Dir. Research, Center Dir.)',5),
  (5,'Associate Chair',8),
  (6,'Chair',15)
ON DUPLICATE KEY UPDATE label=VALUES(label), points=VALUES(points);

-- B1. Matrix columns (our own list of committees + leadership roles)
CREATE TABLE IF NOT EXISTS ubs_emp.cfp_committee_catalog (
  catalog_id          INT NOT NULL AUTO_INCREMENT,
  source_committee_id INT NULL,                                    -- → committees.committees.id (NULL = leadership)
  name                VARCHAR(255) NOT NULL,
  kind                ENUM('leadership','committee','taskforce','seas','pool') NULL,
  service_category    TINYINT NULL,
  display_order       INT NULL,
  editor              VARCHAR(8) NULL,
  dt                  DATETIME NULL,
  ts                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (catalog_id),
  UNIQUE KEY uq_catalog_name (name),
  UNIQUE KEY uq_catalog_source (source_committee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- B1 seed: 5 leadership rows (no source committee). Compares only utf8mb4 ↔ utf8mb4.
INSERT INTO ubs_emp.cfp_committee_catalog (source_committee_id,name,kind,service_category,display_order)
SELECT * FROM (
  SELECT NULL,'Chair',               'leadership',6,10 UNION ALL
  SELECT NULL,'Associate Chair',     'leadership',5,20 UNION ALL
  SELECT NULL,'DGS, DGA, DUS',       'leadership',4,30 UNION ALL
  SELECT NULL,'Director of Research','leadership',4,40 UNION ALL
  SELECT NULL,'Center Director',     'leadership',4,50
) AS s(source_committee_id,name,kind,service_category,display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM ubs_emp.cfp_committee_catalog c
  WHERE c.kind='leadership' AND c.name = s.name
);

-- B1 seed: mirror the real committees. Dedup on INT source_committee_id (no collation clash).
INSERT INTO ubs_emp.cfp_committee_catalog (source_committee_id,name,kind,display_order)
SELECT cc.id, cc.name, 'committee', 100 + cc.id
FROM committees.committees cc
WHERE NOT EXISTS (
  SELECT 1 FROM ubs_emp.cfp_committee_catalog x WHERE x.source_committee_id = cc.id
);

-- B1 categorize the mirrored committees (per the workbook's Category Load sheet).
-- Idempotent; name IN (...) compares utf8mb4 col ↔ utf8mb4 literals. Adjust names if they differ.
UPDATE ubs_emp.cfp_committee_catalog SET service_category=3, kind='committee' WHERE name IN
  ('Tenure Track Faculty Search','Lecturer Search','GAC (+Grad Student Awards)',
   'UGAC (+UG Student Awards)','Grad Admissions','Executive');
UPDATE ubs_emp.cfp_committee_catalog SET service_category=2, kind='committee' WHERE name IN
  ('Colloquium Upbeat','Student Engagement and Experiential Learning','Strategic Planning',
   'Faculty Evaluation and Award','Teaching Effectiveness & TA training','Grievance','Internships',
   'Distinguished Speakers','Cooperation and Promotion','UG Program Assessment','Grad Program Assessment',
   'Broadening Participation','Alumni and Community Outreach','Community Education Outreach (CSExplor)',
   'Documentation Governance','Hospitality');
UPDATE ubs_emp.cfp_committee_catalog SET service_category=3, kind='taskforce' WHERE name IN
  ('Student Effectiveness Task Force');
UPDATE ubs_emp.cfp_committee_catalog SET service_category=2, kind='taskforce' WHERE name IN
  ('CE Focus Task Force','ABET Preparation Task Force');
UPDATE ubs_emp.cfp_committee_catalog SET service_category=1, kind='seas' WHERE name IN
  ('SEAS Tenure Committee','SEAS Promotion Committee','SEAS Faculty Awards Committee',
   'SEAS Qualified Rank Promotion');
UPDATE ubs_emp.cfp_committee_catalog SET service_category=1, kind='pool' WHERE name IN
  ('SEAS Grievance Pool','UB Grievance Pool');

-- B2. Per-year committee assignments (our editable matrix cells)
CREATE TABLE IF NOT EXISTS ubs_emp.cfp_committee_assignment (
  assignment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  catalog_id    INT NOT NULL,
  userid        VARCHAR(8) NOT NULL,
  role_code     ENUM('P','C','V','X','A') NOT NULL,               -- Position/Chair/Vice-Chair/Member/Alternate
  academic_year VARCHAR(9) NOT NULL,
  editor        VARCHAR(8) NULL,
  dt            DATETIME NULL,
  ts            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (assignment_id),
  UNIQUE KEY uq_assign (catalog_id, userid, academic_year),
  KEY idx_assign_user (userid),
  CONSTRAINT fk_assign_catalog FOREIGN KEY (catalog_id)
    REFERENCES ubs_emp.cfp_committee_catalog (catalog_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- B2 auto-populate (members → matrix, roles → leadership) is a separate,
-- re-runnable, NON-DESTRUCTIVE step so it never clobbers manual matrix edits:
--   db/migration/autofill_committee_assignments.sql   (set @ay to the target year)

-- B4. Per-faculty manual summary (computed columns derived live, not stored)
CREATE TABLE IF NOT EXISTS ubs_emp.cfp_committee_service_summary (
  service_summary_id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  userid                  VARCHAR(8) NOT NULL,
  academic_year           VARCHAR(9) NOT NULL,
  others_count            INT NULL,
  service_points_override DECIMAL(5,2) NULL,
  comments                VARCHAR(1024) NULL,
  editor                  VARCHAR(8) NULL,
  dt                      DATETIME NULL,
  ts                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (service_summary_id),
  UNIQUE KEY uq_summary_user_year (userid, academic_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── C. COURSE AREA TAGS (supplement the course catalog; PDF p1) ───────────────
-- C1. Canonical area-tag list (seeded reference data).
CREATE TABLE IF NOT EXISTS ubs_emp.cfp_area_tag_master (
  tag_id INT NOT NULL AUTO_INCREMENT,
  name   VARCHAR(64) NOT NULL,
  editor VARCHAR(8) NULL,
  dt     DATETIME NULL,
  ts     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (tag_id),
  UNIQUE KEY uq_area_tag_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO ubs_emp.cfp_area_tag_master (name) VALUES
  ('AI'), ('Systems'), ('PL'), ('Theory'), ('Special Topics')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- C2. Course → area-tag mapping (a course can carry multiple tags).
CREATE TABLE IF NOT EXISTS ubs_emp.cfp_course_area_tag (
  course_area_tag_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  crse_id            VARCHAR(10) NOT NULL,           -- ps_rpt.ps_course_catalog_v.crse_id
  tag_id             INT NOT NULL,
  editor             VARCHAR(8) NULL,
  dt                 DATETIME NULL,
  ts                 TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (course_area_tag_id),
  UNIQUE KEY uq_course_tag (crse_id, tag_id),
  KEY idx_course_tag_crse (crse_id),
  CONSTRAINT fk_course_tag_master FOREIGN KEY (tag_id)
    REFERENCES ubs_emp.cfp_area_tag_master (tag_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
