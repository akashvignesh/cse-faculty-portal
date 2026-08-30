-- =============================================================================
-- Faculty Portal — move the leadership position holders that are still stranded
-- in the retired ubs_emp.cfp_committee_assignment into committees.members, the
-- table the committee matrix actually reads.
--
-- WHY: seed_leadership_committees.sql created the five leadership columns in
-- committees.committees, but nothing ever migrated their *members* across. The
-- matrix therefore renders an empty leadership row even though the holders
-- exist in the old table. This script closes that gap.
--
-- ⚠ REVIEW THE NAMES BEFORE RUNNING. On oceanus the five source rows are
-- tagged editor='SEEDTEST' — they came from db/seed/test_faculty_seed.sql, not
-- from the department. Confirm each holder is the real current office-holder,
-- or edit them in the portal afterwards (chair → Committee matrix).
--
-- Rows land with editor='BACKFILL' so they can be identified or removed:
--   DELETE FROM committees.members WHERE editor = 'BACKFILL';
--
-- NOTE: cfp_committee_assignment is per-academic_year; committees.members is
-- not. Only the latest year is carried over, and the year dimension is dropped
-- (the same trade-off the matrix rewrite already made for committees).
--
-- COLLATION: committees.members.userid is utf8/utf8_general_ci while
-- cfp_committee_assignment.userid is utf8mb4/utf8mb4_0900_ai_ci — comparing
-- them raw throws "illegal mix of collations", hence the CONVERT() calls.
--
-- Idempotent: guarded by NOT EXISTS on the (committee_id, userid) unique key,
-- so re-running inserts nothing and never overwrites a curated row.
-- =============================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

INSERT INTO committees.members (committee_id, userid, role, editor, dt)
SELECT k.source_committee_id,
       a.userid,
       'Position',           -- matrix code X; see src/lib/committeeRoles.ts
       'BACKFILL',
       NOW()
FROM ubs_emp.cfp_committee_assignment a
JOIN ubs_emp.cfp_committee_catalog k
  ON k.catalog_id = a.catalog_id
WHERE k.kind = 'leadership'
  AND k.source_committee_id IS NOT NULL
  AND a.role_code = 'P'
  -- latest year only, so a multi-year history collapses to the current holder
  AND a.academic_year = (
    SELECT MAX(a2.academic_year)
    FROM ubs_emp.cfp_committee_assignment a2
    WHERE a2.catalog_id = a.catalog_id
      AND a2.role_code = 'P'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM committees.members m
    WHERE m.committee_id = k.source_committee_id
      AND CONVERT(m.userid USING utf8mb4) = CONVERT(a.userid USING utf8mb4)
  );

-- Verify: every leadership column should now report its holder.
--
--   SELECT k.name, m.userid, m.role, m.editor
--     FROM ubs_emp.cfp_committee_catalog k
--     LEFT JOIN committees.members m ON m.committee_id = k.source_committee_id
--    WHERE k.kind = 'leadership'
--    ORDER BY k.display_order, k.name;
