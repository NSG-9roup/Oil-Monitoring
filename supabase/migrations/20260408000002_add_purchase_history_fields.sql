-- Align oil_purchase_history with the fields used by the UI and admin workflows.

ALTER TABLE oil_purchase_history
    ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_price NUMERIC(14, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';

ALTER TABLE oil_purchase_history
    DROP CONSTRAINT IF EXISTS oil_purchase_history_status_check;

ALTER TABLE oil_purchase_history
    ADD CONSTRAINT oil_purchase_history_status_check
    CHECK (status IN ('completed', 'pending', 'cancelled'));