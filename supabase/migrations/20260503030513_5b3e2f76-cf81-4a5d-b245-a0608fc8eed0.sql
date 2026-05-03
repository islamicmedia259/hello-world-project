CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_role_unique ON public.user_roles(user_id, role);

CREATE OR REPLACE FUNCTION public.assign_default_customer_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'customer')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_default_role ON public.profiles;
DROP TRIGGER IF EXISTS trg_profiles_default_role ON public.profiles;
CREATE TRIGGER trg_profiles_default_role
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_default_customer_role();

-- Backfill existing users who have no role
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 'customer'::public.app_role
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id)
ON CONFLICT (user_id, role) DO NOTHING;