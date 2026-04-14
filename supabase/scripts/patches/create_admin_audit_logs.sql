-- Create Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS oil_admin_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  admin_email TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
  resource_type TEXT NOT NULL, -- 'CUSTOMER', 'MACHINE', 'PRODUCT', 'LAB_TEST', 'USER'
  resource_id TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index for faster queries on admin dashboard logs
CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx ON oil_admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_logs_admin_id_idx ON oil_admin_audit_logs (admin_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_resource_type_idx ON oil_admin_audit_logs (resource_type);

-- Enable RLS
ALTER TABLE oil_admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow only admins to read and write
CREATE POLICY "Admins can insert audit logs" ON oil_admin_audit_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM oil_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view audit logs" ON oil_admin_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM oil_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
