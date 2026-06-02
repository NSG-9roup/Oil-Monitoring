-- Migration: Enable Row-Level Security (RLS) on public.oil_rate_limits
-- Date: 2026-06-02
-- Reason: Hardening database against direct public REST API manipulation.

ALTER TABLE public.oil_rate_limits ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.oil_rate_limits IS 'Distributed rate limiting store. Protected by RLS with default deny-all policy (only SECURITY DEFINER functions can write).';
