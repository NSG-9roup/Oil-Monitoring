-- Oil Condition Monitoring System - RLS Policies (with oil_ prefix)
-- Migration: 20260202120002_oil_rls_policies

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE oil_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE oil_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE oil_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE oil_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE oil_machine_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE oil_lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE oil_purchase_history ENABLE ROW LEVEL SECURITY;

-- =============================================
-- OIL_CUSTOMERS POLICIES
-- =============================================
CREATE POLICY "oil_customers_select_own" ON oil_customers
    FOR SELECT TO authenticated
    USING (
        id IN (SELECT customer_id FROM oil_profiles WHERE id = auth.uid())
    );

CREATE POLICY "oil_customers_select_admin" ON oil_customers
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role IN ('admin', 'sales'))
    );

CREATE POLICY "oil_customers_all_admin" ON oil_customers
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- OIL_PROFILES POLICIES
-- =============================================
CREATE POLICY "oil_profiles_select_own" ON oil_profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());

CREATE POLICY "oil_profiles_select_admin" ON oil_profiles
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "oil_profiles_all_admin" ON oil_profiles
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- OIL_PRODUCTS POLICIES
-- =============================================
CREATE POLICY "oil_products_select_all" ON oil_products
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "oil_products_all_admin" ON oil_products
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- OIL_MACHINES POLICIES
-- =============================================
CREATE POLICY "oil_machines_select_customer" ON oil_machines
    FOR SELECT TO authenticated
    USING (
        customer_id IN (SELECT customer_id FROM oil_profiles WHERE id = auth.uid())
    );

CREATE POLICY "oil_machines_select_admin" ON oil_machines
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role IN ('admin', 'sales'))
    );

CREATE POLICY "oil_machines_all_admin" ON oil_machines
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- OIL_MACHINE_PRODUCTS POLICIES
-- =============================================
CREATE POLICY "oil_machine_products_select_customer" ON oil_machine_products
    FOR SELECT TO authenticated
    USING (
        machine_id IN (
            SELECT m.id FROM oil_machines m
            INNER JOIN oil_profiles p ON m.customer_id = p.customer_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "oil_machine_products_select_admin" ON oil_machine_products
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role IN ('admin', 'sales'))
    );

CREATE POLICY "oil_machine_products_all_admin" ON oil_machine_products
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- OIL_LAB_TESTS POLICIES
-- =============================================
CREATE POLICY "oil_lab_tests_select_customer" ON oil_lab_tests
    FOR SELECT TO authenticated
    USING (
        machine_id IN (
            SELECT m.id FROM oil_machines m
            INNER JOIN oil_profiles p ON m.customer_id = p.customer_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "oil_lab_tests_select_admin" ON oil_lab_tests
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role IN ('admin', 'sales'))
    );

CREATE POLICY "oil_lab_tests_all_admin" ON oil_lab_tests
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- =============================================
-- OIL_PURCHASE_HISTORY POLICIES
-- =============================================
CREATE POLICY "oil_purchase_history_select_customer" ON oil_purchase_history
    FOR SELECT TO authenticated
    USING (
        customer_id IN (SELECT customer_id FROM oil_profiles WHERE id = auth.uid())
    );

CREATE POLICY "oil_purchase_history_select_admin" ON oil_purchase_history
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role IN ('admin', 'sales'))
    );

CREATE POLICY "oil_purchase_history_all_admin" ON oil_purchase_history
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM oil_profiles WHERE id = auth.uid() AND role = 'admin')
    );
