import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const cfg = (settings?.api_keys as any)?.courier?.steadfast || {};

    if (!cfg.enabled) {
      return new Response(JSON.stringify({ ok: false, error: "Steadfast is disabled. Enable it in Admin → Courier API." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const base = "https://portal.packzy.com/api/v1";
    const apiKey = (cfg.api_key || Deno.env.get("STEADFAST_API_KEY") || "").trim();
    const secretKey = (cfg.secret_key || Deno.env.get("STEADFAST_SECRET_KEY") || "").trim();
    if (!apiKey || !secretKey) {
      return new Response(JSON.stringify({ ok: false, error: "Steadfast credentials missing. Fill them in Admin → Courier API." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));

    if (body?.test) {
      // Steadfast doesn't have a dedicated auth endpoint; ping balance endpoint
      const res = await fetch(`${base}/get_balance`, {
        headers: { "Api-Key": apiKey, "Secret-Key": secretKey },
      });
      const data = await res.json().catch(() => ({}));
      const ok = res.ok && (data?.status === 200 || data?.current_balance !== undefined);
      return new Response(JSON.stringify({ ok, message: ok ? `Steadfast connected. Balance: ৳${data?.current_balance ?? "?"}` : undefined, error: ok ? undefined : (data?.message || `HTTP ${res.status}`) }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { order_ids } = body;
    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return new Response(JSON.stringify({ error: "order_ids required" }), { status: 400, headers: corsHeaders });
    }

    const { data: orders } = await service.from("orders").select("*").in("id", order_ids);
    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ error: "No orders found" }), { status: 404, headers: corsHeaders });
    }

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
      const res = await fetch(`${base}/create_order`, {
        method: "POST",
        headers: {
          "Api-Key": apiKey,
          "Secret-Key": secretKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const ok = res.ok && data?.status === 200;

      await service.from("courier_shipments").insert({
        order_id: o.id,
        provider: "steadfast",
        consignment_id: data?.consignment?.consignment_id?.toString() ?? null,
        tracking_code: data?.consignment?.tracking_code ?? null,
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
