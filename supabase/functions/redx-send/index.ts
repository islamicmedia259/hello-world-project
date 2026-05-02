import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE = "https://openapi.redx.com.bd/v1.0.0-beta";

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

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: settings } = await service.from("site_settings").select("api_keys").limit(1).maybeSingle();
    const cfg = (settings?.api_keys as any)?.courier?.redx || {};

    if (!cfg.enabled) {
      return new Response(JSON.stringify({ ok: false, error: "RedX is disabled. Enable it in Admin → Courier API." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = cfg.api_token || "";
    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: "RedX API token missing." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const headers = { "API-ACCESS-TOKEN": `Bearer ${token}`, "Content-Type": "application/json" };
    const body = await req.json().catch(() => ({}));

    if (body?.test) {
      // Use shop info / areas list as a lightweight auth ping
      const res = await fetch(`${BASE}/areas`, { headers });
      const data = await res.json().catch(() => ({}));
      const ok = res.ok;
      return new Response(JSON.stringify({ ok, message: ok ? "RedX authenticated ✓" : undefined, error: ok ? undefined : (data?.message || `HTTP ${res.status}`) }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { order_ids } = body;
    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return new Response(JSON.stringify({ error: "order_ids required" }), { status: 400, headers: corsHeaders });
    }

    const { data: orders } = await service.from("orders").select("*").in("id", order_ids);
    if (!orders?.length) return new Response(JSON.stringify({ error: "No orders found" }), { status: 404, headers: corsHeaders });

    const results: any[] = [];
    for (const o of orders) {
      const payload = {
        customer_name: o.customer_name,
        customer_phone: o.phone,
        delivery_area: o.address,
        delivery_area_id: 1, // Admin should map; placeholder
        customer_address: o.address,
        merchant_invoice_id: o.invoice_no,
        cash_collection_amount: Number(o.total),
        parcel_weight: 500,
        instruction: o.notes || "",
        value: Number(o.total),
        is_closed_box: true,
      };
      const res = await fetch(`${BASE}/parcel`, { method: "POST", headers, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      const ok = res.ok && (data?.tracking_id || data?.consignment_id);

      await service.from("courier_shipments").insert({
        order_id: o.id,
        provider: "redx",
        consignment_id: data?.consignment_id?.toString() ?? null,
        tracking_code: data?.tracking_id ?? null,
        status: ok ? "created" : "failed",
        raw_response: data,
      });

      if (ok) await service.from("orders").update({ status: "in_courier" }).eq("id", o.id);
      results.push({ order_id: o.id, ok, response: data });
    }

    return new Response(JSON.stringify({ results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500, headers: corsHeaders });
  }
});
