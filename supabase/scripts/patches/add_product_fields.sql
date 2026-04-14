-- =============================================
-- Add base_oil and viscosity_grade to oil_products
-- Run this in Supabase SQL Editor
-- =============================================

ALTER TABLE oil_products 
ADD COLUMN IF NOT EXISTS base_oil TEXT,
ADD COLUMN IF NOT EXISTS viscosity_grade TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_oil_products_base_oil ON oil_products(base_oil);
CREATE INDEX IF NOT EXISTS idx_oil_products_viscosity_grade ON oil_products(viscosity_grade);

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'oil_products' 
ORDER BY ordinal_position;
