-- =========================================================================
-- Migration: 20260608000001_harden_rls_policies.sql
-- Description: Decouple table row access from custom claims and use secure profile lookup.
-- =========================================================================

-- 1. Redefine get_my_customer_id() securely querying public.oil_profiles directly
CREATE OR REPLACE FUNCTION public.get_my_customer_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT customer_id FROM public.oil_profiles WHERE id = auth.uid();
$$;

-- 2. Drop and recreate policies for oil_customers
DROP POLICY IF EXISTS "oil_customers_select_own" ON public.oil_customers;
CREATE POLICY "oil_customers_select_own" ON public.oil_customers
    FOR SELECT TO authenticated
    USING (id = public.get_my_customer_id());

-- 3. Drop and recreate policies for oil_machines
DROP POLICY IF EXISTS "oil_machines_select_customer" ON public.oil_machines;
CREATE POLICY "oil_machines_select_customer" ON public.oil_machines
    FOR SELECT TO authenticated
    USING (customer_id = public.get_my_customer_id());

-- 4. Drop and recreate policies for oil_lab_requests
DROP POLICY IF EXISTS "lab_requests_insert_customer" ON public.oil_lab_requests;
DROP POLICY IF EXISTS "lab_requests_select_customer" ON public.oil_lab_requests;

CREATE POLICY "lab_requests_insert_customer"
    ON public.oil_lab_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_user_role() = 'customer' AND
        customer_id = public.get_my_customer_id()
    );

CREATE POLICY "lab_requests_select_customer"
    ON public.oil_lab_requests
    FOR SELECT
    TO authenticated
    USING (
        public.current_user_role() = 'customer' AND
        customer_id = public.get_my_customer_id()
    );

-- 5. Drop and recreate policies for oil_orders
DROP POLICY IF EXISTS "orders_insert_customer" ON public.oil_orders;
DROP POLICY IF EXISTS "orders_select_customer" ON public.oil_orders;

CREATE POLICY "orders_insert_customer"
    ON public.oil_orders
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_user_role() = 'customer' AND
        customer_id = public.get_my_customer_id()
    );

CREATE POLICY "orders_select_customer"
    ON public.oil_orders
    FOR SELECT
    TO authenticated
    USING (
        public.current_user_role() = 'customer' AND
        customer_id = public.get_my_customer_id()
    );

-- 6. Drop and recreate policies for oil_complaints
DROP POLICY IF EXISTS "complaints_insert_customer" ON public.oil_complaints;
DROP POLICY IF EXISTS "complaints_select_customer" ON public.oil_complaints;

CREATE POLICY "complaints_insert_customer"
    ON public.oil_complaints
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_user_role() = 'customer' AND
        customer_id = public.get_my_customer_id()
    );

CREATE POLICY "complaints_select_customer"
    ON public.oil_complaints
    FOR SELECT
    TO authenticated
    USING (
        public.current_user_role() = 'customer' AND
        customer_id = public.get_my_customer_id()
    );

-- 7. Drop and recreate policies for oil_lab_tests
DROP POLICY IF EXISTS "oil_lab_tests_select_customer" ON public.oil_lab_tests;
CREATE POLICY "oil_lab_tests_select_customer" ON public.oil_lab_tests
    FOR SELECT TO authenticated
    USING (customer_id = public.get_my_customer_id());
