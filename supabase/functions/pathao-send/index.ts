import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ✅ Safe JSON parse
async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return { error: "Invalid JSON response" };
  }
}

// ✅ Get Pathao token
async function getPathaoToken(
  base: string,
  creds: {
    client_id: string;
    client_secret: string;
    username: string;
    password: string;
  }
) {
  const res = await fetch(`${base}/aladdin/api/v1/issue-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...creds, grant_type: "password" }),
  });

  const data = await safeJson(res);

  if (!res.ok) {
    throw new Error(`Pathao auth failed: ${JSON.stringify(data)}`);
  }

  return data.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ✅ Use ONLY service role (secure)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));

    // 🔥 Load config from DB
    const { data: settings } = await supabase
      .from("site_settings")
      .select("api_keys")
      .limit(1)
      .maybeSingle();

    const cfg = (settings?.api_keys as any)?.courier?.pathao || {};

    if (!cfg.enabled) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Pathao disabled (enable from admin)",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ✅ Mode
    const mode = (cfg.mode || "live").toLowerCase();

    const base =
      mode === "sandbox"
        ? "https://courier-api-sandbox.pathao.com"
        : "https://api-hermes.pathao.com";

    // ✅ Credentials
    const creds = {
      client_id: cfg.client_id || Deno.env.get("PATHAO_CLIENT_ID") || "",
      client_secret:
        cfg.client_secret || Deno.env.get("PATHAO_CLIENT_SECRET") || "",
      username: cfg.username || Deno.env.get("PATHAO_USERNAME") || "",
      password: cfg.password || Deno.env.get("PATHAO_PASSWORD") || "",
    };

    if (
      !creds.client_id ||
      !creds.client_secret ||
      !creds.username ||
      !creds.password
    ) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Missing Pathao credentials",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ✅ TEST MODE
    if (body?.test) {
      try {
        await getPathaoToken(base, creds);
        return new Response(
          JSON.stringify({
            ok: true,
            message: `Pathao ${mode} connected`,
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: e instanceof Error ? e.message : String(e),
          }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    // ✅ Input validation
    const { order_ids, store_id, recipient_city, recipient_zone, recipient_area } = body;

    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "order_ids required" }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    const finalStoreId = store_id || cfg.store_id;
    const finalCity = Number(recipient_city || cfg.city_id || 1);
    const finalZone = Number(recipient_zone || cfg.zone_id || 1);
    const finalArea = recipient_area || cfg.area_id;

    if (!finalStoreId) {
      return new Response(
        JSON.stringify({ error: "store_id required" }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // ✅ Get token
    const token = await getPathaoToken(base, creds);

    // ✅ Get orders
    const { data: orders } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .in("id", order_ids);

    if (!orders?.length) {
      return new Response(
        JSON.stringify({ error: "No orders found" }),
        {
          status: 404,
          headers: corsHeaders,
        }
      );
    }

    const results: any[] = [];

    for (const o of orders as any[]) {
      const itemCount =
        (o.order_items || []).reduce(
          (s: number, i: any) => s + i.quantity,
          0
        ) || 1;

      const payload: any = {
        store_id: finalStoreId,
        merchant_order_id: o.invoice_no,
        recipient_name: o.customer_name,
        recipient_phone: o.phone,
        recipient_address: o.address,
        recipient_city: finalCity,
        recipient_zone: finalZone,
        delivery_type: 48,
        item_type: 2,
        item_quantity: itemCount,
        item_weight: 0.5,
        amount_to_collect: Number(o.total || 0),
        item_description: `Order ${o.invoice_no}`,
        special_instruction: o.notes || "",
      };

      if (finalArea) payload.recipient_area = finalArea;

      const res = await fetch(`${base}/aladdin/api/v1/orders`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await safeJson(res);
      const ok = res.ok && (data?.code === 200 || data?.code === 201);

      // ✅ Save shipment
      await supabase.from("courier_shipments").insert({
        order_id: o.id,
        provider: "pathao",
        consignment_id: data?.data?.consignment_id ?? null,
        tracking_code: data?.data?.consignment_id ?? null,
        status: ok ? "created" : "failed",
        raw_response: data,
      });

      // ✅ Update order
      if (ok) {
        await supabase
          .from("orders")
          .update({ status: "in_courier" })
          .eq("id", o.id);
      }

      results.push({
        order_id: o.id,
        ok,
        response: data,
      });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});