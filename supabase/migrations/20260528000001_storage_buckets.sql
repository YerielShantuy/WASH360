-- Storage buckets for WASH360 photo uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('handwash-evidence',    'handwash-evidence',    false, 5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('trash-submissions',    'trash-submissions',    false, 5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('water-quality-strips', 'water-quality-strips', false, 5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('flood-drain-reports',  'flood-drain-reports',  false, 5242880,  ARRAY['image/jpeg','image/png','image/webp']),
  ('event-images',         'event-images',         true,  5242880,  ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload to their own prefix
CREATE POLICY "Users upload own trash photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'trash-submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own trash photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'trash-submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Council reads all trash photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'trash-submissions'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('council', 'admin')
    )
  );

CREATE POLICY "Users upload own report photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'flood-drain-reports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own report photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'flood-drain-reports' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Council reads all report photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'flood-drain-reports'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('council', 'admin')
    )
  );

CREATE POLICY "Users upload own water quality photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'water-quality-strips' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own water quality photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'water-quality-strips' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Council reads all water quality photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'water-quality-strips'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('council', 'admin')
    )
  );

CREATE POLICY "Users upload own handwash evidence"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'handwash-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own handwash evidence"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'handwash-evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Auto-delete handwash evidence after 30 days (requires pg_cron extension in Supabase)
-- Uncomment when pg_cron is enabled:
-- SELECT cron.schedule('cleanup-handwash-evidence', '0 2 * * *',
--   $$DELETE FROM storage.objects WHERE bucket_id = 'handwash-evidence' AND created_at < now() - interval '30 days'$$);

-- Event images: public read, council/admin upload
CREATE POLICY "Public reads event images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'event-images');

CREATE POLICY "Council uploads event images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-images'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('council', 'admin')
    )
  );
