import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { BD_LOCATIONS } from "@/data/bd-locations";
import { ChevronDown, Star, Check, ShoppingBag } from "lucide-react";
import AutoCarousel from "@/components/AutoCarousel";

export default function LandingPage() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { addItem } = useCart();
  const [lp, setLp] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Order form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("");
  const [thana, setThana] = useState("");
  const [address, setAddress] = useState("");
  const [qty, setQty] = useState(1);
  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("landing_pages")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (!data) {
        setLoading(false);
        return;
      }
      setLp(data);
      document.title = data.title;
      if (data.meta_description) {
        let m = document.querySelector('meta[name="description"]');
        if (!m) {
          m = document.createElement("meta");
          m.setAttribute("name", "description");
          document.head.appendChild(m);
        }
        m.setAttribute("content", data.meta_description);
      }
      (supabase as any)
        .from("landing_pages")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", data.id);

      if (data.product_id) {
        const { data: p } = await (supabase as any)
          .from("products")
          .select("*")
          .eq("id", data.product_id)
          .maybeSingle();
        setProduct(p);
      }
      setLoading(false);
    })();

    (supabase as any)
      .from("shipping_charges")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }: any) => {
        setShippingOptions(data || []);
        if (data?.[0]) setSelectedShipping(data[0].id);
      });
  }, [slug]);

  useEffect(() => {
    if (!lp?.show_countdown || !lp?.countdown_end_at) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [lp]);

  const thanas = district ? BD_LOCATIONS[district] || [] : [];

  const displayPrice = useMemo(() => {
    if (lp?.custom_discount_price) return lp.custom_discount_price;
    if (lp?.custom_price) return lp.custom_price;
    if (product?.discount_price) return product.discount_price;
    return product?.price || 0;
  }, [lp, product]);

  const originalPrice = useMemo(() => {
    if (lp?.custom_price && lp?.custom_discount_price) return lp.custom_price;
    if (product?.discount_price && product?.price) return product.price;
    return null;
  }, [lp, product]);

  const shipping = shippingOptions.find((s) => s.id === selectedShipping);
  const subtotal = displayPrice * qty;
  const grandTotal = subtotal + (shipping?.charge || 0);

  const scrollToOrder = () => {
    const el = document.getElementById("order-form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleCTA = () => {
    if (lp.order_mode === "redirect") {
      if (product) {
        addItem(
          {
            id: product.id,
            name: product.name,
            price: displayPrice,
            image_url: product.image_url || "",
          },
          qty,
          { openSidebar: false }
        );
        nav("/checkout");
      } else {
        nav("/shop");
      }
    } else {
      scrollToOrder();
    }
  };

  const submitOrder = async () => {
    if (!name || !phone || !district || !thana || !address) {
      toast.error("সব তথ্য পূরণ করুন");
      return;
    }
    if (phone.replace(/\D/g, "").length < 11) {
      toast.error("সঠিক ফোন নাম্বার দিন");
      return;
    }
    if (!product) {
      toast.error("Product সংযুক্ত নেই");
      return;
    }
    setSubmitting(true);
    const fullAddress = `${address}, ${thana}, ${district}`;
    const { data: order, error } = await (supabase as any)
      .from("orders")
      .insert([
        {
          customer_name: name,
          phone,
          address: fullAddress,
          total: grandTotal,
          shipping_cost: shipping?.charge || 0,
          payment_method: "cod",
          payment_status: "pending",
          status: "pending",
          notes: `Landing Page: ${lp.slug}`,
        },
      ])
      .select("id, invoice_no")
      .single();
    if (error || !order) {
      setSubmitting(false);
      toast.error("অর্ডার সাবমিট ব্যর্থ");
      return;
    }
    await (supabase as any).from("order_items").insert([
      {
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        unit_price: displayPrice,
        quantity: qty,
      },
    ]);
    (supabase as any)
      .from("landing_pages")
      .update({ order_count: (lp.order_count || 0) + 1 })
      .eq("id", lp.id);
    try {
      (window as any).fbq?.("track", "Purchase", { value: grandTotal, currency: "BDT" });
      (window as any).gtag?.("event", "purchase", { value: grandTotal, currency: "BDT" });
    } catch {}
    setSubmitting(false);
    toast.success("অর্ডার সফল!");
    nav(`/order-confirmation/${order.invoice_no}`);
  };

  if (loading)
    return <div className="min-h-[60vh] grid place-items-center text-muted-foreground">Loading…</div>;
  if (!lp)
    return (
      <div className="min-h-[60vh] grid place-items-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Page not found</h1>
          <p className="text-muted-foreground break-all">/lp/{slug}</p>
        </div>
      </div>
    );

  const accent = lp.primary_color || "#dc2626";
  const accentStyle: React.CSSProperties = { backgroundColor: accent };
  const accentTextStyle: React.CSSProperties = { color: accent };

  // Countdown
  let cd: { d: number; h: number; m: number; s: number } | null = null;
  if (lp.show_countdown && lp.countdown_end_at) {
    const diff = Math.max(0, new Date(lp.countdown_end_at).getTime() - now);
    cd = {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff / 3600000) % 24),
      m: Math.floor((diff / 60000) % 60),
      s: Math.floor((diff / 1000) % 60),
    };
  }

  // Build YouTube embed
  const videoUrl = lp.hero_video_url || product?.video_url || "";
  const ytEmbed = (() => {
    if (!videoUrl) return null;
    const m = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
    return null;
  })();

  const OrderButton = ({ label }: { label?: string }) => (
    <button
      onClick={handleCTA}
      style={accentStyle}
      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-white font-bold px-6 sm:px-10 py-4 rounded-lg text-base sm:text-lg shadow-lg hover:opacity-90 active:scale-[0.98] transition"
    >
      <ShoppingBag className="h-5 w-5" />
      {label || lp.hero_cta_label || "এখনই অর্ডার করুন"}
    </button>
  );

  const banners = (lp.banners || []).filter((b: any) => b?.image_url);
  const topBanner = banners[0];
  const remainingBanners = banners.slice(1);

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-0">
      {/* 1. TOP BANNER (clickable → order form) */}
      {topBanner && (
        <section className="w-full">
          <button
            onClick={handleCTA}
            className="block w-full cursor-pointer group"
            aria-label="Order now"
          >
            <img
              src={topBanner.image_url}
              alt={topBanner.caption || lp.title}
              className="w-full h-auto object-cover group-hover:opacity-95 transition"
            />
            {topBanner.caption && (
              <p className="text-center text-sm sm:text-base font-medium text-muted-foreground py-2 px-3">
                {topBanner.caption}
              </p>
            )}
          </button>
        </section>
      )}

      {/* Fallback hero (only if no top banner) */}
      {!topBanner && (lp.hero_headline || lp.hero_image_url) && (
        <section
          style={{ backgroundColor: lp.hero_bg_color, color: lp.hero_text_color }}
          className="py-8 sm:py-14 px-4"
        >
          <div className="container-page text-center max-w-3xl mx-auto">
            {lp.hero_image_url && (
              <img
                src={lp.hero_image_url}
                alt={lp.hero_headline || lp.title}
                className="w-full max-w-xl mx-auto rounded-xl shadow-xl mb-5"
              />
            )}
            {lp.hero_headline && (
              <h1 className="font-display font-black text-2xl sm:text-4xl md:text-5xl leading-tight mb-3">
                {lp.hero_headline}
              </h1>
            )}
            {lp.hero_subheadline && (
              <p className="text-base sm:text-lg opacity-90 mb-5 whitespace-pre-line">
                {lp.hero_subheadline}
              </p>
            )}
          </div>
        </section>
      )}

      {/* 2. VIDEO */}
      {(ytEmbed || videoUrl) && (
        <section className="py-6 sm:py-10 px-3 sm:px-4 bg-muted/30">
          <div className="container-page max-w-3xl mx-auto">
            {lp.hero_headline && topBanner && (
              <h2 className="font-display font-bold text-xl sm:text-2xl md:text-3xl text-center mb-4">
                {lp.hero_headline}
              </h2>
            )}
            <div className="rounded-xl overflow-hidden shadow-xl bg-black">
              {ytEmbed ? (
                <iframe
                  src={ytEmbed}
                  className="w-full aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Product video"
                />
              ) : (
                <video src={videoUrl} controls playsInline className="w-full aspect-video" />
              )}
            </div>
          </div>
        </section>
      )}

      {/* 3. ORDER BUTTON */}
      <section className="py-6 sm:py-8 px-4">
        <div className="container-page text-center">
          <OrderButton />
          {originalPrice && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm sm:text-base">
              <span className="text-muted-foreground line-through">৳{originalPrice}</span>
              <span style={accentTextStyle} className="font-black text-xl sm:text-2xl">
                ৳{displayPrice}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* COUNTDOWN (optional) */}
      {cd && (
        <section style={accentStyle} className="text-white py-5 px-4">
          <div className="container-page text-center">
            <div className="font-display font-bold text-lg sm:text-2xl mb-3">
              {lp.countdown_title}
            </div>
            <div className="flex justify-center gap-2 sm:gap-4">
              {[
                { l: "Day", v: cd.d },
                { l: "Hour", v: cd.h },
                { l: "Min", v: cd.m },
                { l: "Sec", v: cd.s },
              ].map((x) => (
                <div
                  key={x.l}
                  className="bg-white/20 backdrop-blur rounded-lg px-3 sm:px-5 py-2 sm:py-3 min-w-[60px]"
                >
                  <div className="font-bold text-xl sm:text-3xl">
                    {String(x.v).padStart(2, "0")}
                  </div>
                  <div className="text-[10px] sm:text-xs opacity-80">{x.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. DESCRIPTION (বিস্তারিত) */}
      {lp.description && (
        <section className="py-8 sm:py-12 px-4">
          <div className="container-page max-w-3xl mx-auto">
            <h2 className="font-display font-bold text-xl sm:text-2xl md:text-3xl text-center mb-5">
              বিস্তারিত
            </h2>
            <div
              className="prose prose-sm sm:prose-base max-w-none prose-headings:font-display prose-img:rounded-lg prose-img:mx-auto"
              dangerouslySetInnerHTML={{ __html: lp.description }}
            />
          </div>
        </section>
      )}

      {/* FEATURES (optional) */}
      {lp.show_features && (lp.features || []).length > 0 && (
        <section className="py-8 sm:py-12 px-4 bg-muted/30">
          <div className="container-page">
            <h2 className="font-display font-bold text-xl sm:text-2xl md:text-3xl text-center mb-6 sm:mb-10">
              {lp.features_title}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {lp.features.map((f: any, i: number) => (
                <div key={i} className="bg-card p-5 rounded-xl shadow-card text-center">
                  <div className="text-3xl sm:text-4xl mb-2">{f.icon || "✨"}</div>
                  <h3 className="font-bold text-base sm:text-lg mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Extra banners (clickable to order) */}
      {remainingBanners.length > 0 && (
        <section className="py-6 sm:py-10 px-3 sm:px-4">
          <div className="container-page max-w-4xl mx-auto space-y-3 sm:space-y-4">
            {remainingBanners.map((b: any, i: number) => {
              const img = (
                <img
                  src={b.image_url}
                  alt={b.caption || `Banner ${i + 2}`}
                  className="w-full rounded-xl shadow-card"
                />
              );
              if (b.click_to_order || !b.link_url) {
                return (
                  <button
                    key={i}
                    onClick={handleCTA}
                    className="block w-full text-left group cursor-pointer"
                  >
                    {img}
                    {b.caption && (
                      <p className="text-center text-sm text-muted-foreground mt-2 group-hover:underline">
                        {b.caption}
                      </p>
                    )}
                  </button>
                );
              }
              return (
                <a
                  key={i}
                  href={b.link_url}
                  target={b.link_url.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="block"
                >
                  {img}
                  {b.caption && (
                    <p className="text-center text-sm text-muted-foreground mt-2">{b.caption}</p>
                  )}
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* GALLERY (optional) */}
      {lp.show_gallery && (lp.gallery || []).filter(Boolean).length > 0 && (
        <section className="py-8 sm:py-12 px-4">
          <div className="container-page">
            <h2 className="font-display font-bold text-xl sm:text-2xl md:text-3xl text-center mb-6">
              {lp.gallery_title}
            </h2>
            <AutoCarousel itemsPerView={{ base: 2, sm: 3, md: 4 }} intervalMs={3000}>
              {lp.gallery.filter(Boolean).map((url: string, i: number) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-full aspect-square object-cover rounded-lg"
                />
              ))}
            </AutoCarousel>
          </div>
        </section>
      )}

      {/* 5. REVIEWS */}
      {lp.show_reviews && (lp.reviews || []).length > 0 && (
        <section className="py-8 sm:py-12 px-4 bg-muted/30">
          <div className="container-page">
            <h2 className="font-display font-bold text-xl sm:text-2xl md:text-3xl text-center mb-6 sm:mb-10">
              {lp.reviews_title}
            </h2>
            <div className="max-w-5xl mx-auto">
              <AutoCarousel itemsPerView={{ base: 1, sm: 2, md: 3 }} intervalMs={4000}>
                {lp.reviews.map((r: any, i: number) => (
                  <div key={i} className="bg-card p-4 sm:p-5 rounded-xl shadow-card h-full">
                    <div className="flex gap-1 mb-2">
                      {Array.from({ length: r.rating || 5 }).map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm mb-3">"{r.text}"</p>
                    <div className="flex items-center gap-3">
                      {r.image && (
                        <img
                          src={r.image}
                          alt={r.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      )}
                      <span className="font-semibold text-sm">{r.name}</span>
                    </div>
                  </div>
                ))}
              </AutoCarousel>
            </div>
          </div>
        </section>
      )}

      {/* FAQ (optional) */}
      {lp.show_faq && (lp.faqs || []).length > 0 && (
        <section className="py-8 sm:py-12 px-4">
          <div className="container-page max-w-3xl">
            <h2 className="font-display font-bold text-xl sm:text-2xl md:text-3xl text-center mb-6">
              {lp.faq_title}
            </h2>
            <div className="space-y-3">
              {lp.faqs.map((f: any, i: number) => (
                <details key={i} className="bg-card rounded-lg shadow-card group">
                  <summary className="cursor-pointer p-4 font-semibold flex items-center justify-between text-sm sm:text-base">
                    {f.q}
                    <ChevronDown className="h-4 w-4 group-open:rotate-180 transition shrink-0 ml-2" />
                  </summary>
                  <div className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-line">
                    {f.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. ORDER FORM */}
      {lp.order_mode === "inline" && product && (
        <section id="order-form" className="py-8 sm:py-14 px-3 sm:px-4 bg-muted/30">
          <div className="container-page max-w-2xl mx-auto">
            <h2 className="font-display font-bold text-xl sm:text-2xl md:text-3xl text-center mb-2">
              {lp.final_cta_title || "এখনই অর্ডার করুন"}
            </h2>
            {lp.final_cta_subtitle && (
              <p className="text-center text-sm sm:text-base text-muted-foreground mb-6">
                {lp.final_cta_subtitle}
              </p>
            )}
            <div className="bg-card rounded-2xl shadow-card p-4 sm:p-6 space-y-4">
              <Field label="আপনার নাম *">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="ip"
                  placeholder="পূর্ণ নাম"
                />
              </Field>
              <Field label="মোবাইল নাম্বার *">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  inputMode="numeric"
                  className="ip"
                  placeholder="01XXXXXXXXX"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="জেলা *">
                  <select
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setThana("");
                    }}
                    className="ip"
                  >
                    <option value="">— সিলেক্ট করুন —</option>
                    {Object.keys(BD_LOCATIONS).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="থানা *">
                  <select
                    value={thana}
                    onChange={(e) => setThana(e.target.value)}
                    disabled={!district}
                    className="ip disabled:opacity-50"
                  >
                    <option value="">— সিলেক্ট করুন —</option>
                    {thanas.map((o: string) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="পূর্ণ ঠিকানা *">
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="ip"
                  placeholder="বাসা / রোড / এলাকা"
                />
              </Field>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  পরিমাণ
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="h-11 w-11 border rounded font-bold text-lg"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={qty}
                    min={1}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-11 w-20 text-center border rounded"
                  />
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="h-11 w-11 border rounded font-bold text-lg"
                  >
                    +
                  </button>
                </div>
              </div>
              {shippingOptions.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    ডেলিভারি
                  </label>
                  <div className="space-y-2">
                    {shippingOptions.map((s) => (
                      <label
                        key={s.id}
                        className={`flex items-center justify-between border rounded-lg p-3 cursor-pointer ${
                          selectedShipping === s.id ? "border-primary bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={selectedShipping === s.id}
                            onChange={() => setSelectedShipping(s.id)}
                          />
                          <span className="text-sm font-medium">{s.name}</span>
                        </div>
                        <span className="font-semibold">৳{s.charge}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-1 text-sm">
                <Row label={`${product.name} × ${qty}`} value={`৳${subtotal}`} />
                <Row label="ডেলিভারি চার্জ" value={`৳${shipping?.charge || 0}`} />
                <div className="border-t pt-2 mt-2">
                  <Row label="মোট" value={`৳${grandTotal}`} bold />
                </div>
              </div>

              <button
                onClick={submitOrder}
                disabled={submitting}
                style={accentStyle}
                className="w-full text-white font-bold py-4 rounded-lg text-base sm:text-lg disabled:opacity-50 hover:opacity-90 active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {submitting ? (
                  "Processing…"
                ) : (
                  <>
                    <Check className="h-5 w-5" /> অর্ডার কনফার্ম করুন (Cash On Delivery)
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Final CTA for redirect mode */}
      {lp.order_mode === "redirect" && (
        <section className="py-10 sm:py-14 px-4 bg-muted/30 text-center">
          <div className="container-page">
            <h2 className="font-display font-bold text-xl sm:text-2xl md:text-3xl mb-2">
              {lp.final_cta_title}
            </h2>
            {lp.final_cta_subtitle && (
              <p className="text-muted-foreground mb-5 text-sm sm:text-base">
                {lp.final_cta_subtitle}
              </p>
            )}
            <OrderButton />
          </div>
        </section>
      )}

      {/* MOBILE STICKY ORDER BAR */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-2xl p-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[11px] text-muted-foreground leading-tight">দাম</div>
          <div className="flex items-baseline gap-2">
            <span style={accentTextStyle} className="font-black text-lg">
              ৳{displayPrice}
            </span>
            {originalPrice && (
              <span className="text-xs text-muted-foreground line-through">৳{originalPrice}</span>
            )}
          </div>
        </div>
        <button
          onClick={handleCTA}
          style={accentStyle}
          className="flex-[1.2] text-white font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-1.5 active:scale-[0.98]"
        >
          <ShoppingBag className="h-4 w-4" />
          অর্ডার করুন
        </button>
      </div>

      <style>{`.ip{width:100%;border:1px solid hsl(var(--border));border-radius:8px;padding:10px 12px;background:hsl(var(--background));font-size:15px;min-height:44px}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-base" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
