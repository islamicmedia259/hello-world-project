import { supabase } from "@/integrations/supabase/client";

type AdminAccessAction = "status" | "admin_exists" | "promote_first_admin";

export type AdminAccessStatus = {
  isAdmin: boolean;
  adminExists: boolean;
  menuKeys: string[];
};

async function getAdminAccessFallback(action: AdminAccessAction): Promise<AdminAccessStatus> {
  const { data: { user } } = await supabase.auth.getUser();

  if (action === "admin_exists") {
    try {
      const { data } = await (supabase.rpc as any)("admin_exists");
      return { isAdmin: false, adminExists: data === true, menuKeys: [] };
    } catch (_error) {
      return { isAdmin: false, adminExists: false, menuKeys: [] };
    }
  }

  if (!user) return { isAdmin: false, adminExists: false, menuKeys: [] };

  if (action === "promote_first_admin") {
    const { data } = await (supabase.rpc as any)("promote_first_admin");
    if (data !== true) throw new Error("Admin promotion failed");
  }

  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (error) throw error;

  const roleNames = (roles ?? []).map((row) => row.role).filter(Boolean);
  const isAdmin = roleNames.includes("admin");

  return { isAdmin, adminExists: isAdmin, menuKeys: [] };
}

export async function getAdminAccess(action: AdminAccessAction = "status"): Promise<AdminAccessStatus> {
  try {
    const { data, error } = await supabase.functions.invoke("admin-access", {
      body: { action },
    });

    if (error || !data?.ok) {
      throw new Error(data?.error || error?.message || "Admin access check failed");
    }

    return {
      isAdmin: data.isAdmin === true,
      adminExists: data.adminExists === true,
      menuKeys: Array.isArray(data.menuKeys) ? data.menuKeys.filter(Boolean) : [],
    };
  } catch (_error) {
    return getAdminAccessFallback(action);
  }
}