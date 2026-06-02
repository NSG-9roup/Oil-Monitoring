-- Migration to remove all PIN-related logic from the database
-- Date: 2026-05-29

-- 1. Drop the RPC functions related to PIN set and verify
DROP FUNCTION IF EXISTS public.verify_customer_user_management_pin(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.set_customer_user_management_pin(UUID, TEXT) CASCADE;

-- 2. Drop the column user_management_pin_hash from public.oil_customers
ALTER TABLE public.oil_customers DROP COLUMN IF EXISTS user_management_pin_hash CASCADE;

COMMENT ON TABLE public.oil_customers IS 'Table of corporate client customers with authorization PINs completely removed.';
