// Centralized e-commerce event tracking
// Fires events to Facebook Pixel (fbq), Google Analytics (gtag), TikTok (ttq), and GTM (dataLayer)
// All injected pixels via PixelInjector will automatically receive these events.

type Item = {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  category?: string;
};

const w = () => (typeof window !== "undefined" ? (window as any) : null);

const fbq = (...args: any[]) => { try { w()?.fbq?.(...args); } catch {} };
const gtag = (...args: any[]) => { try { w()?.gtag?.(...args); } catch {} };
const ttq = (event: string, data?: any) => { try { w()?.ttq?.track?.(event, data); } catch {} };
const dl = (data: any) => { try { const win = w(); if (!win) return; win.dataLayer = win.dataLayer || []; win.dataLayer.push(data); } catch {} };

// Pixel event bus — emits every fired event so the Live Monitor (admin) can listen.
// Toggle key in localStorage controls whether events are emitted/captured.
const MONITOR_KEY = "pixel_monitor_enabled";
export const isPixelMonitorEnabled = () =>
  typeof localStorage !== "undefined" && localStorage.getItem(MONITOR_KEY) === "1";
export const setPixelMonitorEnabled = (on: boolean) => {
  try { localStorage.setItem(MONITOR_KEY, on ? "1" : "0"); } catch {}
};

// Cross-tab broadcast channel so admin monitor can see events from any tab
const BC_NAME = "pixel-monitor-channel";
let bc: BroadcastChannel | null = null;
const getBC = () => {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (!bc) { try { bc = new BroadcastChannel(BC_NAME); } catch { bc = null; } }
  return bc;
};

const emitMonitor = (name: string, data: any) => {
  try {
    if (!isPixelMonitorEnabled()) return;
    const detail = { name, data, ts: Date.now(), path: typeof location !== "undefined" ? location.pathname : "" };
    // Same-tab listeners
    window.dispatchEvent(new CustomEvent("pixel:event", { detail }));
    // Cross-tab via BroadcastChannel
    getBC()?.postMessage(detail);
    // Cross-tab fallback via localStorage 'storage' event
    try { localStorage.setItem("pixel_monitor_last", JSON.stringify(detail)); } catch {}
  } catch {}
};

const debug = (name: string, data: any) => {
  emitMonitor(name, data);
  if (w()?.__PIXEL_DEBUG__) console.log(`[Track] ${name}`, data);
};

export const trackPageView = (path?: string) => {
  const page = path || (typeof location !== "undefined" ? location.pathname : "/");
  fbq("track", "PageView");
  gtag("event", "page_view", { page_path: page });
  dl({ event: "page_view", page_path: page });
  debug("PageView", { page });
};

export const trackViewContent = (item: Item) => {
  const payload = {
    content_ids: [item.id],
    content_name: item.name,
    content_type: "product",
    value: item.price,
    currency: "BDT",
  };
  fbq("track", "ViewContent", payload);
  gtag("event", "view_item", {
    currency: "BDT",
    value: item.price,
    items: [{ item_id: item.id, item_name: item.name, price: item.price, quantity: 1 }],
  });
  ttq("ViewContent", { content_id: item.id, content_name: item.name, value: item.price, currency: "BDT" });
  dl({ event: "view_item", ecommerce: payload });
  debug("ViewContent", payload);
};

export const trackAddToCart = (item: Item) => {
  const qty = item.quantity || 1;
  const value = item.price * qty;
  const payload = {
    content_ids: [item.id],
    content_name: item.name,
    content_type: "product",
    value,
    currency: "BDT",
    contents: [{ id: item.id, quantity: qty, item_price: item.price }],
  };
  fbq("track", "AddToCart", payload);
  gtag("event", "add_to_cart", {
    currency: "BDT",
    value,
    items: [{ item_id: item.id, item_name: item.name, price: item.price, quantity: qty }],
  });
  ttq("AddToCart", { content_id: item.id, content_name: item.name, quantity: qty, value, currency: "BDT" });
  dl({ event: "add_to_cart", ecommerce: payload });
  debug("AddToCart", payload);
};

export const trackInitiateCheckout = (items: Item[], total: number) => {
  const payload = {
    content_ids: items.map((i) => i.id),
    contents: items.map((i) => ({ id: i.id, quantity: i.quantity || 1, item_price: i.price })),
    num_items: items.reduce((s, i) => s + (i.quantity || 1), 0),
    value: total,
    currency: "BDT",
  };
  fbq("track", "InitiateCheckout", payload);
  gtag("event", "begin_checkout", {
    currency: "BDT",
    value: total,
    items: items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity || 1 })),
  });
  ttq("InitiateCheckout", { value: total, currency: "BDT", contents: payload.contents });
  dl({ event: "begin_checkout", ecommerce: payload });
  debug("InitiateCheckout", payload);
};

export const trackAddPaymentInfo = (method: string, total: number) => {
  fbq("track", "AddPaymentInfo", { value: total, currency: "BDT" });
  gtag("event", "add_payment_info", { currency: "BDT", value: total, payment_type: method });
  ttq("AddPaymentInfo", { value: total, currency: "BDT" });
  dl({ event: "add_payment_info", payment_type: method, value: total });
  debug("AddPaymentInfo", { method, total });
};

export const trackPurchase = (args: {
  invoice: string;
  items: Item[];
  total: number;
  shipping?: number;
  discount?: number;
  paymentMethod?: string;
}) => {
  const { invoice, items, total, shipping = 0, discount = 0, paymentMethod } = args;
  const payload = {
    content_ids: items.map((i) => i.id),
    contents: items.map((i) => ({ id: i.id, quantity: i.quantity || 1, item_price: i.price })),
    num_items: items.reduce((s, i) => s + (i.quantity || 1), 0),
    value: total,
    currency: "BDT",
  };
  fbq("track", "Purchase", payload);
  gtag("event", "purchase", {
    transaction_id: invoice,
    value: total,
    currency: "BDT",
    shipping,
    items: items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity || 1 })),
  });
  ttq("CompletePayment", { value: total, currency: "BDT", contents: payload.contents });
  dl({
    event: "purchase",
    ecommerce: { transaction_id: invoice, value: total, currency: "BDT", shipping, tax: 0, coupon: discount, items: payload.contents },
    payment_method: paymentMethod,
  });
  debug("Purchase", { invoice, ...payload });
};

export const trackSearch = (query: string) => {
  fbq("track", "Search", { search_string: query });
  gtag("event", "search", { search_term: query });
  ttq("Search", { query });
  dl({ event: "search", search_term: query });
};

export const trackContact = () => {
  fbq("track", "Contact");
  dl({ event: "contact" });
};

export const trackLead = (data?: any) => {
  fbq("track", "Lead", data);
  gtag("event", "generate_lead", data);
  ttq("SubmitForm", data);
  dl({ event: "generate_lead", ...data });
};
