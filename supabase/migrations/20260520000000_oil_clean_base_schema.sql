-- Oil Condition Monitoring System - Core Schema (with oil_ prefix)
-- Migration: 20260202120001_oil_core_schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. OIL_CUSTOMERS TABLE
-- =============================================
CREATE TABLE oil_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oil_customers_status ON oil_customers(status);

-- =============================================
-- 2. OIL_PROFILES TABLE
-- =============================================
CREATE TABLE oil_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('customer', 'admin', 'sales')),
    customer_id UUID REFERENCES oil_customers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oil_profiles_role ON oil_profiles(role);
CREATE INDEX idx_oil_profiles_customer_id ON oil_profiles(customer_id);

-- =============================================
-- 3. OIL_PRODUCTS TABLE
-- =============================================
CREATE TABLE oil_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    product_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oil_products_name ON oil_products(product_name);

-- =============================================
-- 4. OIL_MACHINES TABLE
-- =============================================
CREATE TABLE oil_machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES oil_customers(id) ON DELETE CASCADE,
    machine_name TEXT NOT NULL,
    location TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oil_machines_customer_id ON oil_machines(customer_id);
CREATE INDEX idx_oil_machines_status ON oil_machines(status);

-- =============================================

-- =============================================
-- 6. OIL_LAB_TESTS TABLE
-- =============================================
CREATE TABLE oil_lab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES oil_machines(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES oil_products(id) ON DELETE CASCADE,
    test_date DATE NOT NULL,
    viscosity NUMERIC(10, 2),
    water_content NUMERIC(10, 4),
    tan_value NUMERIC(10, 4),
    pdf_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_oil_lab_tests_machine_id ON oil_lab_tests(machine_id);
CREATE INDEX idx_oil_lab_tests_test_date ON oil_lab_tests(test_date DESC);
CREATE INDEX idx_oil_lab_tests_machine_date ON oil_lab_tests(machine_id, test_date DESC);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_oil_customers_updated_at BEFORE UPDATE ON oil_customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oil_profiles_updated_at BEFORE UPDATE ON oil_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oil_products_updated_at BEFORE UPDATE ON oil_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oil_machines_updated_at BEFORE UPDATE ON oil_machines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oil_lab_tests_updated_at BEFORE UPDATE ON oil_lab_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Oil Condition Monitoring System - RLS Policies (with oil_ prefix)
-- Migration: 20260202120002_oil_rls_policies

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE oil_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE oil_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE oil_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE oil_machines ENABLE ROW LEVEL SECURITY;

ALTER TABLE oil_lab_tests ENABLE ROW LEVEL SECURITY;

-- =============================================
-- OIL_CUSTOMERS POLICIES
-- =============================================
CREATE POLICY "oil_customers_select_own" ON oil_customers
    FOR SELECT TO authenticated
    USING (
        id IN (SELECT customer_id FROM oil_profiles WHERE id = auth.uid())
    );

CREATE POLICY "oil_customers_select_admin" ON oil_customers
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role IN ('admin', 'sales'))
    );

CREATE POLICY "oil_customers_all_admin" ON oil_customers
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- OIL_PROFILES POLICIES
-- =============================================
CREATE POLICY "oil_profiles_select_own" ON oil_profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());

CREATE POLICY "oil_profiles_select_admin" ON oil_profiles
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "oil_profiles_all_admin" ON oil_profiles
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- OIL_PRODUCTS POLICIES
-- =============================================
CREATE POLICY "oil_products_select_all" ON oil_products
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "oil_products_all_admin" ON oil_products
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- OIL_MACHINES POLICIES
-- =============================================
CREATE POLICY "oil_machines_select_customer" ON oil_machines
    FOR SELECT TO authenticated
    USING (
        customer_id IN (SELECT customer_id FROM oil_profiles WHERE id = auth.uid())
    );

CREATE POLICY "oil_machines_select_admin" ON oil_machines
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role IN ('admin', 'sales'))
    );

CREATE POLICY "oil_machines_all_admin" ON oil_machines
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- OIL_LAB_TESTS POLICIES
-- =============================================
CREATE POLICY "oil_lab_tests_select_customer" ON oil_lab_tests
    FOR SELECT TO authenticated
    USING (
        machine_id IN (
            SELECT m.id FROM oil_machines m
            INNER JOIN oil_profiles p ON m.customer_id = p.customer_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "oil_lab_tests_select_admin" ON oil_lab_tests
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role IN ('admin', 'sales'))
    );

CREATE POLICY "oil_lab_tests_all_admin" ON oil_lab_tests
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Migration: 20260205000003_add_user_contact_info

-- Add email and phone_number columns to oil_profiles table
ALTER TABLE oil_profiles 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Add index for email lookups (optional but good for performance)
CREATE INDEX IF NOT EXISTS idx_oil_profiles_email ON oil_profiles(email);

-- Add comments for clarity
COMMENT ON COLUMN oil_profiles.email IS 'User email address (optional)';
COMMENT ON COLUMN oil_profiles.phone_number IS 'User phone number (optional)';

-- Re-enable and harden RLS on oil_profiles.
-- This migration restores RLS and applies explicit least-privilege policies.

ALTER TABLE oil_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "oil_profiles_select_own" ON oil_profiles;
DROP POLICY IF EXISTS "oil_profiles_select_admin" ON oil_profiles;
DROP POLICY IF EXISTS "oil_profiles_all_admin" ON oil_profiles;
DROP POLICY IF EXISTS "oil_profiles_select_all_authenticated" ON oil_profiles;
DROP POLICY IF EXISTS "oil_profiles_all_authenticated" ON oil_profiles;
DROP POLICY IF EXISTS "oil_profiles_select_secure" ON oil_profiles;
DROP POLICY IF EXISTS "oil_profiles_insert_secure" ON oil_profiles;
DROP POLICY IF EXISTS "oil_profiles_update_secure" ON oil_profiles;
DROP POLICY IF EXISTS "oil_profiles_delete_secure" ON oil_profiles;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.oil_profiles
  WHERE id = auth.uid()
  LIMIT 1;

  RETURN user_role;
END;
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

CREATE POLICY "oil_profiles_select_secure"
ON oil_profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.current_user_role() IN ('admin', 'sales')
);

CREATE POLICY "oil_profiles_insert_secure"
ON oil_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_role() IN ('admin', 'sales')
);

CREATE POLICY "oil_profiles_update_secure"
ON oil_profiles
FOR UPDATE
TO authenticated
USING (
  public.current_user_role() IN ('admin', 'sales')
)
WITH CHECK (
  public.current_user_role() IN ('admin', 'sales')
);

CREATE POLICY "oil_profiles_delete_secure"
ON oil_profiles
FOR DELETE
TO authenticated
USING (
  public.current_user_role() = 'admin'
);
-- Persisted alert actions for admin/customer workflows
-- Stores reviewed/email_sent/customer_read actions by alert key

CREATE TABLE IF NOT EXISTS public.oil_alert_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('reviewed', 'email_sent', 'customer_read')),
  actor_id UUID REFERENCES public.oil_profiles(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.oil_customers(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES public.oil_machines(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_oil_alert_actions_unique_key_type
  ON public.oil_alert_actions(alert_key, action_type);

CREATE INDEX IF NOT EXISTS idx_oil_alert_actions_alert_key
  ON public.oil_alert_actions(alert_key);

CREATE INDEX IF NOT EXISTS idx_oil_alert_actions_actor_id
  ON public.oil_alert_actions(actor_id);

ALTER TABLE public.oil_alert_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_sales_manage_alert_actions" ON public.oil_alert_actions;
CREATE POLICY "admin_sales_manage_alert_actions"
ON public.oil_alert_actions
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.oil_profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'sales')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.oil_profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'sales')
  )
);

DROP POLICY IF EXISTS "customer_read_own_alert_actions" ON public.oil_alert_actions;
CREATE POLICY "customer_read_own_alert_actions"
ON public.oil_alert_actions
FOR SELECT
USING (
  action_type = 'customer_read'
  AND actor_id = auth.uid()
);

DROP POLICY IF EXISTS "customer_insert_own_read_actions" ON public.oil_alert_actions;
CREATE POLICY "customer_insert_own_read_actions"
ON public.oil_alert_actions
FOR INSERT
WITH CHECK (
  action_type = 'customer_read'
  AND actor_id = auth.uid()
);

COMMENT ON TABLE public.oil_alert_actions IS 'Persistent actions for dashboard alerts: reviewed, email sent, customer read.';
-- Actionability Foundation: maintenance actions and audit trail

CREATE TABLE IF NOT EXISTS public.oil_maintenance_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.oil_customers(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES public.oil_machines(id) ON DELETE CASCADE,
  alert_key TEXT,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'verified', 'overdue')),
  owner_profile_id UUID REFERENCES public.oil_profiles(id) ON DELETE SET NULL,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.oil_profiles(id) ON DELETE SET NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'passed', 'failed')),
  evidence_notes TEXT,
  source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.oil_profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.oil_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.oil_maintenance_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES public.oil_maintenance_actions(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.oil_profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'updated', 'status_changed', 'assigned', 'completed', 'verified', 'reopened')),
  from_status TEXT,
  to_status TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oil_maintenance_actions_customer_id
  ON public.oil_maintenance_actions(customer_id);

CREATE INDEX IF NOT EXISTS idx_oil_maintenance_actions_machine_id
  ON public.oil_maintenance_actions(machine_id);

CREATE INDEX IF NOT EXISTS idx_oil_maintenance_actions_status
  ON public.oil_maintenance_actions(status);

CREATE INDEX IF NOT EXISTS idx_oil_maintenance_actions_owner
  ON public.oil_maintenance_actions(owner_profile_id);

CREATE INDEX IF NOT EXISTS idx_oil_maintenance_actions_due_date
  ON public.oil_maintenance_actions(due_date);

CREATE INDEX IF NOT EXISTS idx_oil_maintenance_action_logs_action_id
  ON public.oil_maintenance_action_logs(action_id);

ALTER TABLE public.oil_maintenance_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oil_maintenance_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maintenance_actions_select_customer" ON public.oil_maintenance_actions;
CREATE POLICY "maintenance_actions_select_customer"
ON public.oil_maintenance_actions
FOR SELECT
TO authenticated
USING (
  customer_id IN (SELECT customer_id FROM public.oil_profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "maintenance_actions_manage_customer" ON public.oil_maintenance_actions;
CREATE POLICY "maintenance_actions_manage_customer"
ON public.oil_maintenance_actions
FOR ALL
TO authenticated
USING (
  customer_id IN (SELECT customer_id FROM public.oil_profiles WHERE id = auth.uid())
)
WITH CHECK (
  customer_id IN (SELECT customer_id FROM public.oil_profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "maintenance_action_logs_select_customer" ON public.oil_maintenance_action_logs;
CREATE POLICY "maintenance_action_logs_select_customer"
ON public.oil_maintenance_action_logs
FOR SELECT
TO authenticated
USING (
  action_id IN (
    SELECT id FROM public.oil_maintenance_actions
    WHERE customer_id IN (SELECT customer_id FROM public.oil_profiles WHERE id = auth.uid())
  )
);

DROP POLICY IF EXISTS "maintenance_action_logs_manage_customer" ON public.oil_maintenance_action_logs;
CREATE POLICY "maintenance_action_logs_manage_customer"
ON public.oil_maintenance_action_logs
FOR ALL
TO authenticated
USING (
  action_id IN (
    SELECT id FROM public.oil_maintenance_actions
    WHERE customer_id IN (SELECT customer_id FROM public.oil_profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  action_id IN (
    SELECT id FROM public.oil_maintenance_actions
    WHERE customer_id IN (SELECT customer_id FROM public.oil_profiles WHERE id = auth.uid())
  )
);

CREATE OR REPLACE FUNCTION public.touch_oil_maintenance_actions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_oil_maintenance_actions_updated_at ON public.oil_maintenance_actions;
CREATE TRIGGER update_oil_maintenance_actions_updated_at
BEFORE UPDATE ON public.oil_maintenance_actions
FOR EACH ROW
EXECUTE FUNCTION public.touch_oil_maintenance_actions_updated_at();

COMMENT ON TABLE public.oil_maintenance_actions IS 'Customer-owned maintenance action board linked to machine alerts and follow-up tasks.';
COMMENT ON TABLE public.oil_maintenance_action_logs IS 'Audit log for maintenance action lifecycle and ownership changes.';
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
SET search_path = public, extensions
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
SET search_path = public, extensions
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
SET search_path = public, extensions
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
-- Allow lab-test requests for new machines before machine registration.
-- Existing flows still set machine_id for known machines; admin can backfill machine_id after verification.
ALTER TABLE public.oil_maintenance_actions
  ALTER COLUMN machine_id DROP NOT NULL;
-- Fix RLS policies for oil_maintenance_actions to allow Admin and Sales access
-- Migration: 20260515000000_fix_admin_access_maintenance_actions

-- 1. Allow Admin and Sales to SELECT all maintenance actions
DROP POLICY IF EXISTS "maintenance_actions_select_admin" ON public.oil_maintenance_actions;
CREATE POLICY "maintenance_actions_select_admin"
ON public.oil_maintenance_actions
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.oil_profiles WHERE id = auth.uid() AND role IN ('admin', 'sales'))
);

-- 2. Allow Admin to MANAGE (ALL) all maintenance actions
DROP POLICY IF EXISTS "maintenance_actions_all_admin" ON public.oil_maintenance_actions;
CREATE POLICY "maintenance_actions_all_admin"
ON public.oil_maintenance_actions
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.oil_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Also fix logs for Admin access
DROP POLICY IF EXISTS "maintenance_action_logs_select_admin" ON public.oil_maintenance_action_logs;
CREATE POLICY "maintenance_action_logs_select_admin"
ON public.oil_maintenance_action_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.oil_profiles WHERE id = auth.uid() AND role IN ('admin', 'sales'))
);

DROP POLICY IF EXISTS "maintenance_action_logs_all_admin" ON public.oil_maintenance_action_logs;
CREATE POLICY "maintenance_action_logs_all_admin"
ON public.oil_maintenance_action_logs
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.oil_profiles WHERE id = auth.uid() AND role = 'admin')
);
-- Migration: Create helper functions for Row-Level Security (RLS) policies.
-- These functions provide a secure way to access user claims from the JWT.

-- Function to get a specific claim from the currently authenticated user's JWT.
-- Usage: get_my_claim('user_role') -> 'admin'
CREATE OR REPLACE FUNCTION public.get_my_claim(claim TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN nullif(current_setting('request.jwt.claims', true), '')::JSONB ->> claim;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get the customer_id for the currently authenticated user.
-- This is a convenience wrapper around get_my_claim.
-- Usage: get_my_customer_id() -> 'uuid-for-customer'
CREATE OR REPLACE FUNCTION public.get_my_customer_id()
RETURNS UUID AS $$
DECLARE
    customer_id_text TEXT;
BEGIN
    customer_id_text := get_my_claim('customer_id');
    IF customer_id_text IS NULL THEN
        RETURN NULL;
    END IF;
    -- The claim is stored as a JSON string, so we need to unquote it before casting.
    RETURN (TRIM(BOTH '"' FROM customer_id_text))::UUID;
EXCEPTION
    WHEN OTHERS THEN
        -- Return NULL if casting fails for any reason
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Migration: Create a dedicated table for lab test requests from customers.
-- This separates the request process from maintenance actions, providing a clear data flow.

CREATE TABLE IF NOT EXISTS public.oil_lab_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Core request details
    customer_id UUID NOT NULL REFERENCES public.oil_customers(id) ON DELETE CASCADE,
    machine_id UUID REFERENCES public.oil_machines(id) ON DELETE SET NULL, -- Can be null for new machines
    requested_by_profile_id UUID NOT NULL REFERENCES public.oil_profiles(id) ON DELETE CASCADE,
    assigned_to_profile_id UUID REFERENCES public.oil_profiles(id) ON DELETE SET NULL, -- For sales/admin to assign

    -- Request content
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'sampling', 'completed', 'cancelled')),
    
    -- Scheduling
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,

    -- Special case for unregistered machines
    is_new_machine BOOLEAN NOT NULL DEFAULT FALSE,
    new_machine_data JSONB
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_oil_lab_requests_customer_id ON public.oil_lab_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_oil_lab_requests_status ON public.oil_lab_requests(status);
CREATE INDEX IF NOT EXISTS idx_oil_lab_requests_assigned_to ON public.oil_lab_requests(assigned_to_profile_id);

-- Enable Row-Level Security
ALTER TABLE public.oil_lab_requests ENABLE ROW LEVEL SECURITY;

-- Grant usage permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oil_lab_requests TO authenticated;

--
-- RLS POLICIES
--

-- 1. Admin & Sales can manage all lab requests
DROP POLICY IF EXISTS "lab_requests_manage_all_admin_sales" ON public.oil_lab_requests;
CREATE POLICY "lab_requests_manage_all_admin_sales"
    ON public.oil_lab_requests
    FOR ALL
    USING (get_my_claim('user_role') IN ('admin', 'sales'))
    WITH CHECK (get_my_claim('user_role') IN ('admin', 'sales'));

-- 2. Customers can create requests for their own company
DROP POLICY IF EXISTS "lab_requests_insert_customer" ON public.oil_lab_requests;
CREATE POLICY "lab_requests_insert_customer"
    ON public.oil_lab_requests
    FOR INSERT
    WITH CHECK (
        get_my_claim('user_role') = 'customer' AND
        customer_id = get_my_customer_id()
    );

-- 3. Customers can view requests they have created for their company
DROP POLICY IF EXISTS "lab_requests_select_customer" ON public.oil_lab_requests;
CREATE POLICY "lab_requests_select_customer"
    ON public.oil_lab_requests
    FOR SELECT
    USING (
        get_my_claim('user_role') = 'customer' AND
        customer_id = get_my_customer_id()
    );
-- Migration: Create stored procedure for lab request insertion
-- This bypasses PostgREST schema cache issues by using direct SQL execution

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
    v_id UUID;
BEGIN
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

GRANT EXECUTE ON FUNCTION public.insert_lab_request(UUID, UUID, UUID, TEXT, TEXT, DATE, TEXT, BOOLEAN, JSONB) TO authenticated;
