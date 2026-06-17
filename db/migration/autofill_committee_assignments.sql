-- =============================================================================
-- Auto-populate committee assignments (PDF p1/p3: "automatically populate some
-- Chair and Memberships" / "automatically set committee assignments").
-- Target: MySQL 8 (oceanus). Run via the 3307 tunnel.
--
-- Two idempotent, NON-DESTRUCTIVE derivations into ubs_emp.cfp_committee_assignment:
--   1. MEMBERS  → matrix cells, from the live committees.members roster.
--   2. ROLES    → leadership cells, from ubs_emp.cfp_faculty_role.
-- Both use NOT EXISTS, so manually-entered matrix cells are never overwritten and
-- the script can be re-run safely whenever roster/roles change. Rows are tagged
-- editor='AUTOFILL' to distinguish them from hand-entered ('—') or seed rows.
--
-- COLLATION: ubs_emp's new cfp_* tables are utf8mb4; committees.* and dce.* are
-- latin1, so every latin1 text column is CONVERT(... USING utf8mb4) before being
-- compared with a utf8mb4 column/literal (avoids "illegal mix of collations").
--
-- Pin the session collation to the cfp_* tables' collation so literals, user
-- variables, and CONVERT(...) results all align with utf8mb4_0900_ai_ci columns
-- (avoids mixing with the server-default utf8mb4_unicode_ci).
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Set the academic year you want to populate here:
SET @ay = '2025-2026';
-- =============================================================================

-- 1. MEMBERS → assignments. role first letter maps to our role_code; default Member (X).
INSERT INTO ubs_emp.cfp_committee_assignment (catalog_id, userid, role_code, academic_year, editor, dt)
SELECT cat.catalog_id,
       CONVERT(m.userid USING utf8mb4),
       CASE UPPER(LEFT(CONVERT(m.role USING utf8mb4), 1))
            WHEN 'C' THEN 'C' WHEN 'V' THEN 'V' WHEN 'A' THEN 'A' WHEN 'P' THEN 'P' ELSE 'X' END,
       @ay, 'AUTOFILL', NOW()
FROM committees.members m
JOIN ubs_emp.cfp_committee_catalog cat ON cat.source_committee_id = m.committee_id
WHERE m.userid IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM ubs_emp.cfp_committee_assignment a
    WHERE a.catalog_id = cat.catalog_id
      AND a.userid = CONVERT(m.userid USING utf8mb4)
      AND a.academic_year = @ay
  );

-- 2. ROLES → leadership assignments. Maps each per-year role to its leadership
-- catalog column; the role holder is the Position holder (role_code 'P').
INSERT INTO ubs_emp.cfp_committee_assignment (catalog_id, userid, role_code, academic_year, editor, dt)
SELECT cat.catalog_id,
       CONVERT(pn.principal USING utf8mb4),
       'P', fr.academic_year, 'AUTOFILL', NOW()
FROM ubs_emp.cfp_faculty_role fr
JOIN dce.person_number pn
  ON CONVERT(pn.person_number USING utf8mb4) = fr.person_number
 AND CONVERT(pn.status USING utf8mb4) = 'A'
JOIN ubs_emp.cfp_committee_catalog cat
  ON cat.kind = 'leadership'
 AND cat.name = CASE fr.role
       WHEN 'Chair'                         THEN 'Chair'
       WHEN 'Associate Chair'               THEN 'Associate Chair'
       WHEN 'Director of Graduate Studies'  THEN 'DGS, DGA, DUS'
       WHEN 'Director of Undergraduate Studies' THEN 'DGS, DGA, DUS'
       WHEN 'Director of Admissions'        THEN 'DGS, DGA, DUS'
       WHEN 'Director of Research'          THEN 'Director of Research'
       WHEN 'Center Director'               THEN 'Center Director'
       ELSE NULL END
WHERE NOT EXISTS (
    SELECT 1 FROM ubs_emp.cfp_committee_assignment a
    WHERE a.catalog_id = cat.catalog_id
      AND a.userid = CONVERT(pn.principal USING utf8mb4)
      AND a.academic_year = fr.academic_year
  );

-- Undo just the auto-filled rows (leaves manual + seed rows intact):
--   DELETE FROM ubs_emp.cfp_committee_assignment WHERE editor = 'AUTOFILL';
