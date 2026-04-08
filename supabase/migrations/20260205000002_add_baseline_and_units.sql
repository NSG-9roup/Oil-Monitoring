-- =============================================
-- Add baseline values and unit handling
-- =============================================

-- Add baseline/new oil specifications to products
ALTER TABLE oil_products 
  ADD COLUMN IF NOT EXISTS baseline_viscosity_40c NUMERIC,
  ADD COLUMN IF NOT EXISTS baseline_viscosity_100c NUMERIC,
  ADD COLUMN IF NOT EXISTS baseline_tan NUMERIC DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS oil_grade VARCHAR(50); -- e.g., 'ISO VG 46', 'SAE 15W-40'

-- Add unit specification for water content (PPM vs decimal)
ALTER TABLE oil_lab_tests
  ADD COLUMN IF NOT EXISTS water_content_unit VARCHAR(10) DEFAULT 'PPM';

-- Create index for oil grade
CREATE INDEX IF NOT EXISTS idx_oil_products_grade ON oil_products(oil_grade);

-- Add comments
COMMENT ON COLUMN oil_products.baseline_viscosity_40c IS 'New oil viscosity at 40°C (cSt)';
COMMENT ON COLUMN oil_products.baseline_viscosity_100c IS 'New oil viscosity at 100°C (cSt)';
COMMENT ON COLUMN oil_products.baseline_tan IS 'New oil TAN value';
COMMENT ON COLUMN oil_products.oil_grade IS 'Oil grade specification (ISO VG, SAE, etc)';
COMMENT ON COLUMN oil_lab_tests.water_content_unit IS 'Unit: PPM or PERCENT';

-- Example: Update existing products with baseline values
-- UPDATE oil_products 
-- SET baseline_viscosity_40c = 46.0,
--     baseline_viscosity_100c = 6.8,
--     baseline_tan = 0.05,
--     oil_grade = 'ISO VG 46'
-- WHERE product_name = 'Hydraulic Oil ISO 46';
