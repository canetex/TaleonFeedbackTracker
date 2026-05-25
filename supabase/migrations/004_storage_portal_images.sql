-- Bucket público para prints de sugestões e comentários

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portal-images',
  'portal-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS portal_images_public_read ON storage.objects;
CREATE POLICY portal_images_public_read ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'portal-images');

DROP POLICY IF EXISTS portal_images_anon_insert ON storage.objects;
CREATE POLICY portal_images_anon_insert ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'portal-images'
    AND (storage.foldername(name))[1] IN ('suggestions', 'comments')
  );

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.comments.image_urls IS 'URLs públicas (Supabase Storage) anexadas ao comentário';
