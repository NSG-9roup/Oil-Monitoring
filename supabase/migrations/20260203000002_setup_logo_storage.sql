-- Create customer-logos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-logos',
  'customer-logos',
  true, -- Public bucket untuk display di dashboard
  5242880, -- 5MB max file size
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for customer-logos bucket
-- Allow authenticated users to view logos
CREATE POLICY "Allow public read access to customer logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'customer-logos');

-- Only admins can upload/update logos
CREATE POLICY "Allow admin to upload customer logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'customer-logos' 
  AND auth.uid() IN (
    SELECT user_id FROM oil_users WHERE role = 'admin'
  )
);

-- Only admins can update logos
CREATE POLICY "Allow admin to update customer logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'customer-logos'
  AND auth.uid() IN (
    SELECT user_id FROM oil_users WHERE role = 'admin'
  )
);

-- Only admins can delete logos
CREATE POLICY "Allow admin to delete customer logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'customer-logos'
  AND auth.uid() IN (
    SELECT user_id FROM oil_users WHERE role = 'admin'
  )
);
