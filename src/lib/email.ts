import { supabase } from "@/integrations/supabase/client";

type SendArgs = { to?: string | null; subject: string; html?: string; text?: string };

let cachedSettings: any | null = null;
async function getSettings() {
  if (cachedSettings) return cachedSettings;
  const { data } = await supabase
    .from("site_settings")
    .select("site_name, logo_url, dark_logo_url, white_logo_url, contact_email, contact_phone, address, footer_text, api_keys")
    .limit(1)
    .maybeSingle();
  cachedSettings = data || {};
  return cachedSettings;
}

/** Fire-and-forget email send. Silently no-ops if no recipient. */
export async function sendAppEmail({ to, subject, html, text }: SendArgs) {
  if (!to || !/^\S+@\S+\.\S+$/.test(to)) return;
  try {
    await supabase.functions.invoke("send-email", { body: { to, subject, html, text } });
  } catch (e) {
    console.warn("sendAppEmail failed", e);
  }
}

/** Fire-and-forget SMS send. Silently no-ops if no phone. */
export async function sendAppSms(to: string | null | undefined, message: string) {
  if (!to) return;
  try {
    await supabase.functions.invoke("send-sms", { body: { to, message } });
  } catch (e) {
    console.warn("sendAppSms failed", e);
  }
}

// ───────────────────── Email Template ─────────────────────
type TplOpts = {
  bannerTitle: string;
  bannerSubtitle?: string;
  bannerColor?: string; // hex
  intro?: string;
  invoice?: string;
  date?: string;
  paymentMethod?: string;
  items?: { name: string; qty: number; price: number }[];
  subtotal?: number;
  shipping?: number;
  total?: number;
  customer?: { name?: string; phone?: string; address?: string; district?: string; thana?: string };
  status?: string;
  ctaUrl?: string;
  ctaLabel?: string;
};

function brandedTemplate(opts: TplOpts, settings: any) {
  const siteName = settings?.site_name || "Our Shop";
  const logo = settings?.dark_logo_url || settings?.white_logo_url || settings?.logo_url || "";
  const banner = opts.bannerColor || "#22c55e";

  const itemsRows = (opts.items || []).map((i) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #1f2937;color:#e5e7eb;font-size:14px">${escapeHtml(i.name)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #1f2937;color:#e5e7eb;font-size:14px;text-align:center">${i.qty}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #1f2937;color:#e5e7eb;font-size:14px;text-align:right">৳${Number(i.price).toLocaleString()}</td>
    </tr>`).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#0b1220;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background:#0f172a;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.4)">
    <tr><td style="background:${banner};padding:28px 24px;text-align:center;color:#fff">
      <div style="font-size:24px;font-weight:800;letter-spacing:.3px">${escapeHtml(opts.bannerTitle)}</div>
      ${opts.bannerSubtitle ? `<div style="margin-top:6px;font-size:14px;opacity:.95">${escapeHtml(opts.bannerSubtitle)}</div>` : ""}
    </td></tr>

    ${logo ? `<tr><td style="padding:20px 24px 8px;text-align:center;background:#fff"><img src="${logo}" alt="${escapeHtml(siteName)}" style="max-height:60px;max-width:240px;object-fit:contain"/></td></tr>` : ""}

    <tr><td style="padding:24px;color:#e5e7eb;font-size:14px;line-height:1.55">
      ${opts.intro ? `<p style="margin:0 0 18px;color:#f3f4f6;font-size:15px">${escapeHtml(opts.intro)}</p>` : ""}

      ${opts.invoice || opts.date || opts.paymentMethod ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px">
        ${opts.invoice ? `<tr><td style="padding:4px 0;color:#9ca3af;font-weight:700;width:170px">Invoice No:</td><td style="padding:4px 0;color:#fff">${escapeHtml(opts.invoice)}</td></tr>` : ""}
        ${opts.date ? `<tr><td style="padding:4px 0;color:#9ca3af;font-weight:700">Order Date:</td><td style="padding:4px 0;color:#fff">${escapeHtml(opts.date)}</td></tr>` : ""}
        ${opts.paymentMethod ? `<tr><td style="padding:4px 0;color:#9ca3af;font-weight:700">Payment Method:</td><td style="padding:4px 0;color:#fff">${escapeHtml(opts.paymentMethod)}</td></tr>` : ""}
        ${opts.status ? `<tr><td style="padding:4px 0;color:#9ca3af;font-weight:700">Status:</td><td style="padding:4px 0;color:#34d399;font-weight:700;text-transform:capitalize">${escapeHtml(opts.status)}</td></tr>` : ""}
      </table>` : ""}

      ${opts.items && opts.items.length ? `
      <h3 style="margin:18px 0 8px;color:#f9fafb;font-size:16px">Order Summary</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1f2937;border-radius:8px;border-collapse:separate;overflow:hidden">
        <thead><tr style="background:#111827">
          <th style="padding:10px 12px;text-align:left;color:#9ca3af;font-size:12px;text-transform:uppercase">Product</th>
          <th style="padding:10px 12px;text-align:center;color:#9ca3af;font-size:12px;text-transform:uppercase">Qty</th>
          <th style="padding:10px 12px;text-align:right;color:#9ca3af;font-size:12px;text-transform:uppercase">Price</th>
        </tr></thead>
        <tbody>${itemsRows}</tbody>
      </table>` : ""}

      ${(opts.subtotal != null || opts.shipping != null || opts.total != null) ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px">
        ${opts.subtotal != null ? `<tr><td style="padding:4px 0;color:#9ca3af;font-weight:700">Subtotal:</td><td style="padding:4px 0;color:#e5e7eb;text-align:right">৳${Number(opts.subtotal).toLocaleString()}</td></tr>` : ""}
        ${opts.shipping != null ? `<tr><td style="padding:4px 0;color:#9ca3af;font-weight:700">Shipping:</td><td style="padding:4px 0;color:#e5e7eb;text-align:right">৳${Number(opts.shipping).toLocaleString()}</td></tr>` : ""}
        ${opts.total != null ? `<tr><td style="padding:8px 0 0;color:#fff;font-weight:800;font-size:16px">Total:</td><td style="padding:8px 0 0;color:#fff;font-weight:800;font-size:16px;text-align:right">৳${Number(opts.total).toLocaleString()}</td></tr>` : ""}
      </table>` : ""}

      ${opts.customer ? `
      <h3 style="margin:22px 0 8px;color:#f9fafb;font-size:16px">Customer Info</h3>
      <div style="color:#e5e7eb;font-size:14px;line-height:1.6">
        ${opts.customer.name ? `<div>${escapeHtml(opts.customer.name)}</div>` : ""}
        ${opts.customer.phone ? `<div>${escapeHtml(opts.customer.phone)}</div>` : ""}
        ${opts.customer.district ? `<div>District: ${escapeHtml(opts.customer.district)}</div>` : ""}
        ${opts.customer.thana ? `<div>Thana: ${escapeHtml(opts.customer.thana)}</div>` : ""}
        ${opts.customer.address ? `<div>${escapeHtml(opts.customer.address)}</div>` : ""}
      </div>` : ""}

      ${opts.ctaUrl ? `
      <div style="text-align:center;margin:26px 0 6px">
        <a href="${opts.ctaUrl}" style="display:inline-block;background:${banner};color:#fff;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:8px;font-size:14px">${escapeHtml(opts.ctaLabel || "View Order")}</a>
      </div>` : ""}
    </td></tr>

    <tr><td style="background:${banner};padding:14px;text-align:center;color:#fff;font-size:13px">© ${new Date().getFullYear()} ${escapeHtml(siteName)}</td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: any): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ───────────────────── High-level helpers ─────────────────────
type OrderInfo = {
  invoice?: string;
  customerName?: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  address?: string;
  district?: string;
  thana?: string;
  paymentMethod?: string;
  items?: { name: string; qty: number; price: number }[];
  subtotal?: number;
  shipping?: number;
  total?: number;
};

function originUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

/** Customer + Admin email + Customer SMS — when a new order is placed */
export async function notifyOrderPlaced(o: OrderInfo) {
  const settings = await getSettings();
  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  // 1. Customer email
  const customerHtml = brandedTemplate({
    bannerTitle: "Order Confirmation",
    bannerSubtitle: o.invoice ? `Order Number: #${o.invoice}` : undefined,
    bannerColor: "#22c55e",
    intro: `প্রিয় ${o.customerName || "গ্রাহক"}, আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। শীঘ্রই কনফার্ম করা হবে।`,
    invoice: o.invoice,
    date,
    paymentMethod: o.paymentMethod,
    items: o.items,
    subtotal: o.subtotal,
    shipping: o.shipping,
    total: o.total,
    customer: { name: o.customerName, phone: o.customerPhone || undefined, address: o.address, district: o.district, thana: o.thana },
    ctaUrl: `${originUrl()}/track`,
    ctaLabel: "Track Order",
  }, settings);

  if (o.customerEmail) {
    sendAppEmail({ to: o.customerEmail, subject: `Order Confirmation — #${o.invoice}`, html: customerHtml });
  }

  // 2. Admin email — always send to contact_email
  const adminEmail = settings?.contact_email;
  if (adminEmail) {
    const adminHtml = brandedTemplate({
      bannerTitle: "New Order Received",
      bannerSubtitle: o.invoice ? `Order Number: #${o.invoice}` : undefined,
      bannerColor: "#22c55e",
      intro: "New order has been placed on your website.",
      invoice: o.invoice,
      date,
      paymentMethod: o.paymentMethod,
      items: o.items,
      subtotal: o.subtotal,
      shipping: o.shipping,
      total: o.total,
      customer: { name: o.customerName, phone: o.customerPhone || undefined, address: o.address, district: o.district, thana: o.thana },
      ctaUrl: `${originUrl()}/admin/orders`,
      ctaLabel: "View Orders",
    }, settings);
    sendAppEmail({ to: adminEmail, subject: `New Order Received — #${o.invoice}`, html: adminHtml });
  }

  // 3. Customer SMS
  if (o.customerPhone) {
    const sms = `${settings?.site_name || "Shop"}: আপনার অর্ডার #${o.invoice} গ্রহণ করা হয়েছে। মোট ৳${o.total ?? ""}। ধন্যবাদ!`;
    sendAppSms(o.customerPhone, sms);
  }
}

/** Customer email + SMS only — when order status changes (NO admin email) */
export async function notifyOrderStatusChanged(o: OrderInfo & { status: string }) {
  const settings = await getSettings();
  if (o.customerEmail) {
    const html = brandedTemplate({
      bannerTitle: "Order Status Update",
      bannerSubtitle: o.invoice ? `Order #${o.invoice}` : undefined,
      bannerColor: "#3b82f6",
      intro: `প্রিয় ${o.customerName || "গ্রাহক"}, আপনার অর্ডারের বর্তমান স্ট্যাটাস আপডেট করা হয়েছে।`,
      invoice: o.invoice,
      status: o.status,
      total: o.total,
      ctaUrl: `${originUrl()}/track`,
      ctaLabel: "Track Order",
    }, settings);
    sendAppEmail({ to: o.customerEmail, subject: `Order ${o.status} — #${o.invoice}`, html });
  }
  if (o.customerPhone) {
    sendAppSms(o.customerPhone, `${settings?.site_name || "Shop"}: আপনার অর্ডার #${o.invoice} এর স্ট্যাটাস: ${o.status}`);
  }
}

/** Customer + Admin email + Customer SMS — when a manual payment is verified */
export async function notifyPaymentVerified(o: OrderInfo) {
  const settings = await getSettings();
  const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  if (o.customerEmail) {
    const html = brandedTemplate({
      bannerTitle: "Payment Verified ✓",
      bannerSubtitle: o.invoice ? `Order #${o.invoice}` : undefined,
      bannerColor: "#10b981",
      intro: `প্রিয় ${o.customerName || "গ্রাহক"}, আপনার পেমেন্ট সফলভাবে যাচাই করা হয়েছে। অর্ডার প্রসেস হচ্ছে।`,
      invoice: o.invoice,
      date,
      paymentMethod: o.paymentMethod,
      items: o.items,
      total: o.total,
      ctaUrl: `${originUrl()}/track`,
      ctaLabel: "Track Order",
    }, settings);
    sendAppEmail({ to: o.customerEmail, subject: `Payment Verified — #${o.invoice}`, html });
  }

  const adminEmail = settings?.contact_email;
  if (adminEmail) {
    const adminHtml = brandedTemplate({
      bannerTitle: "Payment Verified",
      bannerSubtitle: o.invoice ? `Order #${o.invoice}` : undefined,
      bannerColor: "#10b981",
      intro: "A customer payment has been verified and the order has been created.",
      invoice: o.invoice,
      date,
      paymentMethod: o.paymentMethod,
      items: o.items,
      total: o.total,
      customer: { name: o.customerName, phone: o.customerPhone || undefined, address: o.address },
      ctaUrl: `${originUrl()}/admin/orders`,
      ctaLabel: "View Order",
    }, settings);
    sendAppEmail({ to: adminEmail, subject: `Payment Verified — #${o.invoice}`, html: adminHtml });
  }

  if (o.customerPhone) {
    sendAppSms(o.customerPhone, `${settings?.site_name || "Shop"}: আপনার পেমেন্ট যাচাই হয়েছে। অর্ডার #${o.invoice} প্রসেস হচ্ছে।`);
  }
}

// ───────── Legacy compatibility (still exported in case used elsewhere) ─────────
export function orderConfirmationHtml(opts: { invoice?: string; name?: string; total?: number }) {
  return `<div style="font-family:Arial;padding:20px"><h2>Order Confirmation</h2><p>প্রিয় ${opts.name || "গ্রাহক"}, আপনার অর্ডার গ্রহণ করা হয়েছে।</p>${opts.invoice ? `<p>Invoice: ${opts.invoice}</p>` : ""}${opts.total != null ? `<p>মোট: ৳${opts.total}</p>` : ""}</div>`;
}
export function orderStatusHtml(opts: { invoice?: string; status: string; name?: string }) {
  return `<div style="font-family:Arial;padding:20px"><h2>Order Status Update</h2><p>স্ট্যাটাস: <b>${opts.status}</b></p>${opts.invoice ? `<p>Invoice: ${opts.invoice}</p>` : ""}</div>`;
}
export function paymentVerifiedHtml(opts: { invoice?: string; name?: string; total?: number }) {
  return `<div style="font-family:Arial;padding:20px"><h2>Payment Verified</h2><p>আপনার পেমেন্ট যাচাই হয়েছে।</p>${opts.invoice ? `<p>Invoice: ${opts.invoice}</p>` : ""}</div>`;
}
