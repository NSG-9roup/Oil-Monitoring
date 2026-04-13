-- Security hardening: distributed rate limit + per-customer management PIN

CREATE TABLE IF NOT EXISTS public.oil_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oil_rate_limits_reset_at
  ON public.oil_rate_limits(reset_at);

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
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_count INTEGER;
  v_reset_at TIMESTAMPTZ;
BEGIN
  DELETE FROM public.oil_rate_limits
  WHERE reset_at < (v_now - INTERVAL '2 hours');

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

REVOKE ALL ON FUNCTION public.check_oil_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_oil_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated;

ALTER TABLE public.oil_customers
ADD COLUMN IF NOT EXISTS user_management_pin_hash TEXT;

COMMENT ON COLUMN public.oil_customers.user_management_pin_hash IS 'bcrypt hash for customer-specific user management PIN.';

CREATE OR REPLACE FUNCTION public.verify_customer_user_management_pin(
  p_customer_id UUID,
  p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.oil_customers
    WHERE id = p_customer_id
      AND user_management_pin_hash IS NOT NULL
      AND crypt(p_pin, user_management_pin_hash) = user_management_pin_hash
  );
$$;

REVOKE ALL ON FUNCTION public.verify_customer_user_management_pin(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_customer_user_management_pin(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_customer_user_management_pin(
  p_customer_id UUID,
  p_pin TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

REVOKE ALL ON FUNCTION public.set_customer_user_management_pin(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_customer_user_management_pin(UUID, TEXT) TO authenticated;
