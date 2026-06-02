-- =========================================================================
-- Migration: Fix Row-Level Security (RLS) Policies on oil_lab_requests
-- =========================================================================

-- Drop legacy JWT claims-based policies
DROP POLICY IF EXISTS "lab_requests_manage_all_admin_sales" ON public.oil_lab_requests;
DROP POLICY IF EXISTS "lab_requests_insert_customer" ON public.oil_lab_requests;
DROP POLICY IF EXISTS "lab_requests_select_customer" ON public.oil_lab_requests;

-- 1. Admin & Sales can manage (SELECT, INSERT, UPDATE, DELETE) all lab requests
CREATE POLICY "lab_requests_manage_all_admin_sales"
    ON public.oil_lab_requests
    FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'sales'))
    WITH CHECK (public.current_user_role() IN ('admin', 'sales'));

-- 2. Customers can create requests for their own company
CREATE POLICY "lab_requests_insert_customer"
    ON public.oil_lab_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_user_role() = 'customer' AND
        customer_id IN (SELECT customer_id FROM public.oil_profiles WHERE id = auth.uid())
    );

-- 3. Customers can view requests they have created for their company
CREATE POLICY "lab_requests_select_customer"
    ON public.oil_lab_requests
    FOR SELECT
    TO authenticated
    USING (
        public.current_user_role() = 'customer' AND
        customer_id IN (SELECT customer_id FROM public.oil_profiles WHERE id = auth.uid())
    );
