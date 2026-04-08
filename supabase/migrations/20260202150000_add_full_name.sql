-- Add full_name column to oil_profiles
ALTER TABLE oil_profiles 
ADD COLUMN full_name TEXT;

-- Update existing profiles with default names based on role
UPDATE oil_profiles
SET full_name = CASE 
  WHEN role = 'admin' THEN 'System Administrator'
  WHEN role = 'sales' THEN 'Sales Representative'
  ELSE 'User'
END
WHERE full_name IS NULL;
