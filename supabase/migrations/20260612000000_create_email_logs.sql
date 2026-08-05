-- Migration: Add oil_email_logs table for tracking Resend emails
CREATE TABLE IF NOT EXISTS public.oil_email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resend_id TEXT UNIQUE,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oil_email_logs_resend_id ON public.oil_email_logs(resend_id);
CREATE INDEX IF NOT EXISTS idx_oil_email_logs_status ON public.oil_email_logs(status);

ALTER TABLE public.oil_email_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.oil_email_logs TO service_role;
