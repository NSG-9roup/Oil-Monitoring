-- Migration: Menambahkan batas toleransi Viscosity 100°C pada tabel oil_lab_tests
ALTER TABLE oil_lab_tests
ADD COLUMN IF NOT EXISTS viscosity_100c_min NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS viscosity_100c_max NUMERIC(10, 2);
