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
