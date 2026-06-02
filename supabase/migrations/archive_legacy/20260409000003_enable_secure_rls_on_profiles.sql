-- Re-enable and harden RLS on oil_profiles.
-- This migration restores RLS and applies explicit least-privilege policies.

ALTER TABLE oil_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "oil_profiles_select_own" ON oil_profiles;
DROP POLICY IF EXISTS "oil_profiles_select_admin" ON oil_profiles;
DROP POLICY IF EXISTS "oil_profiles_all_admin" ON oil_profiles;
DROP POLICY IF EXISTS "oil_profiles_select_all_authenticated" ON oil_profiles;
DROP POLICY IF EXISTS "oil_profiles_all_authenticated" ON oil_profiles;
DROP POLICY IF EXISTS "oil_profiles_select_secure" ON oil_profiles;
DROP POLICY IF EXISTS "oil_profiles_insert_secure" ON oil_profiles;
DROP POLICY IF EXISTS "oil_profiles_update_secure" ON oil_profiles;
DROP POLICY IF EXISTS "oil_profiles_delete_secure" ON oil_profiles;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.oil_profiles
  WHERE id = auth.uid()
  LIMIT 1;

  RETURN user_role;
END;
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

CREATE POLICY "oil_profiles_select_secure"
ON oil_profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.current_user_role() IN ('admin', 'sales')
);

CREATE POLICY "oil_profiles_insert_secure"
ON oil_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_user_role() IN ('admin', 'sales')
);

CREATE POLICY "oil_profiles_update_secure"
ON oil_profiles
FOR UPDATE
TO authenticated
USING (
  public.current_user_role() IN ('admin', 'sales')
)
WITH CHECK (
  public.current_user_role() IN ('admin', 'sales')
);

CREATE POLICY "oil_profiles_delete_secure"
ON oil_profiles
FOR DELETE
TO authenticated
USING (
  public.current_user_role() = 'admin'
);
