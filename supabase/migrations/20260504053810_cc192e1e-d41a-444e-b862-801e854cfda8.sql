
-- Create storage buckets used by admin uploads
INSERT INTO storage.buckets (id, name, public) VALUES
  ('product-images', 'product-images', true),
  ('site-assets', 'site-assets', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for all three buckets
CREATE POLICY "Public read product-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Public read site-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-assets');

CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Admins can manage product-images and site-assets
CREATE POLICY "Admins manage product-images"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage site-assets"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Authenticated users manage their own avatar (folder = user id)
CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins manage avatars too
CREATE POLICY "Admins manage avatars"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'::public.app_role));
