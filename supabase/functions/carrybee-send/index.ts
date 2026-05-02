import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE = "https://app.carrybee.com.bd/api";

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
    const cfg = (settings?.api_keys as any)?.courier?.carrybee || {};

    if (!cfg.enabled) {
      return new Response(JSON.stringify({ ok: false, error: "CarryBee is disabled. Enable it in Admin → Courier API." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const apiKey = cfg.api_key || "";
    const secretKey = cfg.secret_key || "";
    if (!apiKey || !secretKey) {
      return new Response(JSON.stringify({ ok: false, error: "CarryBee credentials missing." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const headers = {
      "Api-Key": apiKey,
      "Secret-Key": secretKey,
      "Content-Type": "application/json",
    };
    const body = await req.json().catch(() => ({}));

    if (body?.test) {
      const res = await fetch(`${BASE}/get_balance`, { headers });
      const data = await res.json().catch(() => ({}));
      const ok = res.ok && (data?.status === 200 || data?.current_balance !== undefined || data?.success);
      return new Response(JSON.stringify({ ok, message: ok ? `CarryBee connected ✓${data?.current_balance !== undefined ? ` · Balance: ৳${data.current_balance}` : ""}` : undefined, error: ok ? undefined : (data?.message || `HTTP ${res.status}`) }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
        invoice: o.invoice_no,
        recipient_name: o.customer_name,
        recipient_phone: o.phone,
        recipient_address: o.address,
        cod_amount: Number(o.total),
        note: o.notes || "",
      };
      const res = await fetch(`${BASE}/create_order`, { method: "POST", headers, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      const ok = res.ok && (data?.status === 200 || data?.success);

      await service.from("courier_shipments").insert({
        order_id: o.id,
        provider: "carrybee",
        consignment_id: data?.consignment?.consignment_id?.toString() ?? data?.consignment_id?.toString() ?? null,
        tracking_code: data?.consignment?.tracking_code ?? data?.tracking_code ?? null,
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
