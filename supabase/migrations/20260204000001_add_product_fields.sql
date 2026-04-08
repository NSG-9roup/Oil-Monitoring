-- =============================================
-- Add base_oil and viscosity_grade to oil_products
-- =============================================

ALTER TABLE oil_products 
ADD COLUMN base_oil TEXT,
ADD COLUMN viscosity_grade TEXT;

-- Create index for faster queries
CREATE INDEX idx_oil_products_base_oil ON oil_products(base_oil);
CREATE INDEX idx_oil_products_viscosity_grade ON oil_products(viscosity_grade);
