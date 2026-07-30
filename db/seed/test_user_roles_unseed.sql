-- Removes everything test_user_roles_seed.sql wrote (editor='SEEDTEST').
-- Leaves the migration-seeded chair row (editor='SEED') untouched.
DELETE FROM ubs_emp.cfp_user_role WHERE editor = 'SEEDTEST';
