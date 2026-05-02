// Customer Forgot Password — OTP based reset flow
// Actions:
//   { action: "request", email }                         → send 6-digit OTP to user email
//   { action: "verify", email, code }                    → verify OTP, returns reset_token
//   { action: "reset", email, reset_token, new_password }→ updates password
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) return json({ ok: false, error: "Email required" }, 400);

    // Find user by email (any user, not just admin)
    async function findUser() {
      const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      return list?.users?.find((x: any) => (x.email || "").toLowerCase() === email) || null;
    }

    if (action === "request") {
      const user = await findUser();
      // Always respond success to avoid email enumeration
      if (user) {
        const code = genCode();
        const code_hash = await sha256Hex(code);
        const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await supabase.from("user_password_otps").update({ used: true }).eq("email", email).eq("used", false);
        await supabase.from("user_password_otps").insert({ email, code_hash, expires_at });

        const html = `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9fafb">
            <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
              <h2 style="margin:0 0 8px;color:#111">পাসওয়ার্ড রিসেট</h2>
              <p style="color:#555;margin:0 0 24px">আপনার একাউন্টের পাসওয়ার্ড রিসেট করার জন্য নিচের OTP কোডটি ব্যবহার করুন।</p>
              <div style="background:#f3f4f6;border:2px dashed #f97316;border-radius:10px;padding:20px;text-align:center;margin:16px 0">
                <div style="font-size:32px;font-weight:800;letter-spacing:8px;color:#f97316;font-family:monospace">${code}</div>
              </div>
              <p style="color:#777;font-size:13px;margin-top:20px">এই কোডটি ১০ মিনিটের জন্য বৈধ। আপনি যদি এই অনুরোধ না করে থাকেন, এই ইমেইল উপেক্ষা করুন।</p>
            </div>
          </div>`;
        await supabase.functions.invoke("send-email", {
          body: { to: email, subject: "Password Reset OTP", html, text: `Your OTP: ${code} (valid 10 minutes)` },
        });
      }
      return json({ ok: true, message: "If this email is registered, an OTP has been sent." });
    }

    if (action === "verify") {
      const code = String(body.code || "").trim();
      if (!/^\d{6}$/.test(code)) return json({ ok: false, error: "Invalid code format" }, 400);

      const code_hash = await sha256Hex(code);
      const { data: rows } = await supabase
        .from("user_password_otps")
        .select("*")
        .eq("email", email)
        .eq("used", false)
        .order("created_at", { ascending: false })
        .limit(1);
      const rec = rows?.[0];
      if (!rec) return json({ ok: false, error: "OTP not found or expired" }, 400);
      if (new Date(rec.expires_at).getTime() < Date.now()) return json({ ok: false, error: "OTP expired" }, 400);
      if ((rec.attempts ?? 0) >= 5) return json({ ok: false, error: "Too many attempts" }, 429);
      if (rec.code_hash !== code_hash) {
        await supabase.from("user_password_otps").update({ attempts: (rec.attempts ?? 0) + 1 }).eq("id", rec.id);
        return json({ ok: false, error: "Incorrect OTP" }, 400);
      }

      const reset_token = crypto.randomUUID() + "-" + crypto.randomUUID();
      const reset_token_hash = await sha256Hex(reset_token);
      await supabase
        .from("user_password_otps")
        .update({ code_hash: reset_token_hash, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), attempts: 0 })
        .eq("id", rec.id);

      return json({ ok: true, reset_token });
    }

    if (action === "reset") {
      const reset_token = String(body.reset_token || "");
      const new_password = String(body.new_password || "");
      if (new_password.length < 6) return json({ ok: false, error: "Password must be at least 6 characters" }, 400);
      if (!reset_token) return json({ ok: false, error: "Missing reset token" }, 400);

      const token_hash = await sha256Hex(reset_token);
      const { data: rows } = await supabase
        .from("user_password_otps")
        .select("*")
        .eq("email", email)
        .eq("used", false)
        .order("created_at", { ascending: false })
        .limit(1);
      const rec = rows?.[0];
      if (!rec || rec.code_hash !== token_hash) return json({ ok: false, error: "Invalid or expired token" }, 400);
      if (new Date(rec.expires_at).getTime() < Date.now()) return json({ ok: false, error: "Token expired" }, 400);

      const user = await findUser();
      if (!user) return json({ ok: false, error: "User not found" }, 404);

      const { error: upErr } = await supabase.auth.admin.updateUserById(user.id, { password: new_password });
      if (upErr) return json({ ok: false, error: upErr.message }, 500);

      await supabase.from("user_password_otps").update({ used: true }).eq("id", rec.id);

      return json({ ok: true, message: "Password updated successfully" });
    }

    return json({ ok: false, error: "Unknown action" }, 400);
  } catch (e: any) {
    return json({ ok: false, error: e?.message || "Server error" }, 500);
  }
});
