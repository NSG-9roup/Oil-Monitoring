-- Oil Condition Monitoring System - Core Schema (with oil_ prefix)
-- Migration: 20260202120001_oil_core_schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 1. OIL_CUSTOMERS TABLE
-- =============================================
CREATE TABLE oil_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oil_customers_status ON oil_customers(status);

-- =============================================
-- 2. OIL_PROFILES TABLE
-- =============================================
CREATE TABLE oil_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('customer', 'admin', 'sales')),
    customer_id UUID REFERENCES oil_customers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oil_profiles_role ON oil_profiles(role);
CREATE INDEX idx_oil_profiles_customer_id ON oil_profiles(customer_id);

-- =============================================
-- 3. OIL_PRODUCTS TABLE
-- =============================================
CREATE TABLE oil_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    product_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oil_products_name ON oil_products(product_name);

-- =============================================
-- 4. OIL_MACHINES TABLE
-- =============================================
CREATE TABLE oil_machines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES oil_customers(id) ON DELETE CASCADE,
    machine_name TEXT NOT NULL,
    location TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oil_machines_customer_id ON oil_machines(customer_id);
CREATE INDEX idx_oil_machines_status ON oil_machines(status);

-- =============================================
-- 5. OIL_MACHINE_PRODUCTS TABLE
-- =============================================
CREATE TABLE oil_machine_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES oil_machines(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES oil_products(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_oil_machine_products_machine_id ON oil_machine_products(machine_id);
CREATE INDEX idx_oil_machine_products_product_id ON oil_machine_products(product_id);
CREATE INDEX idx_oil_machine_products_dates ON oil_machine_products(start_date, end_date);

-- =============================================
-- 6. OIL_LAB_TESTS TABLE
-- =============================================
CREATE TABLE oil_lab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL REFERENCES oil_machines(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES oil_products(id) ON DELETE CASCADE,
    test_date DATE NOT NULL,
    viscosity NUMERIC(10, 2),
    water_content NUMERIC(10, 4),
    tan_value NUMERIC(10, 4),
    pdf_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_oil_lab_tests_machine_id ON oil_lab_tests(machine_id);
CREATE INDEX idx_oil_lab_tests_test_date ON oil_lab_tests(test_date DESC);
CREATE INDEX idx_oil_lab_tests_machine_date ON oil_lab_tests(machine_id, test_date DESC);

-- =============================================
-- 7. OIL_PURCHASE_HISTORY TABLE
-- =============================================
CREATE TABLE oil_purchase_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES oil_customers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES oil_products(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 2) NOT NULL,
    purchase_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oil_purchase_history_customer_id ON oil_purchase_history(customer_id);
CREATE INDEX idx_oil_purchase_history_product_id ON oil_purchase_history(product_id);
CREATE INDEX idx_oil_purchase_history_date ON oil_purchase_history(purchase_date DESC);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_oil_customers_updated_at BEFORE UPDATE ON oil_customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oil_profiles_updated_at BEFORE UPDATE ON oil_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oil_products_updated_at BEFORE UPDATE ON oil_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oil_machines_updated_at BEFORE UPDATE ON oil_machines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oil_machine_products_updated_at BEFORE UPDATE ON oil_machine_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oil_lab_tests_updated_at BEFORE UPDATE ON oil_lab_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oil_purchase_history_updated_at BEFORE UPDATE ON oil_purchase_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
