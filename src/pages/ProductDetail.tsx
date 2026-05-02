import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/context/CartContext";
import { Minus, Plus, ShoppingCart, MessageCircle, Phone, FileText, Play, X, ArrowRight, Video as VideoIcon } from "lucide-react";
import { trackViewContent } from "@/lib/tracking";
import { toast } from "sonner";
import bookMath from "@/assets/book-math.jpg";
import ProductCard, { Product } from "@/components/ProductCard";

interface Variant {
  id: string;
  color_id: string | null;
  size_id: string | null;
  model_id: string | null;
  price: number | null;
  discount_price: number | null;
  image_url: string | null;
  stock: number;
  is_active: boolean;
  shipping_charges?: string[];
}

interface FullProduct {
  id: string; name: string; description: string | null;
  short_description: string | null;
  sku: string | null;
  price: number; discount_price: number | null;
  image_url: string | null; gallery: string[]; stock: number;
  brand_id: string | null; model_id: string | null;
  video_url: string | null; video_type: string | null;
  gallery_video_url: string | null;
  demo_url: string | null; demo_type: string | null;
  category_id: string | null;
  review_images?: string[] | null;
  review_slide_speed?: number | null;
}

interface Lookup { id: string; name: string; hex_code?: string }

export default function ProductDetail() {
  const { id } = useParams();
  const { addItem } = useCart();
  const [p, setP] = useState<FullProduct | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [colors, setColors] = useState<Lookup[]>([]);
  const [sizes, setSizes] = useState<Lookup[]>([]);
  const [models, setModels] = useState<Lookup[]>([]);
  const [brand, setBrand] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [productShipping, setProductShipping] = useState<string[]>([]);
  const [shippingOptions, setShippingOptions] = useState<{ id: string; name: string; charge: number }[]>([]);

  const [selColor, setSelColor] = useState<string | null>(null);
  const [selSize, setSelSize] = useState<string | null>(null);
  const [selModel, setSelModel] = useState<string | null>(null);
  const [activeImg, setActiveImg] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [qty, setQty] = useState(1);

  // shake refs for invalid fields
  const [shakeKey, setShakeKey] = useState<string | null>(null);

  // site settings (contact buttons)
  const [site, setSite] = useState<{ whatsapp_number?: string; contact_phone?: string; messenger_url?: string } | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    supabase.from("site_settings").select("whatsapp_number, contact_phone, messenger_url").maybeSingle()
      .then(({ data }) => setSite((data as any) || {}));
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: prod } = await supabase
        .from("products")
        .select("*, product_colors(color_id, colors(id,name,hex_code)), product_sizes(size_id, sizes(id,name)), product_models(model_id, models(id,name)), product_shipping_charges(shipping_charge_id), product_variants(*, variant_shipping_charges(shipping_charge_id)), brands(name), categories(name,slug)")
        .eq("id", id).maybeSingle();
      if (!prod) return;
      setP(prod as any);
      document.title = `${prod.name} | Navigator Series Book`;
      setActiveImg(prod.image_url || null);
      if ((prod as any).gallery_video_url) setShowVideo(true);
      // Pixel: ViewContent
      trackViewContent({
        id: (prod as any).id,
        name: (prod as any).name,
        price: (prod as any).discount_price || (prod as any).price,
      });
      const vs = ((prod.product_variants || []) as any[]).map((v) => ({
        ...v,
        shipping_charges: (v.variant_shipping_charges || []).map((s: any) => s.shipping_charge_id),
      }));
      setVariants(vs as Variant[]);
      setColors(((prod.product_colors as any[]) || []).map((c) => c.colors).filter(Boolean));
      setSizes(((prod.product_sizes as any[]) || []).map((s) => s.sizes).filter(Boolean));
      setModels((((prod as any).product_models as any[]) || []).map((m: any) => m.models).filter(Boolean));
      setProductShipping((((prod as any).product_shipping_charges as any[]) || []).map((s: any) => s.shipping_charge_id));
      setBrand((prod.brands as any)?.name || null);
      setCategory((prod.categories as any)?.name || null);
      setCategorySlug((prod.categories as any)?.slug || null);

      // load all active shipping options for name/charge lookup
      const { data: ships } = await supabase.from("shipping_charges").select("id,name,charge").eq("is_active", true).order("sort_order");
      setShippingOptions((ships as any) || []);

      // related products from the same category
      if ((prod as any).category_id) {
        const { data: rel } = await supabase
          .from("products")
          .select("id,name,price,discount_price,image_url,category_id")
          .eq("is_active", true)
          .eq("category_id", (prod as any).category_id)
          .neq("id", prod.id)
          .order("created_at", { ascending: false })
          .limit(10);
        setRelated((rel as Product[]) || []);
      } else {
        setRelated([]);
      }
    })();
  }, [id]);

  // which attributes are required (admin defined them)
  const needsColor = colors.length > 0;
  const needsSize = sizes.length > 0;
  const needsModel = models.length > 0;

  // find best matching variant
  const matched = useMemo(() => {
    if (!variants.length) return null;
    return variants.find((v) =>
      (!needsColor || v.color_id === selColor) &&
      (!needsSize || v.size_id === selSize) &&
      (!needsModel || v.model_id === selModel)
    ) || null;
  }, [variants, selColor, selSize, selModel, needsColor, needsSize, needsModel]);

  // partial match — when only color or only model selected, show its image/price
  const partial = useMemo(() => {
    if (!variants.length) return null;
    const candidates = variants.filter((v) =>
      (!selColor || v.color_id === selColor) &&
      (!selSize || v.size_id === selSize) &&
      (!selModel || v.model_id === selModel)
    );
    return candidates[0] || null;
  }, [variants, selColor, selSize, selModel]);

  // dynamic image
  useEffect(() => {
    const v = matched || partial;
    if (v?.image_url) setActiveImg(v.image_url);
    else if (p?.image_url) setActiveImg(p.image_url);
  }, [matched, partial, p]);

  if (!p) return <div className="container-page py-20 text-center text-muted-foreground">Loading...</div>;

  // pick effective price
  const v = matched || partial;
  const basePrice = v?.price ?? p.price;
  const baseDisc = v?.discount_price ?? p.discount_price;
  const effective = baseDisc ?? basePrice;
  const hasDisc = baseDisc != null && baseDisc < basePrice;
  const pct = hasDisc ? Math.round(((basePrice - baseDisc!) / basePrice) * 100) : 0;
  const stock = matched ? matched.stock : p.stock;
  const img = activeImg || p.image_url || bookMath;
  const gallery = [p.image_url, ...(p.gallery || []), ...variants.map((v) => v.image_url)].filter(Boolean) as string[];
  const uniqueGallery = Array.from(new Set(gallery));

  const triggerShake = (k: string) => { setShakeKey(k); setTimeout(() => setShakeKey(null), 600); };

  const validate = () => {
    if (needsColor && !selColor) {
      toast.error("অনুগ্রহ করে Color সিলেক্ট করুন", { description: `${colors.length}টি কালার থেকে একটি বাছাই করুন` });
      triggerShake("color"); return false;
    }
    if (needsSize && !selSize) {
      toast.error("অনুগ্রহ করে Size সিলেক্ট করুন", { description: `${sizes.length}টি সাইজ থেকে একটি বাছাই করুন` });
      triggerShake("size"); return false;
    }
    if (needsModel && !selModel) {
      toast.error("অনুগ্রহ করে Model সিলেক্ট করুন", { description: `${models.length}টি মডেল থেকে একটি বাছাই করুন` });
      triggerShake("model"); return false;
    }
    if (variants.length && !matched) {
      toast.error("এই কম্বিনেশন এভেইলেবল নয়", { description: "অন্য একটি কম্বিনেশন বাছাই করুন" });
      return false;
    }
    if (stock <= 0) { toast.error("Out of stock"); return false; }
    return true;
  };

  const buildName = () => {
    const parts = [p.name];
    if (selColor) parts.push(colors.find((c) => c.id === selColor)?.name || "");
    if (selSize) parts.push(sizes.find((s) => s.id === selSize)?.name || "");
    if (selModel) parts.push(models.find((m) => m.id === selModel)?.name || "");
    return parts.filter(Boolean).join(" • ");
  };

  // Effective shipping options for current selection: variant-level overrides product-level if set
  const effectiveShipping: string[] = (() => {
    if (matched && matched.shipping_charges && matched.shipping_charges.length) return matched.shipping_charges;
    return productShipping;
  })();

  const handleAdd = (opts?: { openSidebar?: boolean; silent?: boolean }) => {
    if (!validate()) return false;
    const itemId = matched ? `${p.id}::${matched.id}` : p.id;
    addItem(
      { id: itemId, name: buildName(), price: effective, image_url: img, shipping_options: effectiveShipping },
      qty,
      { openSidebar: opts?.openSidebar ?? true }
    );
    if (!opts?.silent) toast.success("কার্টে যোগ হয়েছে", { description: buildName() });
    return true;
  };

  return (
    <div className="container-page py-6">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground mb-4">
        <Link to="/" className="hover:text-primary">Home</Link>
        {category && <> / <span>{category}</span></>}
        {" / "}<span className="text-foreground font-medium">{p.name}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Left: image + gallery */}
        <div className="space-y-3">
          <div className="relative bg-secondary/40 rounded-xl overflow-hidden aspect-square flex items-center justify-center border">
            {hasDisc && !showVideo && (
              <span className="absolute top-3 right-3 z-10 bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow">
                {pct}% ছাড়
              </span>
            )}
            {showVideo && p.gallery_video_url ? (
              <VideoEmbed url={p.gallery_video_url} type="youtube" autoPlay />
            ) : (
              <img src={img} alt={p.name} className="w-full h-full object-contain transition-all duration-300" />
            )}
          </div>
          {(uniqueGallery.length > 1 || p.gallery_video_url) && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {p.gallery_video_url && (
                <button
                  onClick={() => setShowVideo(true)}
                  className={`relative shrink-0 h-20 w-20 rounded-lg overflow-hidden border-2 transition bg-black flex items-center justify-center ${showVideo ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-muted-foreground"}`}
                  aria-label="ভিডিও দেখুন"
                >
                  <img src={p.image_url || bookMath} alt="" className="w-full h-full object-cover opacity-60" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-white/90 text-primary rounded-full p-2 shadow">
                      <Play className="h-4 w-4 fill-current" />
                    </span>
                  </span>
                </button>
              )}
              {uniqueGallery.map((u, i) => (
                <button key={i} onClick={() => { setActiveImg(u); setShowVideo(false); }}
                  className={`shrink-0 h-20 w-20 rounded-lg overflow-hidden border-2 transition ${!showVideo && activeImg === u ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-muted-foreground"}`}>
                  <img src={u} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: details */}
        <div className="space-y-4">
          <h1 className="font-display font-bold text-2xl md:text-3xl">{p.name}</h1>

          <div className="flex items-baseline gap-3">
            {hasDisc && <span className="text-muted-foreground line-through text-lg">৳{basePrice}</span>}
            <span className="text-3xl font-bold text-primary">৳{effective}</span>
          </div>

          {p.sku && (
            <div className="inline-block">
              <span className="bg-orange-500 text-white text-sm font-semibold px-4 py-1.5 rounded-r-md rounded-l-sm relative" style={{ clipPath: "polygon(0 0, 100% 0, 95% 50%, 100% 100%, 0 100%)" }}>
                প্রোডাক্ট কোড : {p.sku}
              </span>
            </div>
          )}

          {/* Color */}
          {needsColor && (
            <div className={`${shakeKey === "color" ? "animate-shake" : ""}`}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-sm min-w-[60px]">Color :</span>
                {colors.map((c) => (
                  <button key={c.id} onClick={() => setSelColor(c.id === selColor ? null : c.id)}
                    title={c.name}
                    className={`relative h-9 w-9 rounded-full border-2 transition ${selColor === c.id ? "border-primary ring-2 ring-primary/30 scale-110" : "border-border hover:border-muted-foreground"}`}
                    style={{ background: c.hex_code || "#ddd" }}>
                    {selColor === c.id && <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold drop-shadow">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size */}
          {needsSize && (
            <div className={`${shakeKey === "size" ? "animate-shake" : ""}`}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-sm min-w-[60px]">Size :</span>
                {sizes.map((s) => (
                  <button key={s.id} onClick={() => setSelSize(s.id === selSize ? null : s.id)}
                    className={`min-w-[44px] h-10 px-3 rounded-md border-2 text-sm font-medium transition ${selSize === s.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-muted-foreground"}`}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Model */}
          {needsModel && (
            <div className={`${shakeKey === "model" ? "animate-shake" : ""}`}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-sm min-w-[60px]">Model :</span>
                {models.map((m) => (
                  <button key={m.id} onClick={() => setSelModel(m.id === selModel ? null : m.id)}
                    className={`min-w-[44px] h-10 px-3 rounded-md border-2 text-sm font-medium transition ${selModel === m.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-muted-foreground"}`}>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {brand && (
            <div className="text-sm space-y-1 pt-1">
              <div><span className="font-semibold">Brand :</span> {brand}</div>
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center gap-3">
            <div className="flex items-center border-2 rounded-md">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2.5 hover:bg-secondary"><Minus className="h-4 w-4" /></button>
              <span className="w-12 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)} className="p-2.5 hover:bg-secondary"><Plus className="h-4 w-4" /></button>
            </div>
          </div>

          {/* Available delivery / shipping options */}
          {effectiveShipping.length > 0 && (
            <div className="hidden md:block bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="text-xs font-semibold text-emerald-800 mb-2">ডেলিভারি অপশন</div>
              <div className="flex flex-wrap gap-2">
                {shippingOptions
                  .filter((s) => effectiveShipping.includes(s.id))
                  .map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1.5 bg-white border border-emerald-300 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      {s.name}
                      <span className="font-bold">৳{s.charge}</span>
                    </span>
                  ))}
              </div>
              <p className="text-[11px] text-emerald-700 mt-2">চেকআউটে আপনি পছন্দমত একটি বেছে নিতে পারবেন।</p>
            </div>
          )}

          {/* CTAs */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => handleAdd({ openSidebar: false })}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-md transition-smooth flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
              <ShoppingCart className="h-5 w-5" /> কার্টে যোগ করুন
            </button>
            <Link to="/checkout" onClick={(e) => {
              const ok = handleAdd({ openSidebar: false, silent: true });
              if (!ok) e.preventDefault();
            }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 rounded-md transition-smooth text-center flex items-center justify-center shadow-md hover:shadow-lg">
              অর্ডার করুন
            </Link>
          </div>

          {site?.contact_phone && (
            <a href={`tel:${site.contact_phone}`} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-md transition-smooth flex items-center justify-center gap-2">
              <Phone className="h-5 w-5" /> {site.contact_phone}
            </a>
          )}
          {site?.whatsapp_number && (
            <a href={`https://wa.me/${site.whatsapp_number.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer" className="bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-md transition-smooth flex items-center justify-center gap-2">
              <MessageCircle className="h-5 w-5" /> WhatsApp এ অর্ডার করুন
            </a>
          )}
          {site?.messenger_url && (
            <a href={site.messenger_url} target="_blank" rel="noreferrer" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3.5 rounded-md transition-smooth flex items-center justify-center gap-2">
              <MessageCircle className="h-5 w-5" /> মেসেঞ্জারে অর্ডার করুন
            </a>
          )}
          {p.demo_url && (
            <button onClick={() => setShowDemo(true)} className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3.5 rounded-md transition-smooth flex items-center justify-center gap-2 w-full">
              <FileText className="h-5 w-5" /> ডেমো দেখুন
            </button>
          )}
        </div>
      </div>

      {/* Description + Video */}
      {(p.description || p.video_url) && (
        <div className="grid md:grid-cols-3 gap-6 mt-12 items-start">
           {p.description && (
             <div className="md:col-span-2 bg-secondary/40 rounded-xl p-5 min-w-0 overflow-hidden order-2 md:order-1">
               <h3 className="font-display font-bold text-lg mb-3">বিস্তারিত</h3>
               <div
                 className="prose-product text-sm break-words [overflow-wrap:anywhere] max-w-full"
                 dangerouslySetInnerHTML={{ __html: p.description }}
               />
             </div>
           )}
          {p.video_url && (
            <div className="bg-secondary/40 rounded-xl p-5 self-start order-1 md:order-2">
              <h3 className="font-display font-bold text-lg mb-3">ভিডিও</h3>
              <VideoEmbed url={p.video_url} type={p.video_type} />
            </div>
          )}
        </div>
      )}

      {/* Customer Review Screenshots Slider */}
      {Array.isArray((p as any).review_images) && (p as any).review_images.length > 0 && (
        <ReviewSlider
          images={(p as any).review_images}
          speed={(p as any).review_slide_speed || 3000}
        />
      )}

      {/* Demo viewer modal — view only, download disabled */}
      {showDemo && p.demo_url && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowDemo(false)}>
          <div className="bg-background rounded-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold">ডেমো প্রিভিউ — {p.name}</h3>
              <button onClick={() => setShowDemo(false)} className="p-2 hover:bg-secondary rounded-md" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
             <div className="flex-1 relative bg-secondary/30" onContextMenu={(e) => e.preventDefault()}>
               <iframe
                 src={buildDemoSrc(p.demo_url)}
                 title="Product Demo"
                 className="w-full h-full border-0"
                 allow="autoplay"
               />
               {/* invisible overlay strip on top to hide most browser PDF download bars */}
               <div className="absolute top-0 left-0 right-0 h-10 bg-transparent pointer-events-none" />
             </div>
            <div className="px-4 py-2 text-xs text-muted-foreground border-t text-center">
              এই ডেমো শুধুমাত্র দেখার জন্য — ডাউনলোড করা যাবে না
            </div>
          </div>
        </div>
      )}

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between border-b pb-3 mb-5">
            <h2 className="font-display font-bold text-xl">Related Products</h2>
            <Link
              to={categorySlug ? `/shop?cat=${categorySlug}` : "/shop"}
              className="text-sm text-primary font-semibold hover:underline flex items-center gap-1"
            >
              More Products <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {related.slice(0, 5).map((rp) => (
              <ProductCard key={rp.id} p={{ ...rp, image_url: rp.image_url || bookMath }} />
            ))}
          </div>
        </section>
      )}

      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}

function buildDemoSrc(url: string): string {
  // Google Drive: https://drive.google.com/file/d/{ID}/view  →  /preview
  const drive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  // Google Drive open?id=
  const driveOpen = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (driveOpen) return `https://drive.google.com/file/d/${driveOpen[1]}/preview`;
  // Google Docs/Sheets/Slides → /preview
  const gdoc = url.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([^/]+)/);
  if (gdoc) return `https://docs.google.com/${gdoc[1]}/d/${gdoc[2]}/preview`;
  // PDF or other — keep PDF viewer params
  return `${url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`;
}

function ReviewSlider({ images, speed }: { images: string[]; speed: number }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [perView, setPerView] = useState(5);
  const safeSpeed = Math.max(800, Number(speed) || 3000);

  // Responsive items per view: 2 (mobile), 3 (sm), 4 (md), 5 (lg+)
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w >= 1024) setPerView(5);
      else if (w >= 768) setPerView(4);
      else if (w >= 640) setPerView(3);
      else setPerView(2);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const maxIdx = Math.max(0, images.length - perView);

  useEffect(() => {
    if (idx > maxIdx) setIdx(maxIdx);
  }, [maxIdx, idx]);

  useEffect(() => {
    if (paused || images.length <= perView) return;
    const t = setInterval(() => setIdx((i) => (i >= maxIdx ? 0 : i + 1)), safeSpeed);
    return () => clearInterval(t);
  }, [paused, images.length, safeSpeed, maxIdx, perView]);

  if (!images.length) return null;
  const prev = () => setIdx((i) => (i <= 0 ? maxIdx : i - 1));
  const next = () => setIdx((i) => (i >= maxIdx ? 0 : i + 1));
  const showNav = images.length > perView;

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between border-b pb-3 mb-5">
        <h2 className="font-display font-bold text-xl">কাস্টমার রিভিউ</h2>
        <span className="text-xs text-muted-foreground">{images.length} টি রিভিউ</span>
      </div>
      <div
        className="relative bg-secondary/40 rounded-xl p-3 sm:p-4"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${idx * (100 / perView)}%)` }}
          >
            {images.map((src, i) => (
              <div
                key={i}
                className="shrink-0 px-1.5 sm:px-2"
                style={{ width: `${100 / perView}%` }}
              >
                <button
                  type="button"
                  onClick={() => setLightbox(src)}
                  className="block w-full aspect-[3/4] bg-background rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow cursor-zoom-in"
                >
                  <img
                    src={src}
                    alt={`Review ${i + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
        {showNav && (
          <>
            <button onClick={prev} aria-label="Previous"
              className="absolute left-1 sm:-left-3 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white shadow-lg rounded-full h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center text-lg z-10">
              ‹
            </button>
            <button onClick={next} aria-label="Next"
              className="absolute right-1 sm:-right-3 top-1/2 -translate-y-1/2 bg-white/95 hover:bg-white shadow-lg rounded-full h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center text-lg z-10">
              ›
            </button>
          </>
        )}
      </div>
      {showNav && (
        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: maxIdx + 1 }).map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40"}`}
            />
          ))}
        </div>
      )}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Review" className="max-h-[92vh] max-w-[92vw] object-contain rounded-lg shadow-2xl" />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full">
            <X className="h-6 w-6" />
          </button>
        </div>
      )}
    </section>
  );
}

function VideoEmbed({ url, type, autoPlay }: { url: string; type: string | null; autoPlay?: boolean }) {
  if (type === "youtube") {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
    const vid = m?.[1];
    if (vid) {
      const params = autoPlay ? `?autoplay=1&mute=1&playsinline=1` : "";
      return <iframe className="w-full h-full aspect-video rounded" src={`https://www.youtube.com/embed/${vid}${params}`} allow="autoplay; encrypted-media" allowFullScreen />;
    }
  }
  if (type === "facebook") {
    return <iframe className="w-full h-full aspect-video rounded" src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}${autoPlay ? "&autoplay=1&mute=1" : ""}`} allow="autoplay; encrypted-media" allowFullScreen />;
  }
  if (type === "upload") {
    return (
      <video
        src={url}
        controls
        autoPlay={autoPlay}
        muted={autoPlay}
        playsInline
        className="w-full h-full rounded object-contain bg-black"
      />
    );
  }
  return <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-2"><Play className="h-4 w-4" /> ভিডিও দেখুন</a>;
}
