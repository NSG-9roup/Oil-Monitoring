-- 1. Tambahkan kolom avatar_url ke tabel oil_profiles
ALTER TABLE public.oil_profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Buat bucket storage user-avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true,
  3145728, -- 3MB
  '{image/jpeg,image/png,image/gif,image/webp}'
) ON CONFLICT (id) DO NOTHING;

-- 3. Kebijakan RLS storage untuk user-avatars
DROP POLICY IF EXISTS "Public Read Access for User Avatars" ON storage.objects;
CREATE POLICY "Public Read Access for User Avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-avatars');

DROP POLICY IF EXISTS "Authenticated Users Can Upload User Avatars" ON storage.objects;
CREATE POLICY "Authenticated Users Can Upload User Avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'user-avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated Users Can Update User Avatars" ON storage.objects;
CREATE POLICY "Authenticated Users Can Update User Avatars"
  ON storage.objects FOR UPDATE
  WITH CHECK (bucket_id = 'user-avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated Users Can Delete User Avatars" ON storage.objects;
CREATE POLICY "Authenticated Users Can Delete User Avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'user-avatars' AND auth.role() = 'authenticated');
