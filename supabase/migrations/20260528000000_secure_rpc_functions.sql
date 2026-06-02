-- Migration: 20260528000000_secure_rpc_functions.sql
-- Description: Hardening RPC functions and optimizing rate limiter performance

-- 1. Redefine set_customer_user_management_pin with strict Admin-only check
CREATE OR REPLACE FUNCTION public.set_customer_user_management_pin(
  p_customer_id UUID,
  p_pin TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  -- Get the caller's role
  SELECT role INTO v_caller_role
  FROM public.oil_profiles
  WHERE id = auth.uid()
  LIMIT 1;

  -- Strictly check if caller is admin
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Access Denied: Only system administrators can set customer PINs';
  END IF;

  IF p_pin IS NULL OR length(trim(p_pin)) < 4 THEN
    RAISE EXCEPTION 'PIN must be at least 4 characters';
  END IF;

  UPDATE public.oil_customers
  SET user_management_pin_hash = crypt(trim(p_pin), gen_salt('bf'))
  WHERE id = p_customer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
END;
$$;

-- 2. Redefine verify_customer_user_management_pin with cross-tenant restriction
CREATE OR REPLACE FUNCTION public.verify_customer_user_management_pin(
  p_customer_id UUID,
  p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_customer_id UUID;
  v_verified BOOLEAN;
BEGIN
  -- Get caller's details
  SELECT role, customer_id INTO v_caller_role, v_caller_customer_id
  FROM public.oil_profiles
  WHERE id = auth.uid()
  LIMIT 1;

  -- Ensure caller belongs to the same customer OR is admin
  IF v_caller_role IS DISTINCT FROM 'admin' AND v_caller_customer_id IS DISTINCT FROM p_customer_id THEN
    RAISE EXCEPTION 'Access Denied: You do not have permissions for this customer context';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.oil_customers
    WHERE id = p_customer_id
      AND user_management_pin_hash IS NOT NULL
      AND crypt(p_pin, user_management_pin_hash) = user_management_pin_hash
  ) INTO v_verified;

  RETURN v_verified;
END;
$$;

-- 3. Redefine insert_lab_request with context verification
CREATE OR REPLACE FUNCTION public.insert_lab_request(
    p_customer_id UUID,
    p_requested_by_profile_id UUID,
    p_machine_id UUID DEFAULT NULL,
    p_title TEXT DEFAULT 'Lab Test Request',
    p_description TEXT DEFAULT '',
    p_due_date DATE DEFAULT NULL,
    p_priority TEXT DEFAULT 'medium',
    p_is_new_machine BOOLEAN DEFAULT FALSE,
    p_new_machine_data JSONB DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, error_message TEXT) AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_customer_id UUID;
    v_id UUID;
BEGIN
    -- Get caller's details
    SELECT role, customer_id INTO v_caller_role, v_caller_customer_id
    FROM public.oil_profiles
    WHERE id = auth.uid()
    LIMIT 1;

    -- Verify that the caller belongs to p_customer_id OR is admin
    IF v_caller_role IS DISTINCT FROM 'admin' AND v_caller_customer_id IS DISTINCT FROM p_customer_id THEN
        RAISE EXCEPTION 'Access Denied: Cannot forge lab request for another customer context';
    END IF;

    -- Verify that requested_by_profile_id is the caller itself OR caller is admin
    IF v_caller_role IS DISTINCT FROM 'admin' AND p_requested_by_profile_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Access Denied: Cannot forge lab request under another profile name';
    END IF;

    INSERT INTO public.oil_lab_requests (
        customer_id,
        requested_by_profile_id,
        machine_id,
        title,
        description,
        due_date,
        priority,
        status,
        request_date,
        is_new_machine,
        new_machine_data,
        created_at,
        updated_at
    ) VALUES (
        p_customer_id,
        p_requested_by_profile_id,
        p_machine_id,
        p_title,
        p_description,
        p_due_date,
        p_priority,
        'pending',
        CURRENT_DATE,
        p_is_new_machine,
        p_new_machine_data,
        NOW(),
        NOW()
    ) RETURNING id INTO v_id;

    RETURN QUERY SELECT TRUE, NULL::TEXT;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Optimize check_oil_rate_limit with Probabilistic Pruning to prevent write locks
CREATE OR REPLACE FUNCTION public.check_oil_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining INTEGER,
  retry_after_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_count INTEGER;
  v_reset_at TIMESTAMPTZ;
BEGIN
  -- Run cleanup probabilistically (1% chance) to prevent table-locking write bottlenecks on high traffic
  IF random() < 0.01 THEN
    DELETE FROM public.oil_rate_limits
    WHERE reset_at < (v_now - INTERVAL '2 hours');
  END IF;

  SELECT count, reset_at
    INTO v_count, v_reset_at
  FROM public.oil_rate_limits
  WHERE key = p_key
  FOR UPDATE;

  IF NOT FOUND OR v_reset_at <= v_now THEN
    INSERT INTO public.oil_rate_limits (key, count, reset_at)
    VALUES (p_key, 1, v_now + make_interval(secs => p_window_seconds))
    ON CONFLICT (key)
    DO UPDATE SET
      count = 1,
      reset_at = v_now + make_interval(secs => p_window_seconds);

    RETURN QUERY SELECT TRUE, GREATEST(p_limit - 1, 0), p_window_seconds;
    RETURN;
  END IF;

  IF v_count >= p_limit THEN
    RETURN QUERY
    SELECT
      FALSE,
      0,
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_reset_at - v_now)))::INTEGER);
    RETURN;
  END IF;

  UPDATE public.oil_rate_limits
  SET count = count + 1
  WHERE key = p_key
  RETURNING count, reset_at INTO v_count, v_reset_at;

  RETURN QUERY
  SELECT
    TRUE,
    GREATEST(p_limit - v_count, 0),
    GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_reset_at - v_now)))::INTEGER);
END;
$$;
