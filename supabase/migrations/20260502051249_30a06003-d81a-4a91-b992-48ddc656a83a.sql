
CREATE OR REPLACE FUNCTION public.promote_first_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only works if no admin exists yet
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN false;
  END IF;
  
  -- Caller must be authenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Ensure profile exists
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    split_part((SELECT email FROM auth.users WHERE id = auth.uid()), '@', 1)
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN true;
END;
$$;
