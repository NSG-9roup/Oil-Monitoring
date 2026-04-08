-- =============================================
-- Add viscosity fields to support both 40°C and 100°C
-- Add new fields viscosity_40c and viscosity_100c
-- =============================================

-- Add column for viscosity at 40°C
ALTER TABLE oil_lab_tests 
  ADD COLUMN IF NOT EXISTS viscosity_40c NUMERIC;

-- Add column for viscosity at 100°C
ALTER TABLE oil_lab_tests 
  ADD COLUMN IF NOT EXISTS viscosity_100c NUMERIC;

-- Add comments for clarity
COMMENT ON COLUMN oil_lab_tests.viscosity_40c IS 'Viscosity measured at 40°C (cSt)';
COMMENT ON COLUMN oil_lab_tests.viscosity_100c IS 'Viscosity measured at 100°C (cSt)';
