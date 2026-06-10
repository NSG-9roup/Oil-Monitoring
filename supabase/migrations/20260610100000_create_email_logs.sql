CREATE TABLE IF NOT EXISTS public.oil_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'bounced', 'failed')),
  resend_id VARCHAR(100) UNIQUE,
  error_details TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oil_email_logs_status ON public.oil_email_logs(status);
CREATE INDEX IF NOT EXISTS idx_oil_email_logs_recipient ON public.oil_email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_oil_email_logs_resend_id ON public.oil_email_logs(resend_id);

ALTER TABLE public.oil_email_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.oil_email_logs TO authenticated;

DROP POLICY IF EXISTS "admin_select_email_logs" ON public.oil_email_logs;
CREATE POLICY "admin_select_email_logs"
  ON public.oil_email_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.oil_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
