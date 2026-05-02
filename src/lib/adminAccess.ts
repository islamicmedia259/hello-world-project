import { supabase } from "@/integrations/supabase/client";

type AdminAccessAction = "status" | "admin_exists" | "promote_first_admin";

export type AdminAccessStatus = {
  isAdmin: boolean;
  adminExists: boolean;
  menuKeys: string[];
};

export async function getAdminAccess(action: AdminAccessAction = "status"): Promise<AdminAccessStatus> {
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
}