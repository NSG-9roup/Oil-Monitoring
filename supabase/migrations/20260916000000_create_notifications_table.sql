-- Migration: Create oil_notifications table
CREATE TABLE IF NOT EXISTS public.oil_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info', -- 'info', 'success', 'warning', 'critical'
    link_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oil_notifications_user_read 
ON public.oil_notifications(user_id, is_read, created_at DESC);

ALTER TABLE public.oil_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.oil_notifications;
CREATE POLICY "Users can view own notifications"
ON public.oil_notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.oil_notifications;
CREATE POLICY "Users can update own notifications"
ON public.oil_notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.oil_notifications TO service_role;
GRANT SELECT, UPDATE ON public.oil_notifications TO authenticated;

-- Enable Realtime publication for oil_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.oil_notifications;
