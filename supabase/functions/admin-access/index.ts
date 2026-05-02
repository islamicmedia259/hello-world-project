import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "status");

    const { count: adminCount } = await admin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    const adminExists = (adminCount ?? 0) > 0;

    if (action === "admin_exists") return json({ ok: true, adminExists });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ ok: false, error: "No auth" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ ok: false, error: "Invalid session" }, 401);

    if (action === "promote_first_admin" && !adminExists) {
      await admin.from("profiles").upsert({
        user_id: user.id,
        email: user.email,
        display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Admin",
      }, { onConflict: "user_id" });
      await admin.from("user_roles").upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
    }

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = Boolean(roleRow);

    const { data: permissionRows } = await admin
      .from("user_roles")
      .select("role_permissions(permissions(menu_key))")
      .eq("user_id", user.id);

    const menuKeys = Array.from(new Set(
      (permissionRows ?? [])
        .flatMap((row: any) => row.role_permissions ?? [])
        .map((row: any) => row.permissions?.menu_key)
        .filter(Boolean)
    ));

    return json({ ok: true, isAdmin, adminExists: adminExists || isAdmin, menuKeys });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "Server error" }, 500);
  }
});