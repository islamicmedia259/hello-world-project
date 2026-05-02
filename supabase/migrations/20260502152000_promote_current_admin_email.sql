-- Ensure the admin account currently used for setup has admin access.
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE lower(email) = lower('monayem.599535@gmail.com')
  ORDER BY created_at DESC
  LIMIT 1;

  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, email, display_name)
    SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1))
    FROM auth.users u
    WHERE u.id = target_user_id
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
