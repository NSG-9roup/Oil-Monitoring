-- Migration: 20260604142100_fix_orders_complaints_rls.sql
-- Description: Fix Row-Level Security (RLS) Policies on oil_orders and oil_complaints to use current_user_role() instead of JWT claims.

-- =============================================
-- OIL_ORDERS POLICIES
-- =============================================

-- Drop JWT claims-based policies for oil_orders
DROP POLICY IF EXISTS "orders_manage_all_admin_sales" ON public.oil_orders;
DROP POLICY IF EXISTS "orders_insert_customer" ON public.oil_orders;
DROP POLICY IF EXISTS "orders_select_customer" ON public.oil_orders;

-- 1. Admin & Sales can manage (SELECT, INSERT, UPDATE, DELETE) all orders
CREATE POLICY "orders_manage_all_admin_sales"
    ON public.oil_orders
    FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'sales'))
    WITH CHECK (public.current_user_role() IN ('admin', 'sales'));

-- 2. Customers can create orders for their own company
CREATE POLICY "orders_insert_customer"
    ON public.oil_orders
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_user_role() = 'customer' AND
        customer_id IN (SELECT customer_id FROM public.oil_profiles WHERE id = auth.uid())
    );

-- 3. Customers can view orders of their own company
CREATE POLICY "orders_select_customer"
    ON public.oil_orders
    FOR SELECT
    TO authenticated
    USING (
        public.current_user_role() = 'customer' AND
        customer_id IN (SELECT customer_id FROM public.oil_profiles WHERE id = auth.uid())
    );

-- =============================================
-- OIL_COMPLAINTS POLICIES
-- =============================================

-- Drop JWT claims-based policies for oil_complaints
DROP POLICY IF EXISTS "complaints_manage_all_admin_sales" ON public.oil_complaints;
DROP POLICY IF EXISTS "complaints_insert_customer" ON public.oil_complaints;
DROP POLICY IF EXISTS "complaints_select_customer" ON public.oil_complaints;

-- 1. Admin & Sales can manage all complaints
CREATE POLICY "complaints_manage_all_admin_sales"
    ON public.oil_complaints
    FOR ALL
    TO authenticated
    USING (public.current_user_role() IN ('admin', 'sales'))
    WITH CHECK (public.current_user_role() IN ('admin', 'sales'));

-- 2. Customers can create complaints for their own company
CREATE POLICY "complaints_insert_customer"
    ON public.oil_complaints
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_user_role() = 'customer' AND
        customer_id IN (SELECT customer_id FROM public.oil_profiles WHERE id = auth.uid())
    );

-- 3. Customers can view complaints of their own company
CREATE POLICY "complaints_select_customer"
    ON public.oil_complaints
    FOR SELECT
    TO authenticated
    USING (
        public.current_user_role() = 'customer' AND
        customer_id IN (SELECT customer_id FROM public.oil_profiles WHERE id = auth.uid())
    );
