-- Menambahkan kolom yang hilang dari tabel oil_profiles
ALTER TABLE oil_profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT;
