-- =============================================
-- Check PDF paths in lab tests
-- Run this to see what's stored in pdf_path
-- =============================================

SELECT 
    id,
    test_date,
    pdf_path,
    LENGTH(pdf_path) as path_length,
    SUBSTRING(pdf_path, 1, 50) as first_50_chars
FROM oil_lab_tests
WHERE pdf_path IS NOT NULL
ORDER BY test_date DESC
LIMIT 10;
