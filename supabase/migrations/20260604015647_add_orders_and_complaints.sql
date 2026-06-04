-- Migration: 20260604015647_add_orders_and_complaints.sql
-- Description: Add tables for oil orders and complaints with RLS policies

-- =============================================
-- 1. OIL_ORDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.oil_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.oil_customers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.oil_products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_oil_orders_customer_id ON public.oil_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_oil_orders_status ON public.oil_orders(status);
CREATE INDEX IF NOT EXISTS idx_oil_orders_created_at ON public.oil_orders(created_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_oil_orders_updated_at ON public.oil_orders;
CREATE TRIGGER update_oil_orders_updated_at
    BEFORE UPDATE ON public.oil_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 2. OIL_COMPLAINTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.oil_complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.oil_orders(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.oil_customers(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_oil_complaints_order_id ON public.oil_complaints(order_id);
CREATE INDEX IF NOT EXISTS idx_oil_complaints_customer_id ON public.oil_complaints(customer_id);
CREATE INDEX IF NOT EXISTS idx_oil_complaints_status ON public.oil_complaints(status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_oil_complaints_updated_at ON public.oil_complaints;
CREATE TRIGGER update_oil_complaints_updated_at
    BEFORE UPDATE ON public.oil_complaints
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ENABLE RLS ON NEW TABLES
-- =============================================
ALTER TABLE public.oil_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oil_complaints ENABLE ROW LEVEL SECURITY;

-- Grant usage permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oil_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oil_complaints TO authenticated;

-- =============================================
-- OIL_ORDERS POLICIES
-- =============================================

-- Admin & Sales can manage all orders
DROP POLICY IF EXISTS "orders_manage_all_admin_sales" ON public.oil_orders;
CREATE POLICY "orders_manage_all_admin_sales"
    ON public.oil_orders
    FOR ALL
    USING (public.get_my_claim('user_role') IN ('admin', 'sales'))
    WITH CHECK (public.get_my_claim('user_role') IN ('admin', 'sales'));

-- Customers can insert their own orders
DROP POLICY IF EXISTS "orders_insert_customer" ON public.oil_orders;
CREATE POLICY "orders_insert_customer"
    ON public.oil_orders
    FOR INSERT
    WITH CHECK (
        public.get_my_claim('user_role') = 'customer' AND
        customer_id = public.get_my_customer_id()
    );

-- Customers can view their own orders
DROP POLICY IF EXISTS "orders_select_customer" ON public.oil_orders;
CREATE POLICY "orders_select_customer"
    ON public.oil_orders
    FOR SELECT
    USING (
        public.get_my_claim('user_role') = 'customer' AND
        customer_id = public.get_my_customer_id()
    );

-- =============================================
-- OIL_COMPLAINTS POLICIES
-- =============================================

-- Admin & Sales can manage all complaints
DROP POLICY IF EXISTS "complaints_manage_all_admin_sales" ON public.oil_complaints;
CREATE POLICY "complaints_manage_all_admin_sales"
    ON public.oil_complaints
    FOR ALL
    USING (public.get_my_claim('user_role') IN ('admin', 'sales'))
    WITH CHECK (public.get_my_claim('user_role') IN ('admin', 'sales'));

-- Customers can insert their own complaints
DROP POLICY IF EXISTS "complaints_insert_customer" ON public.oil_complaints;
CREATE POLICY "complaints_insert_customer"
    ON public.oil_complaints
    FOR INSERT
    WITH CHECK (
        public.get_my_claim('user_role') = 'customer' AND
        customer_id = public.get_my_customer_id()
    );

-- Customers can view their own complaints
DROP POLICY IF EXISTS "complaints_select_customer" ON public.oil_complaints;
CREATE POLICY "complaints_select_customer"
    ON public.oil_complaints
    FOR SELECT
    USING (
        public.get_my_claim('user_role') = 'customer' AND
        customer_id = public.get_my_customer_id()
    );
