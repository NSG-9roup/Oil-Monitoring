-- =============================================
-- MANUAL MIGRATION: Add Viscosity Fields
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Add viscosity at 40°C column
ALTER TABLE oil_lab_tests 
  ADD COLUMN IF NOT EXISTS viscosity_40c NUMERIC;

-- Step 2: Add viscosity at 100°C column
ALTER TABLE oil_lab_tests 
  ADD COLUMN IF NOT EXISTS viscosity_100c NUMERIC;

-- Step 3: Add column comments for clarity
COMMENT ON COLUMN oil_lab_tests.viscosity_40c IS 'Viscosity measured at 40°C (cSt)';
COMMENT ON COLUMN oil_lab_tests.viscosity_100c IS 'Viscosity measured at 100°C (cSt)';

-- Step 4: Verify the changes
SELECT 
    column_name, 
    data_type,
    col_description((table_schema||'.'||table_name)::regclass::oid, ordinal_position) as description
FROM information_schema.columns 
WHERE table_name = 'oil_lab_tests' 
  AND column_name LIKE 'viscosity%'
ORDER BY ordinal_position;

-- Expected result:
-- viscosity_40c  | numeric | Viscosity measured at 40°C (cSt)
-- viscosity_100c | numeric | Viscosity measured at 100°C (cSt)
