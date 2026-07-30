-- =============================================================================
-- TEST USER-ROLE SEED — one named account per portal role, for testing
-- Target: MySQL 8 (oceanus, ubs_emp). Run via the 3307 tunnel, AFTER
-- db/migration/cfp_user_role.sql and test_faculty_seed.sql.
--
-- SAFE-TO-REMOVE: rows are tagged editor='SEEDTEST'; test_user_roles_unseed.sql
-- deletes exactly those. Idempotent (ON DUPLICATE KEY UPDATE on uq userid).
--
-- One real roster faculty per role so every role can be exercised via the dev
-- switcher (see docs/test-accounts.md):
--   alphonce → chair    (edits any profile; full committee + role management)
--   kdantu   → staff    (edits any profile except committee-management)
--   chandola → faculty  (edits ONLY their own profile)
--   changyou → viewer   (read-only everywhere) — a TEST designation; in
--                        production a viewer is typically a non-faculty account
--   eblanton → (no row) resolves to 'faculty' via the roster fallback — proves
--                        the default path and gives a second faculty account.
-- The dev chair (asureshk, editor='SEED') is seeded by the migration.
-- =============================================================================

INSERT INTO ubs_emp.cfp_user_role (userid, role, editor, dt) VALUES
  ('alphonce', 'chair',   'SEEDTEST', NOW()),
  ('kdantu',   'staff',   'SEEDTEST', NOW()),
  ('chandola', 'faculty', 'SEEDTEST', NOW()),
  ('changyou', 'viewer',  'SEEDTEST', NOW())
ON DUPLICATE KEY UPDATE role = VALUES(role), editor = VALUES(editor), dt = VALUES(dt);
