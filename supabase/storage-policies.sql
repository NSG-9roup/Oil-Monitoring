-- Storage policies for lab-reports bucket

-- Allow authenticated users to read/download PDFs
CREATE POLICY "Allow authenticated users to download lab reports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'lab-reports');

-- Allow authenticated users to upload PDFs (for admin)
CREATE POLICY "Allow authenticated users to upload lab reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lab-reports');

-- Allow authenticated users to update PDFs (for admin)
CREATE POLICY "Allow authenticated users to update lab reports"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'lab-reports');

-- Allow authenticated users to delete PDFs (for admin)
CREATE POLICY "Allow authenticated users to delete lab reports"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lab-reports');
