-- Migration: 20260918000000_add_running_hours_and_complaints_enhancement.sql
-- Description:
-- 1. Add running_hours to public.oil_lab_requests
-- 2. Add running_hours, overall_status, and parameter min/max tolerances to public.oil_lab_tests
-- 3. Decouple public.oil_complaints from oil_orders (make order_id NULLABLE), and add category, machine_id, and title.

-- 1. OIL_LAB_REQUESTS: Add running_hours
ALTER TABLE public.oil_lab_requests
  ADD COLUMN IF NOT EXISTS running_hours NUMERIC(10, 1) DEFAULT NULL;

-- 2. OIL_LAB_TESTS: Add running_hours, overall_status, and min/max tolerances for TS
ALTER TABLE public.oil_lab_tests
  ADD COLUMN IF NOT EXISTS running_hours NUMERIC(10, 1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS overall_status TEXT DEFAULT 'normal' CHECK (overall_status IN ('normal', 'warning', 'critical')),
  ADD COLUMN IF NOT EXISTS viscosity_40c_min NUMERIC(10, 4) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS viscosity_40c_max NUMERIC(10, 4) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS water_content_max NUMERIC(10, 4) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tan_max NUMERIC(10, 4) DEFAULT NULL;

-- 3. OIL_COMPLAINTS: Decouple from orders and add category & machine support
ALTER TABLE public.oil_complaints
  ALTER COLUMN order_id DROP NOT NULL;

ALTER TABLE public.oil_complaints
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('lab_test', 'order', 'machine', 'service', 'general')),
  ADD COLUMN IF NOT EXISTS machine_id UUID REFERENCES public.oil_machines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Laporan Kendala / Komplain';

CREATE INDEX IF NOT EXISTS idx_oil_complaints_machine_id ON public.oil_complaints(machine_id);
CREATE INDEX IF NOT EXISTS idx_oil_complaints_category ON public.oil_complaints(category);
