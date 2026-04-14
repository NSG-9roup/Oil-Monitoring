-- =============================================
-- Check oil_lab_tests table structure
-- Run this to see all columns
-- =============================================

SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'oil_lab_tests'
ORDER BY ordinal_position;
