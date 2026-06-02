-- Actionability Foundation: maintenance actions and audit trail

CREATE TABLE IF NOT EXISTS public.oil_maintenance_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.oil_customers(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES public.oil_machines(id) ON DELETE CASCADE,
  alert_key TEXT,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'verified', 'overdue')),
  owner_profile_id UUID REFERENCES public.oil_profiles(id) ON DELETE SET NULL,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.oil_profiles(id) ON DELETE SET NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'passed', 'failed')),
  evidence_notes TEXT,
  source_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.oil_profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.oil_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.oil_maintenance_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES public.oil_maintenance_actions(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.oil_profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'updated', 'status_changed', 'assigned', 'completed', 'verified', 'reopened')),
  from_status TEXT,
  to_status TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oil_maintenance_actions_customer_id
  ON public.oil_maintenance_actions(customer_id);

CREATE INDEX IF NOT EXISTS idx_oil_maintenance_actions_machine_id
  ON public.oil_maintenance_actions(machine_id);

CREATE INDEX IF NOT EXISTS idx_oil_maintenance_actions_status
  ON public.oil_maintenance_actions(status);

CREATE INDEX IF NOT EXISTS idx_oil_maintenance_actions_owner
  ON public.oil_maintenance_actions(owner_profile_id);

CREATE INDEX IF NOT EXISTS idx_oil_maintenance_actions_due_date
  ON public.oil_maintenance_actions(due_date);

CREATE INDEX IF NOT EXISTS idx_oil_maintenance_action_logs_action_id
  ON public.oil_maintenance_action_logs(action_id);

ALTER TABLE public.oil_maintenance_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oil_maintenance_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maintenance_actions_select_customer" ON public.oil_maintenance_actions;
CREATE POLICY "maintenance_actions_select_customer"
ON public.oil_maintenance_actions
FOR SELECT
TO authenticated
USING (
  customer_id IN (SELECT customer_id FROM public.oil_profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "maintenance_actions_manage_customer" ON public.oil_maintenance_actions;
CREATE POLICY "maintenance_actions_manage_customer"
ON public.oil_maintenance_actions
FOR ALL
TO authenticated
USING (
  customer_id IN (SELECT customer_id FROM public.oil_profiles WHERE id = auth.uid())
)
WITH CHECK (
  customer_id IN (SELECT customer_id FROM public.oil_profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "maintenance_action_logs_select_customer" ON public.oil_maintenance_action_logs;
CREATE POLICY "maintenance_action_logs_select_customer"
ON public.oil_maintenance_action_logs
FOR SELECT
TO authenticated
USING (
  action_id IN (
    SELECT id FROM public.oil_maintenance_actions
    WHERE customer_id IN (SELECT customer_id FROM public.oil_profiles WHERE id = auth.uid())
  )
);

DROP POLICY IF EXISTS "maintenance_action_logs_manage_customer" ON public.oil_maintenance_action_logs;
CREATE POLICY "maintenance_action_logs_manage_customer"
ON public.oil_maintenance_action_logs
FOR ALL
TO authenticated
USING (
  action_id IN (
    SELECT id FROM public.oil_maintenance_actions
    WHERE customer_id IN (SELECT customer_id FROM public.oil_profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  action_id IN (
    SELECT id FROM public.oil_maintenance_actions
    WHERE customer_id IN (SELECT customer_id FROM public.oil_profiles WHERE id = auth.uid())
  )
);

CREATE OR REPLACE FUNCTION public.touch_oil_maintenance_actions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_oil_maintenance_actions_updated_at ON public.oil_maintenance_actions;
CREATE TRIGGER update_oil_maintenance_actions_updated_at
BEFORE UPDATE ON public.oil_maintenance_actions
FOR EACH ROW
EXECUTE FUNCTION public.touch_oil_maintenance_actions_updated_at();

COMMENT ON TABLE public.oil_maintenance_actions IS 'Customer-owned maintenance action board linked to machine alerts and follow-up tasks.';
COMMENT ON TABLE public.oil_maintenance_action_logs IS 'Audit log for maintenance action lifecycle and ownership changes.';
