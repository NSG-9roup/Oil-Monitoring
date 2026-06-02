-- =============================================
-- Migration: Add missing columns to existing tables
-- to align database schema with TypeScript types
-- =============================================

-- -----------------------------------------------
-- 1. oil_machines: add model, serial_number
-- -----------------------------------------------
ALTER TABLE public.oil_machines
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS serial_number TEXT;

-- -----------------------------------------------
-- 2. oil_products: add extended fields
-- -----------------------------------------------
ALTER TABLE public.oil_products
  ADD COLUMN IF NOT EXISTS base_oil TEXT,
  ADD COLUMN IF NOT EXISTS viscosity_grade TEXT,
  ADD COLUMN IF NOT EXISTS oil_grade TEXT,
  ADD COLUMN IF NOT EXISTS baseline_viscosity_40c NUMERIC(10, 4),
  ADD COLUMN IF NOT EXISTS baseline_viscosity_100c NUMERIC(10, 4),
  ADD COLUMN IF NOT EXISTS baseline_tan NUMERIC(10, 4);

-- -----------------------------------------------
-- 3. oil_lab_tests: add extended fields
--    (keep old 'viscosity' column for backward compat,
--     but add the new split columns the app uses)
-- -----------------------------------------------
ALTER TABLE public.oil_lab_tests
  ADD COLUMN IF NOT EXISTS test_type TEXT,
  ADD COLUMN IF NOT EXISTS viscosity_40c NUMERIC(10, 4),
  ADD COLUMN IF NOT EXISTS viscosity_100c NUMERIC(10, 4),
  ADD COLUMN IF NOT EXISTS water_content_unit TEXT DEFAULT 'PPM' CHECK (water_content_unit IN ('PPM', 'PERCENT')),
  ADD COLUMN IF NOT EXISTS notes TEXT;
