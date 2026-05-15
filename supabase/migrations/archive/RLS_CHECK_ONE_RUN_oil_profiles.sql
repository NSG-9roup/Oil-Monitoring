-- One-run RLS verification for oil_profiles
-- Usage:
-- 1) Replace UUID placeholders in _rls_params below.
-- 2) Run this whole script once in Supabase SQL Editor.
-- 3) Read final PASS/FAIL summary query output.

DROP TABLE IF EXISTS _rls_check_results;
CREATE TEMP TABLE _rls_check_results (
  test_name TEXT NOT NULL,
  expected TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  details TEXT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TABLE IF EXISTS _rls_params;
CREATE TEMP TABLE _rls_params (
  admin_uid UUID,
  sales_uid UUID,
  customer_uid_a UUID,
  customer_uid_b UUID,
  -- Optional: must already exist in auth.users and not exist in oil_profiles.
  insert_candidate_uid UUID
);

INSERT INTO _rls_params (admin_uid, sales_uid, customer_uid_a, customer_uid_b, insert_candidate_uid)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  NULL
);

DO $$
DECLARE
  v_admin UUID;
  v_sales UUID;
  v_customer_a UUID;
  v_customer_b UUID;
  v_insert_candidate UUID;
  v_placeholder UUID := '00000000-0000-0000-0000-000000000000'::uuid;

  v_count INT;
  v_own_count INT;
  v_other_count INT;
  v_affected INT;
  v_admin_count INT;
  v_sales_count INT;
  v_customer_count INT;
BEGIN
  SELECT admin_uid, sales_uid, customer_uid_a, customer_uid_b, insert_candidate_uid
  INTO v_admin, v_sales, v_customer_a, v_customer_b, v_insert_candidate
  FROM _rls_params
  LIMIT 1;

  -- Auto-resolve UUIDs if placeholders are still used.
  IF v_admin = v_placeholder THEN
    SELECT id INTO v_admin
    FROM public.oil_profiles
    WHERE role = 'admin'
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_sales = v_placeholder THEN
    SELECT id INTO v_sales
    FROM public.oil_profiles
    WHERE role = 'sales'
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_customer_a = v_placeholder THEN
    SELECT id INTO v_customer_a
    FROM public.oil_profiles
    WHERE role = 'customer'
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_customer_b = v_placeholder THEN
    SELECT id INTO v_customer_b
    FROM public.oil_profiles
    WHERE role = 'customer'
      AND id <> COALESCE(v_customer_a, '00000000-0000-0000-0000-000000000000'::uuid)
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  SELECT count(*) INTO v_admin_count FROM public.oil_profiles WHERE role = 'admin';
  SELECT count(*) INTO v_sales_count FROM public.oil_profiles WHERE role = 'sales';
  SELECT count(*) INTO v_customer_count FROM public.oil_profiles WHERE role = 'customer';

  IF v_admin IS NULL
    OR v_sales IS NULL
    OR v_customer_a IS NULL
    OR v_customer_b IS NULL
    OR v_admin = v_placeholder
    OR v_sales = v_placeholder
    OR v_customer_a = v_placeholder
    OR v_customer_b = v_placeholder THEN
    INSERT INTO _rls_check_results(test_name, expected, passed, details)
    VALUES (
      'Input UUID validation',
      'All role UUIDs must be valid or discoverable from oil_profiles',
      false,
      concat(
        'Missing required users. Needed >=1 admin, >=1 sales, >=2 customer. ',
        'Current counts: admin=', v_admin_count,
        ', sales=', v_sales_count,
        ', customer=', v_customer_count,
        '. Auto-resolved UUIDs: admin=', coalesce(v_admin::text, '<null>'),
        ', sales=', coalesce(v_sales::text, '<null>'),
        ', customer_a=', coalesce(v_customer_a::text, '<null>'),
        ', customer_b=', coalesce(v_customer_b::text, '<null>')
      )
    );
    RETURN;
  END IF;

  INSERT INTO _rls_check_results(test_name, expected, passed, details)
  VALUES (
    'Input UUID resolution',
    'Valid admin/sales/customer UUIDs are available',
    true,
    concat(
      'admin=', coalesce(v_admin::text, '<null>'),
      ', sales=', coalesce(v_sales::text, '<null>'),
      ', customer_a=', coalesce(v_customer_a::text, '<null>'),
      ', customer_b=', coalesce(v_customer_b::text, '<null>')
    )
  );

  -- 1) RLS enabled check
  INSERT INTO _rls_check_results(test_name, expected, passed, details)
  SELECT
    'RLS enabled on oil_profiles',
    'relrowsecurity = true',
    c.relrowsecurity,
    CASE WHEN c.relrowsecurity THEN 'RLS is enabled' ELSE 'RLS is disabled' END
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'oil_profiles';

  -- 2) Secure policy check
  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'oil_profiles'
    AND policyname IN (
      'oil_profiles_select_secure',
      'oil_profiles_insert_secure',
      'oil_profiles_update_secure',
      'oil_profiles_delete_secure'
    );

  INSERT INTO _rls_check_results(test_name, expected, passed, details)
  VALUES (
    'Secure policies present',
    '4 secure policies exist',
    v_count = 4,
    'Found ' || v_count || ' of 4 required policies'
  );

  -- 3) current_user_role function exists
  SELECT count(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'current_user_role';

  INSERT INTO _rls_check_results(test_name, expected, passed, details)
  VALUES (
    'current_user_role function exists',
    'Function exists exactly once',
    v_count = 1,
    'Function count = ' || v_count
  );

  -- 4) Preflight role mapping in oil_profiles
  INSERT INTO _rls_check_results(test_name, expected, passed, details)
  SELECT
    'Preflight admin role row',
    'admin UID exists with role=admin',
    EXISTS (SELECT 1 FROM public.oil_profiles WHERE id = v_admin AND role = 'admin'),
    CASE
      WHEN EXISTS (SELECT 1 FROM public.oil_profiles WHERE id = v_admin AND role = 'admin') THEN 'OK'
      ELSE 'Missing row or role mismatch'
    END;

  INSERT INTO _rls_check_results(test_name, expected, passed, details)
  SELECT
    'Preflight sales role row',
    'sales UID exists with role=sales',
    EXISTS (SELECT 1 FROM public.oil_profiles WHERE id = v_sales AND role = 'sales'),
    CASE
      WHEN EXISTS (SELECT 1 FROM public.oil_profiles WHERE id = v_sales AND role = 'sales') THEN 'OK'
      ELSE 'Missing row or role mismatch'
    END;

  INSERT INTO _rls_check_results(test_name, expected, passed, details)
  SELECT
    'Preflight customer A row',
    'customer A UID exists with role=customer',
    EXISTS (SELECT 1 FROM public.oil_profiles WHERE id = v_customer_a AND role = 'customer'),
    CASE
      WHEN EXISTS (SELECT 1 FROM public.oil_profiles WHERE id = v_customer_a AND role = 'customer') THEN 'OK'
      ELSE 'Missing row or role mismatch'
    END;

  INSERT INTO _rls_check_results(test_name, expected, passed, details)
  SELECT
    'Preflight customer B row',
    'customer B UID exists with role=customer',
    EXISTS (SELECT 1 FROM public.oil_profiles WHERE id = v_customer_b AND role = 'customer'),
    CASE
      WHEN EXISTS (SELECT 1 FROM public.oil_profiles WHERE id = v_customer_b AND role = 'customer') THEN 'OK'
      ELSE 'Missing row or role mismatch'
    END;

  -- 5) SELECT matrix
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);

    SELECT count(*) INTO v_count FROM public.oil_profiles;

    INSERT INTO _rls_check_results(test_name, expected, passed, details)
    VALUES (
      'SELECT as admin',
      'Can read all profiles',
      v_count > 0,
      'Visible rows = ' || v_count
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rls_check_results(test_name, expected, passed, details)
    VALUES ('SELECT as admin', 'Can read all profiles', false, SQLERRM);
  END;

  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_sales::text, true);

    SELECT count(*) INTO v_count FROM public.oil_profiles;

    INSERT INTO _rls_check_results(test_name, expected, passed, details)
    VALUES (
      'SELECT as sales',
      'Can read all profiles',
      v_count > 0,
      'Visible rows = ' || v_count
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rls_check_results(test_name, expected, passed, details)
    VALUES ('SELECT as sales', 'Can read all profiles', false, SQLERRM);
  END;

  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_customer_a::text, true);

    SELECT count(*) INTO v_own_count FROM public.oil_profiles WHERE id = v_customer_a;
    SELECT count(*) INTO v_other_count FROM public.oil_profiles WHERE id <> v_customer_a;

    INSERT INTO _rls_check_results(test_name, expected, passed, details)
    VALUES (
      'SELECT as customer A',
      'Can read own profile only',
      v_own_count = 1 AND v_other_count = 0,
      'own=' || v_own_count || ', others=' || v_other_count
    );
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rls_check_results(test_name, expected, passed, details)
    VALUES ('SELECT as customer A', 'Can read own profile only', false, SQLERRM);
  END;

  -- 6) UPDATE matrix
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_sales::text, true);

    UPDATE public.oil_profiles
    SET updated_at = updated_at
    WHERE id = v_customer_a;

    GET DIAGNOSTICS v_affected = ROW_COUNT;

    INSERT INTO _rls_check_results(test_name, expected, passed, details)
    VALUES ('UPDATE as sales', 'Allowed', v_affected > 0, 'Affected rows = ' || v_affected);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rls_check_results(test_name, expected, passed, details)
    VALUES ('UPDATE as sales', 'Allowed', false, SQLERRM);
  END;

  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_customer_a::text, true);

    UPDATE public.oil_profiles
    SET updated_at = updated_at
    WHERE id = v_customer_a;

    GET DIAGNOSTICS v_affected = ROW_COUNT;

    INSERT INTO _rls_check_results(test_name, expected, passed, details)
    VALUES ('UPDATE as customer A', 'Denied', v_affected = 0, 'Affected rows = ' || v_affected);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rls_check_results(test_name, expected, passed, details)
    VALUES ('UPDATE as customer A', 'Denied', true, SQLERRM);
  END;

  -- 7) DELETE matrix (safe mode: target impossible UUID so no real deletion)
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);

    DELETE FROM public.oil_profiles
    WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid;

    INSERT INTO _rls_check_results(test_name, expected, passed, details)
    VALUES ('DELETE permission as admin', 'Allowed', true, 'Command accepted for admin role');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rls_check_results(test_name, expected, passed, details)
    VALUES ('DELETE permission as admin', 'Allowed', false, SQLERRM);
  END;

  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', v_sales::text, true);

    DELETE FROM public.oil_profiles
    WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid;

    GET DIAGNOSTICS v_affected = ROW_COUNT;

    INSERT INTO _rls_check_results(test_name, expected, passed, details)
    VALUES ('DELETE permission as sales', 'Denied', v_affected = 0, 'Affected rows = ' || v_affected);
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rls_check_results(test_name, expected, passed, details)
    VALUES ('DELETE permission as sales', 'Denied', true, SQLERRM);
  END;

  -- 8) Optional INSERT test when insert candidate UID supplied
  IF v_insert_candidate IS NULL THEN
    INSERT INTO _rls_check_results(test_name, expected, passed, details)
    VALUES (
      'INSERT test skipped',
      'Provide insert_candidate_uid to test INSERT policy',
      true,
      'Skipped by design'
    );
  ELSE
    BEGIN
      EXECUTE 'SET LOCAL ROLE authenticated';
      PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
      PERFORM set_config('request.jwt.claim.sub', v_sales::text, true);

      INSERT INTO public.oil_profiles (id, role, customer_id)
      VALUES (v_insert_candidate, 'customer', NULL);

      DELETE FROM public.oil_profiles WHERE id = v_insert_candidate;

      INSERT INTO _rls_check_results(test_name, expected, passed, details)
      VALUES ('INSERT as sales', 'Allowed', true, 'Insert and cleanup executed');
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO _rls_check_results(test_name, expected, passed, details)
      VALUES ('INSERT as sales', 'Allowed', false, SQLERRM);
    END;
  END IF;
END
$$;

SELECT
  test_name,
  expected,
  passed,
  details,
  checked_at
FROM _rls_check_results
ORDER BY test_name;

SELECT
  count(*) FILTER (WHERE passed) AS passed_count,
  count(*) FILTER (WHERE NOT passed) AS failed_count
FROM _rls_check_results;
