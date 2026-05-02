// Generic SMS sender (Steadfast / Custom API)
// Reads config from site_settings.api_keys.sms

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing Supabase env" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));
    const { to, message, test } = body as any;

    // 🔥 Get SMS config from DB
    const { data: settings } = await supabase
      .from("site_settings")
      .select("api_keys")
      .limit(1)
      .maybeSingle();

    const cfg = (settings?.api_keys as any)?.sms;

    if (!cfg || !cfg.enabled) {
      return new Response(
        JSON.stringify({ ok: false, error: "SMS service disabled" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const phone = to || cfg.default_to;
    const smsText = test
      ? "Test SMS: আপনার SMS service ঠিকমতো কাজ করছে"
      : message || "Notification";

    let responseData: any;

    // ===========================
    // ✅ STEADFAST API
    // ===========================
    if (cfg.provider === "steadfast") {
      if (!cfg.api_key || !cfg.sender_id) {
        return new Response(
          JSON.stringify({ ok: false, error: "Missing Steadfast config" }),
          { status: 400, headers: corsHeaders }
        );
      }

      const res = await fetch("https://api.steadfast.com.bd/v2/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.api_key}`,
        },
        body: JSON.stringify({
          recipient: phone,
          sender_id: cfg.sender_id,
          message: smsText,
        }),
      });

      responseData = await res.json();

      if (!res.ok) {
        return new Response(
          JSON.stringify({ ok: false, error: responseData }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // ===========================
    // ✅ CUSTOM API (fallback)
    // ===========================
    else if (cfg.provider === "custom") {
      if (!cfg.api_url) {
        return new Response(
          JSON.stringify({ ok: false, error: "Custom API URL missing" }),
          { status: 400, headers: corsHeaders }
        );
      }

      const res = await fetch(cfg.api_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cfg.headers || {}),
        },
        body: JSON.stringify({
          to: phone,
          message: smsText,
        }),
      });

      responseData = await res.json();

      if (!res.ok) {
        return new Response(
          JSON.stringify({ ok: false, error: responseData }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    else {
      return new Response(
        JSON.stringify({ ok: false, error: "Unknown SMS provider" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ✅ Log (optional)
    try {
      await supabase.from("sms_logs").insert({
        phone,
        message: smsText,
        status: "sent",
      });
    } catch (_) {}

    return new Response(
      JSON.stringify({ ok: true, data: responseData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("send-sms error:", e);

    return new Response(
      JSON.stringify({ ok: false, error: e.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});