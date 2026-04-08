-- Oil Condition Monitoring System - Seed Data (with oil_ prefix)
-- Migration: 20260202120003_oil_seed_data

-- =============================================
-- 1. INSERT CUSTOMERS
-- =============================================
INSERT INTO oil_customers (id, company_name, status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Apex Manufacturing Inc.', 'active'),
    ('22222222-2222-2222-2222-222222222222', 'Precision Industries Ltd.', 'active');

-- =============================================
-- 2. INSERT PRODUCTS
-- =============================================
INSERT INTO oil_products (id, product_name, product_type) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mobilgear 600 XP 220', 'Industrial Gear Oil'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Shell Omala S4 WE 320', 'Synthetic Gear Oil'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Castrol Hyspin AWH-M 68', 'Hydraulic Oil'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Mobil DTE 25', 'Turbine Oil');

-- =============================================
-- 3. INSERT MACHINES
-- =============================================
INSERT INTO oil_machines (id, customer_id, machine_name, location, status) VALUES
    ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Hydraulic Press HP-2000', 'Building A - Floor 2', 'active'),
    ('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'CNC Mill CM-5000', 'Building B - Floor 1', 'active'),
    ('b1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Turbine Generator TG-800', 'Power Plant - Unit 3', 'active'),
    ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Gearbox Assembly GB-300', 'Assembly Line 1', 'active');

-- =============================================
-- 4. INSERT MACHINE-PRODUCT RELATIONSHIPS
-- =============================================
INSERT INTO oil_machine_products (machine_id, product_id, start_date, end_date) VALUES
    ('a1111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2024-01-15', NULL),
    ('a2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2024-01-20', '2024-09-30'),
    ('a2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2024-10-01', NULL),
    ('b1111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '2024-02-01', NULL),
    ('b2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2024-01-25', NULL);

-- =============================================
-- 5. INSERT LAB TESTS
-- =============================================
INSERT INTO oil_lab_tests (machine_id, product_id, test_date, viscosity, water_content, tan_value) VALUES
    -- Apex - Hydraulic Press
    ('a1111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2025-10-15', 68.2, 0.0150, 0.85),
    ('a1111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2025-11-12', 68.5, 0.0180, 0.92),
    ('a1111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2025-12-10', 68.9, 0.0220, 1.05),
    ('a1111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-01-08', 69.4, 0.0280, 1.18),
    ('a1111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '2026-02-01', 70.1, 0.0350, 1.35),
    
    -- Apex - CNC Mill
    ('a2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2025-08-20', 218.5, 0.0120, 0.75),
    ('a2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2025-09-18', 219.2, 0.0145, 0.82),
    ('a2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2025-11-15', 315.8, 0.0080, 0.45),
    ('a2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2025-12-20', 316.2, 0.0085, 0.48),
    ('a2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2026-01-25', 316.5, 0.0090, 0.50),
    
    -- Precision - Turbine
    ('b1111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '2025-09-05', 25.1, 0.0050, 0.35),
    ('b1111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '2025-10-10', 25.2, 0.0055, 0.37),
    ('b1111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '2025-11-15', 25.3, 0.0058, 0.38),
    ('b1111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '2025-12-20', 25.4, 0.0060, 0.40),
    ('b1111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '2026-01-28', 25.5, 0.0062, 0.41),
    
    -- Precision - Gearbox
    ('b2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2025-09-10', 222.5, 0.0200, 1.25),
    ('b2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2025-10-15', 221.8, 0.0180, 1.15),
    ('b2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2025-11-20', 221.2, 0.0160, 1.05),
    ('b2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2025-12-25', 220.5, 0.0140, 0.95),
    ('b2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2026-01-30', 220.0, 0.0125, 0.85);

-- =============================================
-- 6. INSERT PURCHASE HISTORY
-- =============================================
INSERT INTO oil_purchase_history (customer_id, product_id, quantity, purchase_date) VALUES
    ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 208.0, '2025-07-15'),
    ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 208.0, '2025-12-20'),
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 416.0, '2025-06-10'),
    ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 208.0, '2025-09-25'),
    ('22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 1040.0, '2025-08-01'),
    ('22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 520.0, '2026-01-15'),
    ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 624.0, '2025-07-20'),
    ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 416.0, '2025-12-05');
