-- Add logo_url and logo_updated_at columns to oil_customers table
ALTER TABLE oil_customers 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS logo_updated_at TIMESTAMP DEFAULT NOW();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_oil_customers_logo_url ON oil_customers(logo_url);

-- Add comment for documentation
COMMENT ON COLUMN oil_customers.logo_url IS 'URL to customer company logo stored in Supabase Storage (customer-logos bucket)';
COMMENT ON COLUMN oil_customers.logo_updated_at IS 'Timestamp of last logo update';
