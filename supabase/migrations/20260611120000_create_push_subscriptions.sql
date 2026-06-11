CREATE TABLE IF NOT EXISTS public.oil_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for speed
CREATE INDEX IF NOT EXISTS idx_oil_push_subscriptions_user ON public.oil_push_subscriptions(user_id);

-- Enable RLS
ALTER TABLE public.oil_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oil_push_subscriptions TO authenticated;

-- Policies
DROP POLICY IF EXISTS "manage_own_push_subscriptions" ON public.oil_push_subscriptions;
CREATE POLICY "manage_own_push_subscriptions" ON public.oil_push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_all_push_subscriptions" ON public.oil_push_subscriptions;
CREATE POLICY "admin_all_push_subscriptions" ON public.oil_push_subscriptions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.oil_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
