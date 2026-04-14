-- =============================================
-- Check lab tests and their product data
-- Run this in Supabase SQL Editor to debug
-- =============================================

-- Check if lab tests have product_id
SELECT 
    id,
    machine_id,
    product_id,
    test_date,
    (SELECT product_name FROM oil_products WHERE id = oil_lab_tests.product_id) as product_name
FROM oil_lab_tests
ORDER BY test_date DESC
LIMIT 10;

-- Check if there are any NULL product_id
SELECT COUNT(*) as tests_with_null_product
FROM oil_lab_tests
WHERE product_id IS NULL;

-- Check all products
SELECT id, product_name, product_type 
FROM oil_products
ORDER BY product_name;
