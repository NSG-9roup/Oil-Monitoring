-- OilTrack: RLS verification checklist for oil_profiles
-- Run each section in Supabase SQL Editor (in order).
-- Replace UUID placeholders before running the role simulation blocks.

-- =============================================================
-- 1) RLS status + policy inventory
-- =============================================================
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'oil_profiles';

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'oil_profiles'
ORDER BY policyname;

-- =============================================================
-- 2) Role helper function sanity check
-- =============================================================
-- Expect: function exists, SECURITY DEFINER, executable by authenticated
SELECT
  p.proname,
  p.prosecdef AS security_definer,
  pg_get_functiondef(p.oid) AS function_sql
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'current_user_role';

-- =============================================================
-- 3) Data setup check for simulation users
-- =============================================================
-- Replace with real IDs from auth.users/oil_profiles in your environment
-- :ADMIN_UID
-- :SALES_UID
-- :CUSTOMER_UID_A
-- :CUSTOMER_UID_B

SELECT id, role, customer_id
FROM public.oil_profiles
WHERE id IN (
  ':ADMIN_UID',
  ':SALES_UID',
  ':CUSTOMER_UID_A',
  ':CUSTOMER_UID_B'
);

-- =============================================================
-- 4) Simulation helper notes
-- =============================================================
-- Simulate authenticated JWT claims in SQL editor session using set_config:
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claim.role', 'authenticated', true);
--   SELECT set_config('request.jwt.claim.sub', '<USER_UUID>', true);
--
-- IMPORTANT:
-- Run each test in a transaction and ROLLBACK to avoid data changes.
-- You can verify context with:
--   SELECT current_user, current_setting('request.jwt.claim.sub', true);

-- =============================================================
-- 5) Select access tests
-- =============================================================

-- 5a) As ADMIN: should read all profiles
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', ':ADMIN_UID', true);
SELECT count(*) AS visible_profiles_as_admin FROM public.oil_profiles;
ROLLBACK;

-- 5b) As SALES: should read all profiles
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', ':SALES_UID', true);
SELECT count(*) AS visible_profiles_as_sales FROM public.oil_profiles;
ROLLBACK;

-- 5c) As CUSTOMER A: should only read own profile
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', ':CUSTOMER_UID_A', true);
SELECT id, role, customer_id FROM public.oil_profiles ORDER BY created_at DESC;
ROLLBACK;

-- =============================================================
-- 6) Insert access tests
-- =============================================================

-- 6a) As SALES: insert should be allowed
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', ':SALES_UID', true);

INSERT INTO public.oil_profiles (id, role, customer_id)
VALUES ('00000000-0000-0000-0000-000000000001', 'customer', NULL);

ROLLBACK;

-- 6b) As CUSTOMER A: insert should be denied
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', ':CUSTOMER_UID_A', true);

INSERT INTO public.oil_profiles (id, role, customer_id)
VALUES ('00000000-0000-0000-0000-000000000002', 'customer', NULL);

ROLLBACK;

-- =============================================================
-- 7) Update access tests
-- =============================================================

-- 7a) As SALES: update should be allowed
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', ':SALES_UID', true);

UPDATE public.oil_profiles
SET updated_at = now()
WHERE id = ':CUSTOMER_UID_A';

ROLLBACK;

-- 7b) As CUSTOMER A: update should be denied
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', ':CUSTOMER_UID_A', true);

UPDATE public.oil_profiles
SET updated_at = now()
WHERE id = ':CUSTOMER_UID_A';

ROLLBACK;

-- =============================================================
-- 8) Delete access tests
-- =============================================================

-- 8a) As ADMIN: delete should be allowed
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', ':ADMIN_UID', true);

DELETE FROM public.oil_profiles
WHERE id = ':CUSTOMER_UID_B';

ROLLBACK;

-- 8b) As SALES: delete should be denied
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', ':SALES_UID', true);

DELETE FROM public.oil_profiles
WHERE id = ':CUSTOMER_UID_B';

ROLLBACK;

-- =============================================================
-- 9) Optional: quick pass/fail smoke summary (manual interpretation)
-- =============================================================
-- PASS criteria:
-- - RLS enabled on oil_profiles
-- - secure policies exist (select/insert/update/delete)
-- - admin + sales can SELECT all
-- - customer can only SELECT own
-- - sales can INSERT/UPDATE
-- - only admin can DELETE
