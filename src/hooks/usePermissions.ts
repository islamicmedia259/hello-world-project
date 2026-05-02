import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminAccess } from "@/lib/adminAccess";
import { useAuth } from "./useAuth";

export function usePermissions() {
  const { session, isAdmin, loading: authLoading } = useAuth();
  const [menuKeys, setMenuKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!session?.user) {
      setMenuKeys(new Set());
      setLoading(false);
      return;
    }
    const status = await getAdminAccess().catch(() => null);
    const keys = new Set<string>(status?.menuKeys ?? []);
    setMenuKeys(keys);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    reload();

    if (!session?.user) return;

    // Realtime: listen to role/permission changes (unique channel per mount)
    const ch = supabase.channel(`perm-sync-${session.user.id}-${Math.random().toString(36).slice(2)}`);
    ch.on("postgres_changes", { event: "*", schema: "public", table: "role_permissions" }, () => reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles", filter: `user_id=eq.${session.user.id}` }, () => reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "permissions" }, () => reload())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, authLoading]);

  const can = (menuKey: string) => isAdmin || menuKeys.has(menuKey);
  return { menuKeys, can, loading: authLoading || loading, isAdmin };
}
