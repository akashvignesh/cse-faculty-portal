-- =============================================================================
-- Widen the teaching-preference rating scale from 0–4 to 0–5.
-- Target: MySQL 8 (oceanus, schema `people`).
--
-- The portal's design scale is 0 = Not Qualified … 5 = Most Preferred, but the
-- live table people.cfp_faculty_teaching_prefs still carries the legacy
-- CHECK chk_pref_range (pref BETWEEN 0 AND 4). Until this runs, any pref=5 save
-- is rejected by the database with a CHECK-constraint violation.
--
-- Safe + reversible: only swaps one CHECK constraint; no data is modified.
-- Run this BEFORE deploying the code that allows pref=5 (validatePref now
-- accepts 0–5) and before seeding any pref=5 rows.
-- =============================================================================

ALTER TABLE people.cfp_faculty_teaching_prefs
  DROP CHECK chk_pref_range;

ALTER TABLE people.cfp_faculty_teaching_prefs
  ADD CONSTRAINT chk_pref_range CHECK (pref BETWEEN 0 AND 5);

-- Rollback (if ever needed — note: fails if any pref=5 rows exist):
--   ALTER TABLE people.cfp_faculty_teaching_prefs DROP CHECK chk_pref_range;
--   ALTER TABLE people.cfp_faculty_teaching_prefs
--     ADD CONSTRAINT chk_pref_range CHECK (pref BETWEEN 0 AND 4);
