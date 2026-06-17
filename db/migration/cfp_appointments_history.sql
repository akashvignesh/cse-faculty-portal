-- =============================================================================
-- cfp_appointments → promotion-history model   (DBA-APPLIED — NOT run by the app)
-- Target: MySQL 8
--
-- ⚠️  BREAKS the standing ground rule "no ALTER to any existing table".
--     That rule governs the APPLICATION: the app never alters tables at runtime
--     and keeps treating ubs_emp.cfp_appointments as READ-ONLY. This is a
--     one-time STRUCTURAL change applied by a Database Administrator directly
--     against the live DB. Only the upstream feed writes rows to the table.
--
-- WHY: today person_number is the sole PRIMARY KEY, so the table holds exactly
--      ONE row per person and a promotion must OVERWRITE (UPDATE) that row — the
--      prior role is lost. To keep promotion history we allow MULTIPLE rows per
--      person; "current role" = the latest by appointment_effective_date, which
--      the app already selects (src/server/queries/faculty.ts: detail picks the
--      latest appointment; roster SELECT DISTINCTs person_number).
--
-- No declared FK references ubs_emp.cfp_appointments, so dropping its PK is safe
-- (the only declared FKs are committees.members, cfp_committee_assignment, and
-- cfp_faculty_semester_plan — none point here).
-- =============================================================================

-- ── Pre-flight (run first, eyeball the output) ───────────────────────────────
--   SHOW CREATE TABLE ubs_emp.cfp_appointments\G
--   -- expect 0 rows while person_number is still the PK:
--   SELECT person_number, COUNT(*) c
--   FROM ubs_emp.cfp_appointments GROUP BY person_number HAVING c > 1;

-- ── 1. Structural change ─────────────────────────────────────────────────────
-- Add a surrogate PK so the table can hold many rows per person; index
-- (person_number, appointment_effective_date) for the "latest appointment per
-- person" lookups the app issues. Order matters: drop the old PK before adding
-- the AUTO_INCREMENT column as the new PK.
ALTER TABLE ubs_emp.cfp_appointments
  DROP PRIMARY KEY,
  ADD COLUMN appointment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT FIRST,
  ADD PRIMARY KEY (appointment_id),
  ADD INDEX idx_cfp_appointments_person_effdt (person_number, appointment_effective_date);

-- ── 2. (Optional) one appointment per person per effective date ───────────────
-- Enable to reject exact-duplicate history rows. Leave commented if a backfilled
-- correction may legitimately share an effective date with the row it corrects.
-- ALTER TABLE ubs_emp.cfp_appointments
--   ADD UNIQUE KEY uq_cfp_appointments_person_effdt
--     (person_number, appointment_effective_date);

-- ── 3. FEED BEHAVIOR (process change, not DDL) ───────────────────────────────
-- On promotion the upstream loader must INSERT a new row (keeping prior rows)
-- instead of UPDATE-ing in place. Without this, the table still ends up with one
-- row per person and the history stays empty even after step 1.

-- ── Rollback (only safe while every person still has <= 1 row) ────────────────
--   ALTER TABLE ubs_emp.cfp_appointments
--     DROP PRIMARY KEY,
--     DROP INDEX idx_cfp_appointments_person_effdt,
--     DROP COLUMN appointment_id,
--     ADD PRIMARY KEY (person_number);

-- ── After applying, refresh the committed schema snapshot ─────────────────────
--   python scripts/db-schema/export_schema.py
