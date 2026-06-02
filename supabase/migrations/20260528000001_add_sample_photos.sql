-- =============================================
-- Migration: Add sample photos tracking
-- =============================================

-- 1. Add sample_photo_path to oil_lab_requests
ALTER TABLE public.oil_lab_requests
  ADD COLUMN IF NOT EXISTS sample_photo_path TEXT;

-- 2. Create bucket for sample photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sample-photos',
  'sample-photos',
  true,
  5242880, -- 5MB
  '{image/jpeg,image/png,image/webp}'
) ON CONFLICT (id) DO NOTHING;

-- 3. Access Policies for sample-photos (Public Read, Authenticated Management)
DROP POLICY IF EXISTS "Public Read Access for Sample Photos" ON storage.objects;
CREATE POLICY "Public Read Access for Sample Photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sample-photos');

DROP POLICY IF EXISTS "Authenticated Users Can Upload Sample Photos" ON storage.objects;
CREATE POLICY "Authenticated Users Can Upload Sample Photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'sample-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated Users Can Update Sample Photos" ON storage.objects;
CREATE POLICY "Authenticated Users Can Update Sample Photos"
  ON storage.objects FOR UPDATE
  WITH CHECK (bucket_id = 'sample-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated Users Can Delete Sample Photos" ON storage.objects;
CREATE POLICY "Authenticated Users Can Delete Sample Photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'sample-photos' AND auth.role() = 'authenticated');
