-- =============================================
-- Add base_oil and viscosity_grade to oil_products
-- =============================================

ALTER TABLE oil_products 
ADD COLUMN IF NOT EXISTS base_oil TEXT,
ADD COLUMN IF NOT EXISTS viscosity_grade TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_oil_products_base_oil ON oil_products(base_oil);
CREATE INDEX IF NOT EXISTS idx_oil_products_viscosity_grade ON oil_products(viscosity_grade);
