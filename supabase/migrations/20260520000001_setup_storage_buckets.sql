-- Buat bucket untuk customer logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'customer-logos',
  'customer-logos',
  true,
  2097152, -- 2MB
  '{image/jpeg,image/png,image/gif,image/webp}'
) ON CONFLICT (id) DO NOTHING;

-- Buat bucket untuk lab reports PDF
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lab-reports',
  'lab-reports',
  true,
  10485760, -- 10MB
  '{application/pdf}'
) ON CONFLICT (id) DO NOTHING;

-- Kebijakan akses untuk customer-logos (Public Read, Authenticated Upload)
CREATE POLICY "Public Read Access for Customer Logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'customer-logos');

CREATE POLICY "Authenticated Users Can Upload Customer Logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'customer-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Users Can Update Customer Logos"
  ON storage.objects FOR UPDATE
  WITH CHECK (bucket_id = 'customer-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Users Can Delete Customer Logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'customer-logos' AND auth.role() = 'authenticated');

-- Kebijakan akses untuk lab-reports (Public Read, Authenticated Upload)
CREATE POLICY "Public Read Access for Lab Reports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lab-reports');

CREATE POLICY "Authenticated Users Can Upload Lab Reports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lab-reports' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Users Can Update Lab Reports"
  ON storage.objects FOR UPDATE
  WITH CHECK (bucket_id = 'lab-reports' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated Users Can Delete Lab Reports"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'lab-reports' AND auth.role() = 'authenticated');
