-- Migration: 20260923000000_add_running_hours_unit.sql
-- Add running_hours_unit column to oil_lab_tests and oil_lab_requests with default 'hours'

ALTER TABLE public.oil_lab_tests
  ADD COLUMN IF NOT EXISTS running_hours_unit VARCHAR(20) DEFAULT 'hours';

ALTER TABLE public.oil_lab_requests
  ADD COLUMN IF NOT EXISTS running_hours_unit VARCHAR(20) DEFAULT 'hours';
