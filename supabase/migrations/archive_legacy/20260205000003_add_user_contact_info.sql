-- Add email and phone number to user profiles
-- Migration: 20260205000003_add_user_contact_info

-- Add email and phone_number columns to oil_profiles table
ALTER TABLE oil_profiles 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Add index for email lookups (optional but good for performance)
CREATE INDEX IF NOT EXISTS idx_oil_profiles_email ON oil_profiles(email);

-- Add comments for clarity
COMMENT ON COLUMN oil_profiles.email IS 'User email address (optional)';
COMMENT ON COLUMN oil_profiles.phone_number IS 'User phone number (optional)';
