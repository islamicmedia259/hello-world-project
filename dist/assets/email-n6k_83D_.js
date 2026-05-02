import{s as p}from"./index-B9wv9rHp.js";let m=null;async function f(){if(m)return m;const{data:e}=await p.from("site_settings").select("site_name, logo_url, dark_logo_url, white_logo_url, contact_email, contact_phone, address, footer_text, api_keys").limit(1).maybeSingle();return m=e||{},m}async function o({to:e,subject:t,html:a,text:r}){if(!(!e||!/^\S+@\S+\.\S+$/.test(e)))try{await p.functions.invoke("send-email",{body:{to:e,subject:t,html:a,text:r}})}catch(n){console.warn("sendAppEmail failed",n)}}async function u(e,t){if(e)try{await p.functions.invoke("send-sms",{body:{to:e,message:t}})}catch(a){console.warn("sendAppSms failed",a)}}function l(e,t){const a=(t==null?void 0:t.site_name)||"Our Shop",r=(t==null?void 0:t.dark_logo_url)||(t==null?void 0:t.white_logo_url)||(t==null?void 0:t.logo_url)||"",n=e.bannerColor||"#22c55e",d=(e.items||[]).map(s=>`
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #1f2937;color:#e5e7eb;font-size:14px">${i(s.name)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #1f2937;color:#e5e7eb;font-size:14px;text-align:center">${s.qty}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #1f2937;color:#e5e7eb;font-size:14px;text-align:right">৳${Number(s.price).toLocaleString()}</td>
    </tr>`).join("");return`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#0b1220;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background:#0f172a;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.4)">
    <tr><td style="background:${n};padding:28px 24px;text-align:center;color:#fff">
      <div style="font-size:24px;font-weight:800;letter-spacing:.3px">${i(e.bannerTitle)}</div>
      ${e.bannerSubtitle?`<div style="margin-top:6px;font-size:14px;opacity:.95">${i(e.bannerSubtitle)}</div>`:""}
    </td></tr>

    ${r?`<tr><td style="padding:20px 24px 8px;text-align:center;background:#fff"><img src="${r}" alt="${i(a)}" style="max-height:60px;max-width:240px;object-fit:contain"/></td></tr>`:""}

    <tr><td style="padding:24px;color:#e5e7eb;font-size:14px;line-height:1.55">
      ${e.intro?`<p style="margin:0 0 18px;color:#f3f4f6;font-size:15px">${i(e.intro)}</p>`:""}

      ${e.invoice||e.date||e.paymentMethod?`
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px">
        ${e.invoice?`<tr><td style="padding:4px 0;color:#9ca3af;font-weight:700;width:170px">Invoice No:</td><td style="padding:4px 0;color:#fff">${i(e.invoice)}</td></tr>`:""}
        ${e.date?`<tr><td style="padding:4px 0;color:#9ca3af;font-weight:700">Order Date:</td><td style="padding:4px 0;color:#fff">${i(e.date)}</td></tr>`:""}
        ${e.paymentMethod?`<tr><td style="padding:4px 0;color:#9ca3af;font-weight:700">Payment Method:</td><td style="padding:4px 0;color:#fff">${i(e.paymentMethod)}</td></tr>`:""}
        ${e.status?`<tr><td style="padding:4px 0;color:#9ca3af;font-weight:700">Status:</td><td style="padding:4px 0;color:#34d399;font-weight:700;text-transform:capitalize">${i(e.status)}</td></tr>`:""}
      </table>`:""}

      ${e.items&&e.items.length?`
      <h3 style="margin:18px 0 8px;color:#f9fafb;font-size:16px">Order Summary</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1f2937;border-radius:8px;border-collapse:separate;overflow:hidden">
        <thead><tr style="background:#111827">
          <th style="padding:10px 12px;text-align:left;color:#9ca3af;font-size:12px;text-transform:uppercase">Product</th>
          <th style="padding:10px 12px;text-align:center;color:#9ca3af;font-size:12px;text-transform:uppercase">Qty</th>
          <th style="padding:10px 12px;text-align:right;color:#9ca3af;font-size:12px;text-transform:uppercase">Price</th>
        </tr></thead>
        <tbody>${d}</tbody>
      </table>`:""}

      ${e.subtotal!=null||e.shipping!=null||e.total!=null?`
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px">
        ${e.subtotal!=null?`<tr><td style="padding:4px 0;color:#9ca3af;font-weight:700">Subtotal:</td><td style="padding:4px 0;color:#e5e7eb;text-align:right">৳${Number(e.subtotal).toLocaleString()}</td></tr>`:""}
        ${e.shipping!=null?`<tr><td style="padding:4px 0;color:#9ca3af;font-weight:700">Shipping:</td><td style="padding:4px 0;color:#e5e7eb;text-align:right">৳${Number(e.shipping).toLocaleString()}</td></tr>`:""}
        ${e.total!=null?`<tr><td style="padding:8px 0 0;color:#fff;font-weight:800;font-size:16px">Total:</td><td style="padding:8px 0 0;color:#fff;font-weight:800;font-size:16px;text-align:right">৳${Number(e.total).toLocaleString()}</td></tr>`:""}
      </table>`:""}

      ${e.customer?`
      <h3 style="margin:22px 0 8px;color:#f9fafb;font-size:16px">Customer Info</h3>
      <div style="color:#e5e7eb;font-size:14px;line-height:1.6">
        ${e.customer.name?`<div>${i(e.customer.name)}</div>`:""}
        ${e.customer.phone?`<div>${i(e.customer.phone)}</div>`:""}
        ${e.customer.district?`<div>District: ${i(e.customer.district)}</div>`:""}
        ${e.customer.thana?`<div>Thana: ${i(e.customer.thana)}</div>`:""}
        ${e.customer.address?`<div>${i(e.customer.address)}</div>`:""}
      </div>`:""}

      ${e.ctaUrl?`
      <div style="text-align:center;margin:26px 0 6px">
        <a href="${e.ctaUrl}" style="display:inline-block;background:${n};color:#fff;text-decoration:none;font-weight:700;padding:12px 28px;border-radius:8px;font-size:14px">${i(e.ctaLabel||"View Order")}</a>
      </div>`:""}
    </td></tr>

    <tr><td style="background:${n};padding:14px;text-align:center;color:#fff;font-size:13px">© ${new Date().getFullYear()} ${i(a)}</td></tr>
  </table>
</body></html>`}function i(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function c(){return typeof window<"u"?window.location.origin:""}async function b(e){const t=await f(),a=new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}),r=l({bannerTitle:"Order Confirmation",bannerSubtitle:e.invoice?`Order Number: #${e.invoice}`:void 0,bannerColor:"#22c55e",intro:`প্রিয় ${e.customerName||"গ্রাহক"}, আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। শীঘ্রই কনফার্ম করা হবে।`,invoice:e.invoice,date:a,paymentMethod:e.paymentMethod,items:e.items,subtotal:e.subtotal,shipping:e.shipping,total:e.total,customer:{name:e.customerName,phone:e.customerPhone||void 0,address:e.address,district:e.district,thana:e.thana},ctaUrl:`${c()}/track`,ctaLabel:"Track Order"},t);e.customerEmail&&o({to:e.customerEmail,subject:`Order Confirmation — #${e.invoice}`,html:r});const n=t==null?void 0:t.contact_email;if(n){const d=l({bannerTitle:"New Order Received",bannerSubtitle:e.invoice?`Order Number: #${e.invoice}`:void 0,bannerColor:"#22c55e",intro:"New order has been placed on your website.",invoice:e.invoice,date:a,paymentMethod:e.paymentMethod,items:e.items,subtotal:e.subtotal,shipping:e.shipping,total:e.total,customer:{name:e.customerName,phone:e.customerPhone||void 0,address:e.address,district:e.district,thana:e.thana},ctaUrl:`${c()}/admin/orders`,ctaLabel:"View Orders"},t);o({to:n,subject:`New Order Received — #${e.invoice}`,html:d})}if(e.customerPhone){const d=`${(t==null?void 0:t.site_name)||"Shop"}: আপনার অর্ডার #${e.invoice} গ্রহণ করা হয়েছে। মোট ৳${e.total??""}। ধন্যবাদ!`;u(e.customerPhone,d)}}async function x(e){const t=await f();if(e.customerEmail){const a=l({bannerTitle:"Order Status Update",bannerSubtitle:e.invoice?`Order #${e.invoice}`:void 0,bannerColor:"#3b82f6",intro:`প্রিয় ${e.customerName||"গ্রাহক"}, আপনার অর্ডারের বর্তমান স্ট্যাটাস আপডেট করা হয়েছে।`,invoice:e.invoice,status:e.status,total:e.total,ctaUrl:`${c()}/track`,ctaLabel:"Track Order"},t);o({to:e.customerEmail,subject:`Order ${e.status} — #${e.invoice}`,html:a})}e.customerPhone&&u(e.customerPhone,`${(t==null?void 0:t.site_name)||"Shop"}: আপনার অর্ডার #${e.invoice} এর স্ট্যাটাস: ${e.status}`)}async function g(e){const t=await f(),a=new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});if(e.customerEmail){const n=l({bannerTitle:"Payment Verified ✓",bannerSubtitle:e.invoice?`Order #${e.invoice}`:void 0,bannerColor:"#10b981",intro:`প্রিয় ${e.customerName||"গ্রাহক"}, আপনার পেমেন্ট সফলভাবে যাচাই করা হয়েছে। অর্ডার প্রসেস হচ্ছে।`,invoice:e.invoice,date:a,paymentMethod:e.paymentMethod,items:e.items,total:e.total,ctaUrl:`${c()}/track`,ctaLabel:"Track Order"},t);o({to:e.customerEmail,subject:`Payment Verified — #${e.invoice}`,html:n})}const r=t==null?void 0:t.contact_email;if(r){const n=l({bannerTitle:"Payment Verified",bannerSubtitle:e.invoice?`Order #${e.invoice}`:void 0,bannerColor:"#10b981",intro:"A customer payment has been verified and the order has been created.",invoice:e.invoice,date:a,paymentMethod:e.paymentMethod,items:e.items,total:e.total,customer:{name:e.customerName,phone:e.customerPhone||void 0,address:e.address},ctaUrl:`${c()}/admin/orders`,ctaLabel:"View Order"},t);o({to:r,subject:`Payment Verified — #${e.invoice}`,html:n})}e.customerPhone&&u(e.customerPhone,`${(t==null?void 0:t.site_name)||"Shop"}: আপনার পেমেন্ট যাচাই হয়েছে। অর্ডার #${e.invoice} প্রসেস হচ্ছে।`)}function y(e){return`<div style="font-family:Arial;padding:20px"><h2>Order Confirmation</h2><p>প্রিয় ${e.name||"গ্রাহক"}, আপনার অর্ডার গ্রহণ করা হয়েছে।</p>${e.invoice?`<p>Invoice: ${e.invoice}</p>`:""}${e.total!=null?`<p>মোট: ৳${e.total}</p>`:""}</div>`}function $(e){return`<div style="font-family:Arial;padding:20px"><h2>Order Status Update</h2><p>স্ট্যাটাস: <b>${e.status}</b></p>${e.invoice?`<p>Invoice: ${e.invoice}</p>`:""}</div>`}function v(e){return`<div style="font-family:Arial;padding:20px"><h2>Payment Verified</h2><p>আপনার পেমেন্ট যাচাই হয়েছে।</p>${e.invoice?`<p>Invoice: ${e.invoice}</p>`:""}</div>`}export{b as notifyOrderPlaced,x as notifyOrderStatusChanged,g as notifyPaymentVerified,y as orderConfirmationHtml,$ as orderStatusHtml,v as paymentVerifiedHtml,o as sendAppEmail,u as sendAppSms};
