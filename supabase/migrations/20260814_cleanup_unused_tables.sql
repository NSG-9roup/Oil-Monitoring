-- Migration: Cleanup and Drop Unused Legacy Tables
-- These tables have 0 rows and are completely unreferenced in the application codebase.

DROP TABLE IF EXISTS public.oil_activity_logs CASCADE;
DROP TABLE IF EXISTS public.oil_notifications CASCADE;
DROP TABLE IF EXISTS public.oil_samples CASCADE;
DROP TABLE IF EXISTS public.oil_quotations CASCADE;
DROP TABLE IF EXISTS public.oil_customer_users CASCADE;
DROP TABLE IF EXISTS public.oil_machine_types CASCADE;
DROP TABLE IF EXISTS public.oil_rate_limits CASCADE;
DROP TABLE IF EXISTS public.oil_settings CASCADE;
DROP TABLE IF EXISTS public.oil_logs CASCADE;
DROP TABLE IF EXISTS public.oil_comments CASCADE;

-- Drop legacy non-prefixed tables
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.machines CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.lab_tests CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.complaints CASCADE;
