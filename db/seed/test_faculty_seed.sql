-- =============================================================================
-- TEST FACULTY SEED — 5 solid records across every table the portal reads
-- Target: MySQL 8 (oceanus, ubs_emp + cross-schema). Run via the 3307 tunnel.
--
-- SAFE-TO-REMOVE: every row this script writes is tagged editor='SEEDTEST'
-- where the table has an editor column; the rest are removed by their explicit
-- keys in test_faculty_unseed.sql. This script ONLY INSERTs.
--
-- LEVERAGES (reads, never writes/deletes) existing real data:
--   committees.committees / committees.members  → Committee tab (by userid)
--   ps_rpt.classschedule_v                       → Teaching History (by person_number)
--   ps_rpt.ps_course_catalog_v                   → course names for prefs
-- The 5 person_numbers below were chosen because they already have rows in
-- classschedule_v AND their userid already exists in committees.members, so
-- those two tabs light up with real data.
--
-- The 5 (person_number / userid / name):
--   28010859 alphonce  ALPHONCE, BO CARL GORAN   (promotion history: 3 appts)
--   37912417 chandola  CHANDOLA, VARUN
--   38071471 changyou  CHEN, CHANGYOU
--   37912425 kdantu    DANTU, KARTHIK            (promotion history: 2 appts)
--   38093483 eblanton  BLANTON, ETHAN
-- Re-running: run test_faculty_unseed.sql first (this script is not idempotent).
-- =============================================================================

-- ── 1. Identity: display name (ps_rpt.ub_display_name_v) + person↔userid bridge (dce) ──
INSERT INTO ps_rpt.ub_display_name_v
  (emplid, name_type, effdt, eff_status, name, name_prefix, name_suffix, last_name, first_name, middle_name, name_display, name_formal)
VALUES
  ('28010859','PRI','2015-01-01','A','ALPHONCE, BO CARL GORAN','','','ALPHONCE','BO CARL GORAN','','ALPHONCE, BO CARL GORAN','ALPHONCE, BO CARL GORAN'),
  ('37912417','PRI','2015-01-01','A','CHANDOLA, VARUN','','','CHANDOLA','VARUN','','CHANDOLA, VARUN','CHANDOLA, VARUN'),
  ('38071471','PRI','2015-01-01','A','CHEN, CHANGYOU','','','CHEN','CHANGYOU','','CHEN, CHANGYOU','CHEN, CHANGYOU'),
  ('37912425','PRI','2015-01-01','A','DANTU, KARTHIK','','','DANTU','KARTHIK','','DANTU, KARTHIK','DANTU, KARTHIK'),
  ('38093483','PRI','2015-01-01','A','BLANTON, ETHAN','','','BLANTON','ETHAN','','BLANTON, ETHAN','BLANTON, ETHAN');

INSERT INTO dce.person_number (person_number, principal, status, dt) VALUES
  ('28010859','alphonce','A',NOW()),
  ('37912417','chandola','A',NOW()),
  ('38071471','changyou','A',NOW()),
  ('37912425','kdantu','A',NOW()),
  ('38093483','eblanton','A',NOW());

-- ── 2. Faculty membership (cfp_faculty) ──
INSERT INTO ubs_emp.cfp_faculty (person_number, cv_document_id, editor, dt) VALUES
  ('28010859', NULL, 'SEEDTEST', NOW()),
  ('37912417', NULL, 'SEEDTEST', NOW()),
  ('38071471', NULL, 'SEEDTEST', NOW()),
  ('37912425', NULL, 'SEEDTEST', NOW()),
  ('38093483', NULL, 'SEEDTEST', NOW());

-- ── 3. Appointments (cfp_appointments) — multiple rows where there is promotion
--      history; the app picks the latest by appointment_effective_date ──
INSERT INTO ubs_emp.cfp_appointments
  (person_number, employer, appointment_type, appointment_term, base_entity, official_job_title, in_house_title, standard_course_load, next_promotion_date, appointment_effective_date, appointment_end_date, editor, dt)
VALUES
  -- ALPHONCE: Assistant -> Associate -> Professor of Teaching (current = latest)
  ('28010859','State','FACULTY','TERM','1079','LECT 10','ASSISTANT PROFESSOR OF TEACHING',2.00,NULL,'2014-08-17','2019-08-16','SEEDTEST',NOW()),
  ('28010859','State','FACULTY','TERM','1079','LECT 10','ASSOCIATE PROFESSOR OF TEACHING',2.00,NULL,'2019-08-17','2023-08-16','SEEDTEST',NOW()),
  ('28010859','State','FACULTY','TERM','1079','LECT 10','PROFESSOR OF TEACHING',2.00,'2026-08-01','2023-08-17','2026-08-12','SEEDTEST',NOW()),
  -- CHANDOLA (tenured associate)
  ('37912417','State','FACULTY','TENURE','1079','ASSO PROF 10','ASSOCIATE PROFESSOR 10 MONTHS',2.00,NULL,'2025-08-14','9999-12-31','SEEDTEST',NOW()),
  -- CHEN CHANGYOU (tenured associate)
  ('38071471','State','FACULTY','TENURE','1079','ASSO PROF 10','ASSOCIATE PROFESSOR 10 MONTHS',2.00,NULL,'2024-08-15','9999-12-31','SEEDTEST',NOW()),
  -- DANTU: Assistant -> Associate (current = latest)
  ('37912425','State','FACULTY','TERM','1079','ASST PROF 10','ASSISTANT PROFESSOR 10 MONTHS',2.00,NULL,'2013-08-15','2021-07-12','SEEDTEST',NOW()),
  ('37912425','State','FACULTY','TENURE','1079','ASSO PROF 10','ASSOCIATE PROFESSOR 10 MONTHS',2.00,NULL,'2021-07-13','9999-12-31','SEEDTEST',NOW()),
  -- BLANTON ETHAN (lecturer)
  ('38093483','State','FACULTY','TERM','1079','LECT 10','LECTURER (10 MONTH)',3.00,NULL,'2024-09-01','2027-08-31','SEEDTEST',NOW());

-- ── 4. Contact: personal email, phone, personal/mailing address ──
INSERT INTO ubs_emp.cfp_faculty_primary_email (person_number, email_address, editor, dt) VALUES
  ('28010859','bo.alphonce@gmail.com','SEEDTEST',NOW()),
  ('37912417','varun.chandola@gmail.com','SEEDTEST',NOW()),
  ('38071471','changyou.chen@gmail.com','SEEDTEST',NOW()),
  ('37912425','karthik.dantu@gmail.com','SEEDTEST',NOW()),
  ('38093483','ethan.blanton@gmail.com','SEEDTEST',NOW());

INSERT INTO ubs_emp.cfp_faculty_primary_phone_number (person_number, phone_number, editor, dt) VALUES
  ('28010859','+1-716-645-3180','SEEDTEST',NOW()),
  ('37912417','+1-716-645-3181','SEEDTEST',NOW()),
  ('38071471','+1-716-645-3182','SEEDTEST',NOW()),
  ('37912425','+1-716-645-3183','SEEDTEST',NOW()),
  ('38093483','+1-716-645-3184','SEEDTEST',NOW());

INSERT INTO ubs_emp.cfp_faculty_primary_address
  (person_number, address_line1, address_line2, city, state_province, postal_code, country, editor, dt)
VALUES
  ('28010859','100 Elmwood Ave','Apt 2','Buffalo','NY','14201','USA','SEEDTEST',NOW()),
  ('37912417','215 Hertel Ave',NULL,'Buffalo','NY','14207','USA','SEEDTEST',NOW()),
  ('38071471','77 Main St',NULL,'Williamsville','NY','14221','USA','SEEDTEST',NOW()),
  ('37912425','310 Maple Rd',NULL,'Amherst','NY','14226','USA','SEEDTEST',NOW()),
  ('38093483','5 Parkside Ave',NULL,'Buffalo','NY','14214','USA','SEEDTEST',NOW());

-- ── 5. Research areas (master + per-faculty links) ──
INSERT INTO ubs_emp.cfp_research_area_master (area_name, editor, dt) VALUES
  ('Computer Science Education','SEEDTEST',NOW()),
  ('Programming Languages','SEEDTEST',NOW()),
  ('Machine Learning','SEEDTEST',NOW()),
  ('Data Mining','SEEDTEST',NOW()),
  ('Anomaly Detection','SEEDTEST',NOW()),
  ('Deep Learning','SEEDTEST',NOW()),
  ('Bayesian Methods','SEEDTEST',NOW()),
  ('Robotics','SEEDTEST',NOW()),
  ('Embedded Systems','SEEDTEST',NOW()),
  ('Mobile Computing','SEEDTEST',NOW()),
  ('Computer Systems','SEEDTEST',NOW()),
  ('Computer Networking','SEEDTEST',NOW()),
  ('Computer Security','SEEDTEST',NOW());

INSERT INTO ubs_emp.cfp_faculty_research_areas (person_number, research_area_id, editor, dt)
SELECT '28010859', research_area_id, 'SEEDTEST', NOW() FROM ubs_emp.cfp_research_area_master
  WHERE editor='SEEDTEST' AND area_name IN ('Computer Science Education','Programming Languages');
INSERT INTO ubs_emp.cfp_faculty_research_areas (person_number, research_area_id, editor, dt)
SELECT '37912417', research_area_id, 'SEEDTEST', NOW() FROM ubs_emp.cfp_research_area_master
  WHERE editor='SEEDTEST' AND area_name IN ('Machine Learning','Data Mining','Anomaly Detection');
INSERT INTO ubs_emp.cfp_faculty_research_areas (person_number, research_area_id, editor, dt)
SELECT '38071471', research_area_id, 'SEEDTEST', NOW() FROM ubs_emp.cfp_research_area_master
  WHERE editor='SEEDTEST' AND area_name IN ('Machine Learning','Deep Learning','Bayesian Methods');
INSERT INTO ubs_emp.cfp_faculty_research_areas (person_number, research_area_id, editor, dt)
SELECT '37912425', research_area_id, 'SEEDTEST', NOW() FROM ubs_emp.cfp_research_area_master
  WHERE editor='SEEDTEST' AND area_name IN ('Robotics','Embedded Systems','Mobile Computing');
INSERT INTO ubs_emp.cfp_faculty_research_areas (person_number, research_area_id, editor, dt)
SELECT '38093483', research_area_id, 'SEEDTEST', NOW() FROM ubs_emp.cfp_research_area_master
  WHERE editor='SEEDTEST' AND area_name IN ('Computer Systems','Computer Networking','Computer Security');

-- ── 6. Leave (only some, for variety) ──
INSERT INTO ubs_emp.cfp_faculty_leave
  (person_number, leave_type, start_date, end_date, location, reason, backup_person_number, editor, dt)
VALUES
  ('28010859','Sabbatical – Semester (SS)','2025-01-01','2025-06-30','Stanford University','Research sabbatical',NULL,'SEEDTEST',NOW()),
  ('37912425','Paid Leave (PL)','2024-01-15','2024-04-15','Buffalo, NY','Family leave',NULL,'SEEDTEST',NOW());

-- ── 7. Awards (ubs_rf.award_v; no editor column → removed by award_number) ──
INSERT INTO ubs_rf.award_v (award_number, person_number, title, award_start, award_end, dt) VALUES
  ('ALP001','28010859','SUNY Chancellor''s Award for Excellence in Teaching','2021-05-01','2021-12-31',NOW()),
  ('CHN001','37912417','NSF CAREER Award','2018-03-01','2023-02-28',NOW()),
  ('CHE001','38071471','Google Faculty Research Award','2020-09-01','2021-08-31',NOW()),
  ('DAN001','37912425','NSF CAREER Award','2019-06-01','2024-05-31',NOW());

-- ── 8. PhD students (people.phd_advisors; advisor = faculty userid) ──
INSERT INTO people.phd_advisors (userid, termsourcekey, advisor, pos, active, editor, dt) VALUES
  ('salp01','2259','alphonce',1,1,'SEEDTEST',NOW()),
  ('salp02','2259','alphonce',1,1,'SEEDTEST',NOW()),
  ('schn01','2259','chandola',1,1,'SEEDTEST',NOW()),
  ('schn02','2259','chandola',1,1,'SEEDTEST',NOW()),
  ('sche01','2259','changyou',1,1,'SEEDTEST',NOW()),
  ('sche02','2259','changyou',1,1,'SEEDTEST',NOW()),
  ('sdan01','2259','kdantu',1,1,'SEEDTEST',NOW()),
  ('sdan02','2259','kdantu',1,1,'SEEDTEST',NOW()),
  ('sdan03','2259','kdantu',1,1,'SEEDTEST',NOW()),
  ('sebl01','2259','eblanton',1,1,'SEEDTEST',NOW());

-- ── 9. Teaching preferences (people.cfp_faculty_teaching_prefs; real CSE crse_ids;
--      term_code 3259 = Fall 2025; pref 0..4 — 0 = Not Qualified (NQ).
--      NOTE: the live table still carries CHECK chk_pref_range (pref BETWEEN 0 AND 4),
--      so the design's "5 = Most Preferred" is NOT seeded here; widen that CHECK
--      (db/migration/widen_teaching_pref_check.sql) before seeding any pref=5 rows. ──
INSERT INTO people.cfp_faculty_teaching_prefs (userid, crse_id, term_code, pref, editor) VALUES
  ('alphonce','004544','3259',4,'SEEDTEST'),
  ('alphonce','004555','3259',3,'SEEDTEST'),
  ('chandola','004555','3259',4,'SEEDTEST'),
  ('chandola','004547','3259',2,'SEEDTEST'),
  ('chandola','004542','3259',0,'SEEDTEST'),   -- NQ (Not Qualified) example
  ('changyou','004544','3259',3,'SEEDTEST'),
  ('changyou','302047','3259',4,'SEEDTEST'),
  ('kdantu','004555','3259',4,'SEEDTEST'),
  ('kdantu','004545','3259',3,'SEEDTEST'),
  ('kdantu','004547','3259',0,'SEEDTEST'),     -- NQ (Not Qualified) example
  ('eblanton','004542','3259',4,'SEEDTEST'),
  ('eblanton','004544','3259',3,'SEEDTEST');

-- ── 10. Campus office (facilities.buildings + occupants; occupants.userid = principal) ──
INSERT INTO facilities.buildings (building, building_abbr, building_name, city, state, zipcode, ts) VALUES
  ('DVTEST','DVTEST','Davis Hall','Buffalo','NY','14260',NOW());

INSERT INTO facilities.occupants (bldabr, room, userid, editor, dt) VALUES
  ('DVTEST','338','alphonce','SEEDTEST',NOW()),
  ('DVTEST','305','chandola','SEEDTEST',NOW()),
  ('DVTEST','318','changyou','SEEDTEST',NOW()),
  ('DVTEST','340','kdantu','SEEDTEST',NOW()),
  ('DVTEST','345','eblanton','SEEDTEST',NOW());

-- ── 11. Course plan headers (ubs_emp.cfp_faculty_course_plan) — one per faculty/year.
--      faculty_type matches their appointment (LECT 10 → Lecture 10, prof → Prof Track).
--      alphonce gets a LOCKED prior year (2024-2025) to exercise the read-only path. ──
INSERT INTO ubs_emp.cfp_faculty_course_plan
  (person_number, academic_year, faculty_type, locked, editor, dt)
VALUES
  ('28010859','2025-2026','Lecture 10',0,'SEEDTEST',NOW()),
  ('28010859','2024-2025','Lecture 10',1,'SEEDTEST',NOW()),   -- locked prior year
  ('37912417','2025-2026','Prof Track',0,'SEEDTEST',NOW()),
  ('37912425','2025-2026','Prof Track',0,'SEEDTEST',NOW());

-- ── 12. Semester-plan slots (ubs_emp.cfp_faculty_semester_plan). course_plan_id is
--      AUTO_INCREMENT, so each slot resolves its parent by (person_number, academic_year).
--      Rows per faculty = standard load rounded up; summer omitted (does not count for
--      Lecture 10 / Prof Track). Exercises Teaching/Not-Teaching + the comment vocabulary. ──
INSERT INTO ubs_emp.cfp_faculty_semester_plan
  (course_plan_id, term, slot_status, slot_comment, editor, dt)
VALUES
  -- alphonce 2025-2026 (Lecture 10 → 6): fall 3, spring 3
  ((SELECT course_plan_id FROM ubs_emp.cfp_faculty_course_plan WHERE person_number='28010859' AND academic_year='2025-2026'),'fall','Teaching','Regular','SEEDTEST',NOW()),
  ((SELECT course_plan_id FROM ubs_emp.cfp_faculty_course_plan WHERE person_number='28010859' AND academic_year='2025-2026'),'fall','Teaching','Regular','SEEDTEST',NOW()),
  ((SELECT course_plan_id FROM ubs_emp.cfp_faculty_course_plan WHERE person_number='28010859' AND academic_year='2025-2026'),'fall','Teaching','Biannual','SEEDTEST',NOW()),
  ((SELECT course_plan_id FROM ubs_emp.cfp_faculty_course_plan WHERE person_number='28010859' AND academic_year='2025-2026'),'spring','Teaching','Regular','SEEDTEST',NOW()),
  ((SELECT course_plan_id FROM ubs_emp.cfp_faculty_course_plan WHERE person_number='28010859' AND academic_year='2025-2026'),'spring','Teaching','Regular','SEEDTEST',NOW()),
  ((SELECT course_plan_id FROM ubs_emp.cfp_faculty_course_plan WHERE person_number='28010859' AND academic_year='2025-2026'),'spring','Not Teaching','Deferred or Taught Biannual','SEEDTEST',NOW()),
  -- alphonce 2024-2025 (locked, Lecture 10 → 6): all Regular
  ((SELECT course_plan_id FROM ubs_emp.cfp_faculty_course_plan WHERE person_number='28010859' AND academic_year='2024-2025'),'fall','Teaching','Regular','SEEDTEST',NOW()),
  ((SELECT course_plan_id FROM ubs_emp.cfp_faculty_course_plan WHERE person_number='28010859' AND academic_year='2024-2025'),'fall','Teaching','Regular','SEEDTEST',NOW()),
  ((SELECT course_plan_id FROM ubs_emp.cfp_faculty_course_plan WHERE person_number='28010859' AND academic_year='2024-2025'),'fall','Teaching','Regular','SEEDTEST',NOW()),
  ((SELECT course_plan_id FROM ubs_emp.cfp_faculty_course_plan WHERE person_number='28010859' AND academic_year='2024-2025'),'spring','Teaching','Regular','SEEDTEST',NOW()),
  ((SELECT course_plan_id FROM ubs_emp.cfp_faculty_course_plan WHERE person_number='28010859' AND academic_year='2024-2025'),'spring','Teaching','Regular','SEEDTEST',NOW()),
  ((SELECT course_plan_id FROM ubs_emp.cfp_faculty_course_plan WHERE person_number='28010859' AND academic_year='2024-2025'),'spring','Teaching','Regular','SEEDTEST',NOW()),
  -- chandola 2025-2026 (Prof Track → 2.5 → 3): fall 2, spring 1
  ((SELECT course_plan_id FROM ubs_emp.cfp_faculty_course_plan WHERE person_number='37912417' AND academic_year='2025-2026'),'fall','Teaching','Regular','SEEDTEST',NOW()),
  ((SELECT course_plan_id FROM ubs_emp.cfp_faculty_course_plan WHERE person_number='37912417' AND academic_year='2025-2026'),'fall','Teaching','Biannual','SEEDTEST',NOW()),
  ((SELECT course_plan_id FROM ubs_emp.cfp_faculty_course_plan WHERE person_number='37912417' AND academic_year='2025-2026'),'spring','Teaching','Regular','SEEDTEST',NOW()),
  -- kdantu 2025-2026 (Prof Track → 3): fall 2 (one Course Buyout), spring 1
  ((SELECT course_plan_id FROM ubs_emp.cfp_faculty_course_plan WHERE person_number='37912425' AND academic_year='2025-2026'),'fall','Teaching','Regular','SEEDTEST',NOW()),
  ((SELECT course_plan_id FROM ubs_emp.cfp_faculty_course_plan WHERE person_number='37912425' AND academic_year='2025-2026'),'fall','Not Teaching','Course Buyout','SEEDTEST',NOW()),
  ((SELECT course_plan_id FROM ubs_emp.cfp_faculty_course_plan WHERE person_number='37912425' AND academic_year='2025-2026'),'spring','Teaching','Regular','SEEDTEST',NOW());

-- ── 13. Committee assignments (ubs_emp.cfp_committee_assignment) for 2025-2026.
--      Targets the 5 leadership rows the change script always seeds into
--      cfp_committee_catalog (resolved by name). role_code 'P' = Position holder. ──
INSERT INTO ubs_emp.cfp_committee_assignment
  (catalog_id, userid, role_code, academic_year, editor, dt)
VALUES
  ((SELECT catalog_id FROM ubs_emp.cfp_committee_catalog WHERE name='Chair'),               'alphonce','P','2025-2026','SEEDTEST',NOW()),
  ((SELECT catalog_id FROM ubs_emp.cfp_committee_catalog WHERE name='Associate Chair'),     'kdantu',  'P','2025-2026','SEEDTEST',NOW()),
  ((SELECT catalog_id FROM ubs_emp.cfp_committee_catalog WHERE name='DGS, DGA, DUS'),       'chandola','P','2025-2026','SEEDTEST',NOW()),
  ((SELECT catalog_id FROM ubs_emp.cfp_committee_catalog WHERE name='Director of Research'),'changyou','P','2025-2026','SEEDTEST',NOW()),
  ((SELECT catalog_id FROM ubs_emp.cfp_committee_catalog WHERE name='Center Director'),     'eblanton','P','2025-2026','SEEDTEST',NOW());

-- ── 14. Per-faculty committee service summary (ubs_emp.cfp_committee_service_summary). ──
INSERT INTO ubs_emp.cfp_committee_service_summary
  (userid, academic_year, others_count, service_points_override, comments, editor, dt)
VALUES
  ('alphonce','2025-2026',1,NULL,'Department Chair','SEEDTEST',NOW()),
  ('kdantu',  '2025-2026',2,NULL,'Associate Chair plus two standing committees','SEEDTEST',NOW()),
  ('chandola','2025-2026',0,NULL,NULL,'SEEDTEST',NOW());

-- ── 15. Faculty roles per academic year (ubs_emp.cfp_faculty_role). Drives the
--      teaching-load release (Chair −2.5, course-bearing directors −1) and mirrors
--      the committee leadership assigned above. Role strings must match ALL_ROLES.
--      Plans above are illustrative and may differ from the role-adjusted expected
--      load — that mismatch is exactly what the planner's load validator surfaces. ──
INSERT INTO ubs_emp.cfp_faculty_role (person_number, academic_year, role, editor, dt) VALUES
  ('28010859','2025-2026','Chair','SEEDTEST',NOW()),
  ('37912425','2025-2026','Associate Chair','SEEDTEST',NOW()),
  ('37912417','2025-2026','Director of Graduate Studies','SEEDTEST',NOW()),
  ('38071471','2025-2026','Director of Research','SEEDTEST',NOW()),
  ('38093483','2025-2026','Center Director','SEEDTEST',NOW());

-- ── 16. Sample course → area-tag mappings (ubs_emp.cfp_course_area_tag).
--      crse_ids are resolved live from the catalog by CSE catalog number.
--      ps_rpt is latin1, so its text columns are CONVERTed to utf8mb4 before being
--      compared with the utf8mb4 cfp_* columns/literals. CSE 667 carries two tags
--      (AI + Special Topics) to demonstrate multi-tag courses. The area-tag master
--      list is seeded by the migration (faculty_portal_db_changes.sql), not here. ──
INSERT INTO ubs_emp.cfp_course_area_tag (crse_id, tag_id, editor, dt)
SELECT c.crse_id, t.tag_id, 'SEEDTEST', NOW()
FROM (
  -- primarycatalognumber carries a suffix ('368LR','474LEC'); match on the
  -- leading numeric part so '368LR' resolves to '368'.
  SELECT DISTINCT CONVERT(crse_id USING utf8mb4) AS crse_id,
                  CONVERT(REGEXP_REPLACE(primarycatalognumber, '[^0-9].*$', '') USING utf8mb4) AS catno
  FROM ps_rpt.ps_course_catalog_v
  WHERE CONVERT(primarysubject USING utf8mb4) = 'CSE'
) c
JOIN ubs_emp.cfp_area_tag_master t
  ON ( (t.name = 'AI'             AND c.catno IN ('368','440','467','474','574','667'))
    OR (t.name = 'Systems'        AND c.catno IN ('220','321','341','421','486','490','521','590'))
    OR (t.name = 'PL'             AND c.catno IN ('305','443'))
    OR (t.name = 'Theory'         AND c.catno IN ('191','331','431','531','596'))
    OR (t.name = 'Special Topics' AND c.catno IN ('402','667')) )
WHERE NOT EXISTS (
  SELECT 1 FROM ubs_emp.cfp_course_area_tag a
  WHERE a.crse_id = c.crse_id AND a.tag_id = t.tag_id
);
