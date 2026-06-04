-- Migration: 20260604104000_drop_unused_tables.sql
-- Description: Drop unused tables (maintenance actions, maintenance action logs, alert actions) to streamline database schema for MIS thesis format

DROP TABLE IF EXISTS public.oil_maintenance_action_logs CASCADE;
DROP TABLE IF EXISTS public.oil_maintenance_actions CASCADE;
DROP TABLE IF EXISTS public.oil_alert_actions CASCADE;

DROP FUNCTION IF EXISTS public.touch_oil_maintenance_actions_updated_at() CASCADE;
