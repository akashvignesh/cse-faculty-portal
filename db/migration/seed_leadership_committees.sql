-- =============================================================================
-- Faculty Portal — seed the five leadership "Roles" matrix columns into
-- committees.committees so their X marks can be stored in committees.members
-- like every other matrix cell (the schema has no separate roles table), and
-- link the pre-existing ubs_emp.cfp_committee_catalog leadership metadata rows
-- (kind/service_category/display_order) to them via source_committee_id.
--
-- cms_display = 0 keeps these rows out of public/CMS committee listings.
-- Idempotent: committees.name is UNIQUE, the insert is guarded by NOT EXISTS,
-- and the link update only touches rows whose source_committee_id is NULL —
-- safe to re-run.
--
-- Names must match the matrix column metadata in
-- src/data/committeeMockData.ts (matched case-insensitively by name).
-- =============================================================================

SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

INSERT INTO committees.committees (ub_ent_abbr, name, description, cms_display, editor, dt)
SELECT s.ub_ent_abbr, s.name, s.description, 0, 'SEED', NOW()
FROM (
  SELECT 'CSE' AS ub_ent_abbr, 'Chair' AS name,
         'Leadership role — committee-matrix column (not a committee)' AS description UNION ALL
  SELECT 'CSE', 'Associate Chair',
         'Leadership role — committee-matrix column (not a committee)' UNION ALL
  SELECT 'CSE', 'DGS, DGA, DUS',
         'Leadership role — committee-matrix column (not a committee)' UNION ALL
  SELECT 'CSE', 'Director of Research',
         'Leadership role — committee-matrix column (not a committee)' UNION ALL
  SELECT 'CSE', 'Center Director',
         'Leadership role — committee-matrix column (not a committee)'
) AS s
WHERE NOT EXISTS (
  -- committees.committees is latin1; convert before comparing with the
  -- utf8mb4 literals above to avoid an illegal-mix-of-collations error.
  SELECT 1 FROM committees.committees c WHERE CONVERT(c.name USING utf8mb4) = s.name
);

-- Link the catalog's leadership metadata rows (seeded by the structural
-- migration with source_committee_id NULL) to the committees rows above, so
-- the matrix resolves kind='leadership' + category (6/5/4/4/4) from the DB.
UPDATE ubs_emp.cfp_committee_catalog k
JOIN committees.committees c
  ON CONVERT(c.name USING utf8mb4) = k.name
SET k.source_committee_id = c.id,
    k.editor = 'SEED',
    k.dt = NOW()
WHERE k.kind = 'leadership'
  AND k.source_committee_id IS NULL;
