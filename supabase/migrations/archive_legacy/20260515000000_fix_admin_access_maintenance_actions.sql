-- Fix RLS policies for oil_maintenance_actions to allow Admin and Sales access
-- Migration: 20260515000000_fix_admin_access_maintenance_actions

-- 1. Allow Admin and Sales to SELECT all maintenance actions
DROP POLICY IF EXISTS "maintenance_actions_select_admin" ON public.oil_maintenance_actions;
CREATE POLICY "maintenance_actions_select_admin"
ON public.oil_maintenance_actions
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.oil_profiles WHERE id = auth.uid() AND role IN ('admin', 'sales'))
);

-- 2. Allow Admin to MANAGE (ALL) all maintenance actions
DROP POLICY IF EXISTS "maintenance_actions_all_admin" ON public.oil_maintenance_actions;
CREATE POLICY "maintenance_actions_all_admin"
ON public.oil_maintenance_actions
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.oil_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Also fix logs for Admin access
DROP POLICY IF EXISTS "maintenance_action_logs_select_admin" ON public.oil_maintenance_action_logs;
CREATE POLICY "maintenance_action_logs_select_admin"
ON public.oil_maintenance_action_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.oil_profiles WHERE id = auth.uid() AND role IN ('admin', 'sales'))
);

DROP POLICY IF EXISTS "maintenance_action_logs_all_admin" ON public.oil_maintenance_action_logs;
CREATE POLICY "maintenance_action_logs_all_admin"
ON public.oil_maintenance_action_logs
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.oil_profiles WHERE id = auth.uid() AND role = 'admin')
);
