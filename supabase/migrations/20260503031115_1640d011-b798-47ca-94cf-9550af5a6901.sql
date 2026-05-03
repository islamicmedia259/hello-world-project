CREATE OR REPLACE FUNCTION public.guard_user_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  is_admin boolean;
BEGIN
  -- Service role / internal callers (no JWT) bypass this guard
  IF caller IS NULL THEN
    RETURN NEW;
  END IF;

  is_admin := public.has_role(caller, 'admin'::public.app_role);

  -- Only admins may assign elevated roles
  IF NEW.role IN ('admin'::public.app_role, 'moderator'::public.app_role, 'staff'::public.app_role)
     AND NOT is_admin THEN
    RAISE EXCEPTION 'Only an admin can assign role %', NEW.role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_user_role_changes ON public.user_roles;
DROP TRIGGER IF EXISTS trg_guard_user_role_changes ON public.user_roles;
CREATE TRIGGER trg_guard_user_role_changes
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.guard_user_role_changes();