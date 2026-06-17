-- =============================================================================
-- TEST FACULTY UNSEED — removes ONLY what test_faculty_seed.sql inserted.
-- Target: MySQL 8 (oceanus). Run via the 3307 tunnel.
--
-- SAFETY: removes rows by editor='SEEDTEST' (where the table has that column)
-- or by the explicit keys this seed owns. It NEVER touches committees.*,
-- ps_rpt.classschedule_v, or ps_rpt.ps_course_catalog_v — that real data is
-- only read for mapping, never deleted.
-- =============================================================================

-- editor='SEEDTEST'-tagged tables
-- New planner/committee tables first (semester_plan before course_plan for the FK).
DELETE FROM ubs_emp.cfp_faculty_semester_plan      WHERE editor = 'SEEDTEST';
DELETE FROM ubs_emp.cfp_faculty_course_plan        WHERE editor = 'SEEDTEST';
DELETE FROM ubs_emp.cfp_faculty_role               WHERE editor = 'SEEDTEST';
DELETE FROM ubs_emp.cfp_course_area_tag            WHERE editor = 'SEEDTEST';
DELETE FROM ubs_emp.cfp_committee_assignment       WHERE editor = 'SEEDTEST';
DELETE FROM ubs_emp.cfp_committee_service_summary  WHERE editor = 'SEEDTEST';
DELETE FROM ubs_emp.cfp_appointments               WHERE editor = 'SEEDTEST';
DELETE FROM ubs_emp.cfp_faculty                     WHERE editor = 'SEEDTEST';
DELETE FROM ubs_emp.cfp_faculty_primary_email       WHERE editor = 'SEEDTEST';
DELETE FROM ubs_emp.cfp_faculty_primary_phone_number WHERE editor = 'SEEDTEST';
DELETE FROM ubs_emp.cfp_faculty_primary_address     WHERE editor = 'SEEDTEST';
DELETE FROM ubs_emp.cfp_faculty_research_areas      WHERE editor = 'SEEDTEST';
DELETE FROM ubs_emp.cfp_research_area_master        WHERE editor = 'SEEDTEST';
DELETE FROM ubs_emp.cfp_faculty_leave               WHERE editor = 'SEEDTEST';
DELETE FROM people.phd_advisors                     WHERE editor = 'SEEDTEST';
DELETE FROM people.cfp_faculty_teaching_prefs       WHERE editor = 'SEEDTEST';
DELETE FROM facilities.occupants                    WHERE editor = 'SEEDTEST';

-- tables without an editor column → removed by the keys this seed owns
DELETE FROM facilities.buildings   WHERE building = 'DVTEST';
DELETE FROM ubs_rf.award_v         WHERE award_number IN ('ALP001','CHN001','CHE001','DAN001');
DELETE FROM ps_rpt.ub_display_name_v
  WHERE emplid IN ('28010859','37912417','38071471','37912425','38093483');
DELETE FROM dce.person_number
  WHERE person_number IN ('28010859','37912417','38071471','37912425','38093483')
    AND principal     IN ('alphonce','chandola','changyou','kdantu','eblanton');
