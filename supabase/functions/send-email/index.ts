// Generic Email Gateway sender — Gmail or Custom SMTP
// Reads config from site_settings.api_keys.email
// Body: { test?: boolean, to?: string, subject?: string, html?: string, text?: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import nodemailer from "npm:nodemailer@6.9.14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));
    const { test, to, subject, html, text } = body as any;

    const { data: settings } = await supabase
      .from("site_settings")
      .select("api_keys")
      .limit(1)
      .maybeSingle();

    const cfg = (settings?.api_keys as any)?.email;
    if (!cfg || !cfg.enabled) {
      return new Response(JSON.stringify({ ok: false, error: "Email service is disabled" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let transporter: any;
    let fromAddr = "";
    let fromName = cfg.sender_name || "";

    if (cfg.provider === "gmail") {
      if (!cfg.email || !cfg.app_password) {
        return new Response(JSON.stringify({ ok: false, error: "Gmail email & app password required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: { user: cfg.email, pass: cfg.app_password.replace(/\s+/g, "") },
      });
      fromAddr = cfg.email;
      if (!fromName) fromName = cfg.email;
    } else {
      // custom SMTP
      if (!cfg.smtp_host || !cfg.smtp_port || !cfg.username || !cfg.password) {
        return new Response(JSON.stringify({ ok: false, error: "SMTP credentials incomplete" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const port = Number(cfg.smtp_port);
      transporter = nodemailer.createTransport({
        host: cfg.smtp_host,
        port,
        secure: cfg.encryption === "ssl" || port === 465,
        auth: { user: cfg.username, pass: cfg.password },
      });
      fromAddr = cfg.username;
      if (!fromName) fromName = cfg.username;
    }

    const recipient = to || cfg.email || cfg.username;
    const mailSubject = test ? "Test Email — Email Service Working" : (subject || "Notification");
    const mailHtml = test
      ? `<div style="font-family:Arial,sans-serif;padding:20px"><h2 style="color:#7c3aed">✓ Email Service Working</h2><p>আপনার Email Service সফলভাবে কাজ করছে।</p><p style="color:#666;font-size:12px">Provider: ${cfg.provider}</p></div>`
      : (html || text || "");
    const mailText = test ? "আপনার Email Service সফলভাবে কাজ করছে" : (text || "");

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddr}>`,
      to: recipient,
      subject: mailSubject,
      text: mailText,
      html: mailHtml,
    });

    // best-effort log
    try {
      await supabase.from("email_logs").insert({
        recipient, subject: mailSubject, status: "sent", message_id: info.messageId,
      });
    } catch (_) { /* table optional */ }

    return new Response(JSON.stringify({ ok: true, messageId: info.messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e: any) {
    console.error("send-email error", e);
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
