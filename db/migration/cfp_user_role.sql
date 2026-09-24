-- =============================================================================
-- cfp_user_role — application RBAC role per portal user
-- Target: MySQL 8. Idempotent: CREATE TABLE IF NOT EXISTS; seed uses
-- INSERT … ON DUPLICATE KEY UPDATE.
--
-- One row per dce principal (userid). Roles: chair | staff | faculty | viewer.
-- Resolution in the app (src/server/queries/roles.ts): explicit row wins; a
-- userid with no row that resolves to a CSE roster member (dce.person_number →
-- cfp_appointments) defaults to 'faculty'; everyone else is 'viewer'.
-- =============================================================================

CREATE TABLE IF NOT EXISTS ubs_emp.cfp_user_role (
  user_role_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  userid       VARCHAR(8)  NOT NULL,      -- dce principal; matches editor audit columns
  role         VARCHAR(16) NOT NULL,      -- 'chair' | 'staff' | 'faculty' | 'viewer'
  editor       VARCHAR(8)  NULL,
  dt           DATETIME    NULL,
  ts           TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_role_id),
  UNIQUE KEY uq_user_role_userid (userid),
  CONSTRAINT chk_user_role_role CHECK (role IN ('chair','staff','faculty','viewer'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Seed the initial chair (applied to the dev DB 2026-07-15 with the dev
-- account; swap in the department chair's dce principal for production).
INSERT INTO ubs_emp.cfp_user_role (userid, role, editor, dt)
  VALUES ('asureshk', 'chair', 'SEED', NOW())
ON DUPLICATE KEY UPDATE role = VALUES(role);

-- After applying, refresh the committed schema snapshot:
--   python scripts/db-schema/export_schema.py
