import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(p: string) {
  const digits = (p || "").replace(/\D/g, "");
  // Bangladesh: keep last 11 digits if longer
  if (digits.length > 11) return digits.slice(-11);
  return digits;
}

async function checkSteadfast(cfg: any, phone: string) {
  if (!cfg?.enabled) return { provider: "steadfast", enabled: false, error: "Disabled" };
  const apiKey = (cfg.api_key || "").trim();
  const secretKey = (cfg.secret_key || "").trim();
  if (!apiKey || !secretKey) return { provider: "steadfast", enabled: true, error: "Missing credentials" };
  try {
    const res = await fetch(`https://portal.packzy.com/api/v1/fraud_check/${phone}`, {
      headers: { "Api-Key": apiKey, "Secret-Key": secretKey },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { provider: "steadfast", enabled: true, error: data?.message || `HTTP ${res.status}`, raw: data };
    const total = Number(data?.total_parcels ?? data?.total_orders ?? 0);
    const success = Number(data?.total_delivered ?? data?.success_orders ?? 0);
    const cancelled = Number(data?.total_cancelled ?? data?.cancelled_orders ?? Math.max(0, total - success));
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
    return {
      provider: "steadfast",
      enabled: true,
      ok: true,
      total,
      success,
      cancelled,
      successRate,
      raw: data,
    };
  } catch (e: any) {
    return { provider: "steadfast", enabled: true, error: e?.message || "Network error" };
  }
}

async function checkPathao(cfg: any, phone: string) {
  if (!cfg?.enabled) return { provider: "pathao", enabled: false, error: "Disabled" };
  const clientId = (cfg.client_id || "").trim();
  const clientSecret = (cfg.client_secret || "").trim();
  const username = (cfg.username || "").trim();
  const password = (cfg.password || "").trim();
  const sandbox = !!cfg.sandbox;
  const base = sandbox ? "https://courier-api-sandbox.pathao.com" : "https://api-hermes.pathao.com";
  if (!clientId || !clientSecret) return { provider: "pathao", enabled: true, error: "Missing credentials" };
  try {
    // Get token
    const tokenRes = await fetch(`${base}/aladdin/api/v1/issue-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        username,
        password,
        grant_type: "password",
      }),
    });
    const token = await tokenRes.json().catch(() => ({}));
    if (!token?.access_token) return { provider: "pathao", enabled: true, error: token?.message || "Auth failed" };

    const res = await fetch(`${base}/aladdin/api/v1/user/info`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { provider: "pathao", enabled: true, error: data?.message || `HTTP ${res.status}`, raw: data };

    const cust = data?.data?.customer || data?.data || {};
    const total = Number(cust?.total_delivery ?? cust?.total_orders ?? 0);
    const success = Number(cust?.successful_delivery ?? cust?.successful_orders ?? 0);
    const cancelled = Math.max(0, total - success);
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
    return {
      provider: "pathao",
      enabled: true,
      ok: true,
      total,
      success,
      cancelled,
      successRate,
      raw: data,
    };
  } catch (e: any) {
    return { provider: "pathao", enabled: true, error: e?.message || "Network error" };
  }
}

async function checkRedx(cfg: any, phone: string) {
  if (!cfg?.enabled) return { provider: "redx", enabled: false, error: "Disabled" };
  const token = (cfg.api_token || "").trim();
  if (!token) return { provider: "redx", enabled: true, error: "Missing token" };
  try {
    const res = await fetch(`https://openapi.redx.com.bd/v1.0.0-beta/parcel/customer/info?phoneNumber=${phone}`, {
      headers: { "API-ACCESS-TOKEN": `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { provider: "redx", enabled: true, error: data?.message || `HTTP ${res.status}`, raw: data };
    const info = data?.customer || data?.data || data;
    const total = Number(info?.totalParcels ?? info?.total_parcels ?? 0);
    const success = Number(info?.deliveredParcels ?? info?.delivered_parcels ?? 0);
    const cancelled = Number(info?.cancelledParcels ?? info?.cancelled_parcels ?? Math.max(0, total - success));
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
    return {
      provider: "redx",
      enabled: true,
      ok: true,
      total,
      success,
      cancelled,
      successRate,
      raw: data,
    };
  } catch (e: any) {
    return { provider: "redx", enabled: true, error: e?.message || "Network error" };
  }
}

async function checkCarrybee(cfg: any, phone: string) {
  if (!cfg?.enabled) return { provider: "carrybee", enabled: false, error: "Disabled" };
  const apiKey = (cfg.api_key || "").trim();
  const secretKey = (cfg.secret_key || "").trim();
  if (!apiKey || !secretKey) return { provider: "carrybee", enabled: true, error: "Missing credentials" };
  try {
    const res = await fetch(`https://app.carrybee.com.bd/api/fraud_check/${phone}`, {
      headers: { "Api-Key": apiKey, "Secret-Key": secretKey },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { provider: "carrybee", enabled: true, error: data?.message || `HTTP ${res.status}`, raw: data };
    const total = Number(data?.total_orders ?? data?.total ?? 0);
    const success = Number(data?.success_orders ?? data?.delivered ?? 0);
    const cancelled = Number(data?.cancelled_orders ?? data?.cancelled ?? Math.max(0, total - success));
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
    return {
      provider: "carrybee",
      enabled: true,
      ok: true,
      total,
      success,
      cancelled,
      successRate,
      raw: data,
    };
  } catch (e: any) {
    return { provider: "carrybee", enabled: true, error: e?.message || "Network error" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const body = await req.json().catch(() => ({}));
    const phone = normalizePhone(String(body?.phone || ""));
    if (!phone || phone.length < 10) {
      return new Response(JSON.stringify({ error: "Invalid phone number" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: settings } = await service.from("site_settings").select("api_keys").limit(1).maybeSingle();
    const courier = (settings?.api_keys as any)?.courier || {};

    const [steadfast, pathao, redx, carrybee] = await Promise.all([
      checkSteadfast(courier.steadfast, phone),
      checkPathao(courier.pathao, phone),
      checkRedx(courier.redx, phone),
      checkCarrybee(courier.carrybee, phone),
    ]);

    // Local order history from our DB
    const { data: localOrders } = await service
      .from("orders")
      .select("invoice_no, status, total, created_at")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(50);

    const providers = [steadfast, pathao, redx, carrybee];
    const totals = providers.filter((p: any) => p.ok).reduce(
      (a: any, p: any) => ({
        total: a.total + (p.total || 0),
        success: a.success + (p.success || 0),
        cancelled: a.cancelled + (p.cancelled || 0),
      }),
      { total: 0, success: 0, cancelled: 0 }
    );
    const overallRate = totals.total > 0 ? Math.round((totals.success / totals.total) * 100) : 0;

    return new Response(JSON.stringify({
      phone,
      providers,
      summary: { ...totals, successRate: overallRate },
      localOrders: localOrders || [],
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500, headers: corsHeaders });
  }
});
