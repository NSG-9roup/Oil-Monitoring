-- Migration: Add user audit logs table and policy
CREATE TABLE IF NOT EXISTS public.oil_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.oil_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.oil_audit_logs ENABLE ROW LEVEL SECURITY;

-- Select policy: Only admins can view audit logs
DROP POLICY IF EXISTS "admin_select_audit_logs" ON public.oil_audit_logs;
CREATE POLICY "admin_select_audit_logs"
  ON public.oil_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.oil_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert policy: Authenticated users can insert logs (so Server Actions and API routes can write under the user session or service role)
DROP POLICY IF EXISTS "authenticated_insert_audit_logs" ON public.oil_audit_logs;
CREATE POLICY "authenticated_insert_audit_logs"
  ON public.oil_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
