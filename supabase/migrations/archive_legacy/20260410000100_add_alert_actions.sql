-- Persisted alert actions for admin/customer workflows
-- Stores reviewed/email_sent/customer_read actions by alert key

CREATE TABLE IF NOT EXISTS public.oil_alert_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_key TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('reviewed', 'email_sent', 'customer_read')),
  actor_id UUID REFERENCES public.oil_profiles(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.oil_customers(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES public.oil_machines(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_oil_alert_actions_unique_key_type
  ON public.oil_alert_actions(alert_key, action_type);

CREATE INDEX IF NOT EXISTS idx_oil_alert_actions_alert_key
  ON public.oil_alert_actions(alert_key);

CREATE INDEX IF NOT EXISTS idx_oil_alert_actions_actor_id
  ON public.oil_alert_actions(actor_id);

ALTER TABLE public.oil_alert_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_sales_manage_alert_actions" ON public.oil_alert_actions;
CREATE POLICY "admin_sales_manage_alert_actions"
ON public.oil_alert_actions
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.oil_profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'sales')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.oil_profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'sales')
  )
);

DROP POLICY IF EXISTS "customer_read_own_alert_actions" ON public.oil_alert_actions;
CREATE POLICY "customer_read_own_alert_actions"
ON public.oil_alert_actions
FOR SELECT
USING (
  action_type = 'customer_read'
  AND actor_id = auth.uid()
);

DROP POLICY IF EXISTS "customer_insert_own_read_actions" ON public.oil_alert_actions;
CREATE POLICY "customer_insert_own_read_actions"
ON public.oil_alert_actions
FOR INSERT
WITH CHECK (
  action_type = 'customer_read'
  AND actor_id = auth.uid()
);

COMMENT ON TABLE public.oil_alert_actions IS 'Persistent actions for dashboard alerts: reviewed, email sent, customer read.';
