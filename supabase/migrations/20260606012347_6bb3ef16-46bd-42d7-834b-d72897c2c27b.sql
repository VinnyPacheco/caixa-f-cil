
-- 1) Lock down SECURITY DEFINER functions: revoke direct API execution.
--    They remain callable from triggers (which run as table owner).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_system_category_modification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_default_categories() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_single_primary_account() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_default_account() FROM PUBLIC, anon, authenticated;

-- Make sure search_path is pinned on functions that didn't set it explicitly.
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.prevent_system_category_modification() SET search_path = public;
ALTER FUNCTION public.create_default_categories() SET search_path = public;
ALTER FUNCTION public.ensure_single_primary_account() SET search_path = public;
ALTER FUNCTION public.create_default_account() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 2) Avatars bucket: remove broad SELECT (listing) policy.
--    Bucket stays public, so getPublicUrl() still serves files directly.
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;

-- 3) Replace fragile filename-prefix ownership checks with folder-based checks.
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
