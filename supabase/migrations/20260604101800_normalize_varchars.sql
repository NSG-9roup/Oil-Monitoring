-- Migration: 20260604101800_normalize_varchars.sql
-- Description: Normalize TEXT columns to VARCHAR with sensible lengths to optimize schema

-- 1. oil_customers
ALTER TABLE public.oil_customers
  ALTER COLUMN company_name TYPE VARCHAR(50);

-- 2. oil_profiles
ALTER TABLE public.oil_profiles
  ALTER COLUMN full_name TYPE VARCHAR(50),
  ALTER COLUMN email TYPE VARCHAR(50),
  ALTER COLUMN phone_number TYPE VARCHAR(20);

-- 3. oil_products
ALTER TABLE public.oil_products
  ALTER COLUMN product_name TYPE VARCHAR(50),
  ALTER COLUMN product_type TYPE VARCHAR(50),
  ALTER COLUMN base_oil TYPE VARCHAR(50),
  ALTER COLUMN viscosity_grade TYPE VARCHAR(20),
  ALTER COLUMN oil_grade TYPE VARCHAR(20);

-- 4. oil_machines
ALTER TABLE public.oil_machines
  ALTER COLUMN machine_name TYPE VARCHAR(50),
  ALTER COLUMN location TYPE VARCHAR(100),
  ALTER COLUMN model TYPE VARCHAR(50),
  ALTER COLUMN serial_number TYPE VARCHAR(50);

-- 5. oil_lab_tests
ALTER TABLE public.oil_lab_tests
  ALTER COLUMN pdf_path TYPE VARCHAR(1000),
  ALTER COLUMN notes TYPE VARCHAR(2000);

-- 6. oil_lab_requests
ALTER TABLE public.oil_lab_requests
  ALTER COLUMN title TYPE VARCHAR(100),
  ALTER COLUMN description TYPE VARCHAR(1000),
  ALTER COLUMN sample_photo_path TYPE VARCHAR(255);

-- 7. oil_maintenance_actions
ALTER TABLE public.oil_maintenance_actions
  ALTER COLUMN title TYPE VARCHAR(100),
  ALTER COLUMN description TYPE VARCHAR(1000),
  ALTER COLUMN alert_key TYPE VARCHAR(100),
  ALTER COLUMN evidence_notes TYPE VARCHAR(1000);

-- 8. oil_maintenance_action_logs
ALTER TABLE public.oil_maintenance_action_logs
  ALTER COLUMN from_status TYPE VARCHAR(50),
  ALTER COLUMN to_status TYPE VARCHAR(50);

-- 9. oil_alert_actions
ALTER TABLE public.oil_alert_actions
  ALTER COLUMN alert_key TYPE VARCHAR(100);

-- 10. oil_complaints
ALTER TABLE public.oil_complaints
  ALTER COLUMN description TYPE VARCHAR(2000),
  ALTER COLUMN resolution_notes TYPE VARCHAR(2000);
