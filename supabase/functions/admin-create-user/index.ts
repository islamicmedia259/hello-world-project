import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ROLES = new Set(["admin", "moderator", "staff", "customer"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No auth" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return json({ error: "Invalid session" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Forbidden: admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const { email, password, display_name, role } = body as {
      email?: string; password?: string; display_name?: string; role?: string;
    };
    if (!email || !password) return json({ error: "Email and password required" }, 400);
    if (password.length < 6) return json({ error: "Password must be at least 6 characters" }, 400);
    const finalRole = (role && ALLOWED_ROLES.has(role)) ? role : "staff";

    // Create the user (auto-confirm so they can log in immediately)
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: display_name ?? null },
    });
    if (cErr || !created.user) return json({ error: cErr?.message ?? "Failed to create user" }, 400);

    // Ensure profile exists
    await admin.from("profiles").upsert(
      { user_id: created.user.id, email, display_name: display_name ?? null, is_active: true },
      { onConflict: "user_id" }
    );

    // Set the role: clear any default + insert the requested role
    await admin.from("user_roles").delete().eq("user_id", created.user.id);
    const { error: rErr } = await admin.from("user_roles").insert({ user_id: created.user.id, role: finalRole });
    if (rErr) return json({ error: rErr.message }, 400);

    return json({ success: true, user_id: created.user.id });
  } catch (e: any) {
    return json({ error: e?.message ?? "Server error" }, 500);
  }
});