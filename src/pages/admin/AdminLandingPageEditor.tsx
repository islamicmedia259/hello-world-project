import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Save, ExternalLink } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";

const DEFAULT: any = {
  slug: "",
  title: "",
  meta_description: "",
  description: "",
  product_id: null,
  is_active: true,
  order_mode: "inline",
  hero_headline: "",
  hero_subheadline: "",
  hero_cta_label: "এখনই অর্ডার করুন",
  hero_image_url: "",
  hero_video_url: "",
  hero_bg_color: "#ffffff",
  hero_text_color: "#0f172a",
  show_product_section: true,
  product_section_title: "প্রোডাক্ট",
  custom_price: null,
  custom_discount_price: null,
  show_features: true,
  features_title: "কেন আমরা সেরা?",
  features: [],
  show_countdown: false,
  countdown_title: "লিমিটেড অফার!",
  countdown_end_at: null,
  show_reviews: true,
  reviews_title: "কাস্টমার রিভিউ",
  reviews: [],
  show_gallery: false,
  gallery_title: "গ্যালারি",
  gallery: [],
  show_faq: true,
  faq_title: "প্রশ্নোত্তর",
  faqs: [],
  show_banners: true,
  banners_title: "অফার ব্যানার",
  banners: [],
  final_cta_title: "এখনই অর্ডার করুন!",
  final_cta_subtitle: "",
  primary_color: "#dc2626",
};

async function uploadFile(file: File): Promise<string | null> {
  const path = `landing/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file);
  if (error) { toast.error(error.message); return null; }
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

export default function AdminLandingPageEditor() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const nav = useNavigate();
  const [data, setData] = useState<any>(DEFAULT);
  const [products, setProducts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    (supabase as any).from("products").select("id,name,price,discount_price,image_url").eq("is_active", true).order("name").then(({ data }: any) => setProducts(data || []));
    if (!isNew) {
      (async () => {
        const { data: lp, error } = await (supabase as any).from("landing_pages").select("*").eq("id", id).single();
        if (error || !lp) { toast.error("Not found"); nav("/admin/landing"); return; }
        setData(lp);
        setLoading(false);
      })();
    }
  }, [id]);

  const set = (k: string, v: any) => setData((d: any) => ({ ...d, [k]: v }));

  const save = async () => {
    if (!data.title?.trim()) { toast.error("Title আবশ্যক"); return; }
    let slug = (data.slug || "").toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (!slug) {
      // auto-generate from title
      slug = data.title.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
      if (!slug) slug = `lp-${Date.now()}`;
    }
    setSaving(true);
    const payload = { ...data, slug };
    if (isNew) {
      const { data: created, error } = await (supabase as any).from("landing_pages").insert([payload]).select("id").single();
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success(`তৈরি হয়েছে! URL: /lp/${slug}`);
      nav(`/admin/landing/${created.id}/edit`);
    } else {
      const { error } = await (supabase as any).from("landing_pages").update(payload).eq("id", id);
      setSaving(false);
      if (error) return toast.error(error.message);
      setData((d: any) => ({ ...d, slug }));
      toast.success(`সেভ হয়েছে — URL: /lp/${slug}`);
    }
  };

  // Helpers for arrays
  const addItem = (key: string, item: any) => set(key, [...(data[key] || []), item]);
  const updItem = (key: string, idx: number, item: any) => set(key, (data[key] || []).map((x: any, i: number) => i === idx ? item : x));
  const delItem = (key: string, idx: number) => set(key, (data[key] || []).filter((_: any, i: number) => i !== idx));

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/admin/landing" className="p-2 hover:bg-muted rounded"><ArrowLeft className="h-4 w-4" /></Link>
          <h1 className="font-display font-bold text-2xl">{isNew ? "New Landing Page" : "Edit Landing Page"}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && data.slug && (
            <a href={`/lp/${data.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded border hover:bg-muted text-sm">
              <ExternalLink className="h-4 w-4" /> Preview
            </a>
          )}
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded font-semibold disabled:opacity-50">
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Basic */}
      <Card title="Basic Info">
        <Field label="Page Title *"><input className="ip" value={data.title} onChange={(e) => set("title", e.target.value)} placeholder="Math Book Bundle Offer" /></Field>
        <Field label="URL Slug * (e.g., math-bundle → /lp/math-bundle)"><input className="ip" value={data.slug} onChange={(e) => set("slug", e.target.value)} placeholder="math-bundle" /></Field>
        <Field label="Meta Description (SEO)"><textarea className="ip" rows={2} value={data.meta_description || ""} onChange={(e) => set("meta_description", e.target.value)} /></Field>
        <Field label="Linked Product">
          <select className="ip" value={data.product_id || ""} onChange={(e) => set("product_id", e.target.value || null)}>
            <option value="">— None —</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Order Mode">
          <select className="ip" value={data.order_mode} onChange={(e) => set("order_mode", e.target.value)}>
            <option value="inline">Inline Form (পেজেই অর্ডার ফর্ম)</option>
            <option value="redirect">Redirect to Checkout</option>
          </select>
        </Field>
        <Field label="Theme Color"><input type="color" className="h-10 w-20 rounded" value={data.primary_color} onChange={(e) => set("primary_color", e.target.value)} /></Field>
        <label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={data.is_active} onChange={(e) => set("is_active", e.target.checked)} /> Active</label>
      </Card>

      {/* Hero */}
      <Card title="Hero Section">
        <Field label="Headline"><input className="ip" value={data.hero_headline || ""} onChange={(e) => set("hero_headline", e.target.value)} placeholder="HSC Math এর জন্য সেরা বই" /></Field>
        <Field label="Subheadline"><textarea className="ip" rows={2} value={data.hero_subheadline || ""} onChange={(e) => set("hero_subheadline", e.target.value)} /></Field>
        <Field label="CTA Button Label"><input className="ip" value={data.hero_cta_label || ""} onChange={(e) => set("hero_cta_label", e.target.value)} /></Field>
        <Field label="Hero Image (Upload or paste URL)">
          <div className="space-y-2">
            <input className="ip" value={data.hero_image_url || ""} onChange={(e) => set("hero_image_url", e.target.value)} placeholder="https://... or upload below" />
            <FileUpload onUploaded={(url) => set("hero_image_url", url)} />
            {data.hero_image_url && <img src={data.hero_image_url} alt="" className="h-24 rounded border" />}
          </div>
        </Field>
        <Field label="Hero Video URL (optional, MP4 or YouTube embed URL)"><input className="ip" value={data.hero_video_url || ""} onChange={(e) => set("hero_video_url", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="BG Color"><input type="color" className="h-10 w-full" value={data.hero_bg_color} onChange={(e) => set("hero_bg_color", e.target.value)} /></Field>
          <Field label="Text Color"><input type="color" className="h-10 w-full" value={data.hero_text_color} onChange={(e) => set("hero_text_color", e.target.value)} /></Field>
        </div>
      </Card>

      {/* Description (বিস্তারিত) */}
      <Card title="Description (বিস্তারিত — ভিডিও ও অর্ডার বাটনের পরে দেখাবে)">
        <p className="text-xs text-muted-foreground mb-2">প্রোডাক্টের বিস্তারিত বর্ণনা, ফিচার, সুবিধা ইত্যাদি লিখুন। ছবি ও ফরম্যাটিং সাপোর্ট করে।</p>
        <RichTextEditor value={data.description || ""} onChange={(v) => set("description", v)} placeholder="প্রোডাক্টের বিস্তারিত বর্ণনা লিখুন..." />
      </Card>

      {/* Product showcase */}
      <Card title="Product Showcase" toggle={{ value: data.show_product_section, onChange: (v) => set("show_product_section", v) }}>
        <Field label="Section Title"><input className="ip" value={data.product_section_title || ""} onChange={(e) => set("product_section_title", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Custom Price (override)"><input type="number" className="ip" value={data.custom_price || ""} onChange={(e) => set("custom_price", e.target.value ? parseFloat(e.target.value) : null)} /></Field>
          <Field label="Custom Discount Price"><input type="number" className="ip" value={data.custom_discount_price || ""} onChange={(e) => set("custom_discount_price", e.target.value ? parseFloat(e.target.value) : null)} /></Field>
        </div>
      </Card>

      {/* Features */}
      <Card title="Features / Benefits" toggle={{ value: data.show_features, onChange: (v) => set("show_features", v) }}>
        <Field label="Section Title"><input className="ip" value={data.features_title} onChange={(e) => set("features_title", e.target.value)} /></Field>
        <div className="space-y-2">
          {(data.features || []).map((f: any, i: number) => (
            <div key={i} className="border rounded p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input className="ip" placeholder="Icon (emoji or lucide name)" value={f.icon || ""} onChange={(e) => updItem("features", i, { ...f, icon: e.target.value })} />
                <input className="ip" placeholder="Title" value={f.title || ""} onChange={(e) => updItem("features", i, { ...f, title: e.target.value })} />
              </div>
              <textarea className="ip" rows={2} placeholder="Description" value={f.description || ""} onChange={(e) => updItem("features", i, { ...f, description: e.target.value })} />
              <button onClick={() => delItem("features", i)} className="text-rose-600 text-xs flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remove</button>
            </div>
          ))}
          <button onClick={() => addItem("features", { icon: "✨", title: "", description: "" })} className="flex items-center gap-1 text-sm text-primary"><Plus className="h-4 w-4" /> Add Feature</button>
        </div>
      </Card>

      {/* Countdown */}
      <Card title="Countdown Timer" toggle={{ value: data.show_countdown, onChange: (v) => set("show_countdown", v) }}>
        <Field label="Title"><input className="ip" value={data.countdown_title} onChange={(e) => set("countdown_title", e.target.value)} /></Field>
        <Field label="End At"><input type="datetime-local" className="ip" value={data.countdown_end_at ? new Date(data.countdown_end_at).toISOString().slice(0, 16) : ""} onChange={(e) => set("countdown_end_at", e.target.value ? new Date(e.target.value).toISOString() : null)} /></Field>
      </Card>

      {/* Reviews */}
      <Card title="Reviews / Testimonials" toggle={{ value: data.show_reviews, onChange: (v) => set("show_reviews", v) }}>
        <Field label="Section Title"><input className="ip" value={data.reviews_title} onChange={(e) => set("reviews_title", e.target.value)} /></Field>
        <div className="space-y-2">
          {(data.reviews || []).map((r: any, i: number) => (
            <div key={i} className="border rounded p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input className="ip" placeholder="Name" value={r.name || ""} onChange={(e) => updItem("reviews", i, { ...r, name: e.target.value })} />
                <input type="number" min={1} max={5} className="ip" placeholder="Rating 1-5" value={r.rating || 5} onChange={(e) => updItem("reviews", i, { ...r, rating: parseInt(e.target.value) })} />
              </div>
              <input className="ip" placeholder="Image URL (optional)" value={r.image || ""} onChange={(e) => updItem("reviews", i, { ...r, image: e.target.value })} />
              <textarea className="ip" rows={2} placeholder="Review text" value={r.text || ""} onChange={(e) => updItem("reviews", i, { ...r, text: e.target.value })} />
              <button onClick={() => delItem("reviews", i)} className="text-rose-600 text-xs flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remove</button>
            </div>
          ))}
          <button onClick={() => addItem("reviews", { name: "", rating: 5, text: "", image: "" })} className="flex items-center gap-1 text-sm text-primary"><Plus className="h-4 w-4" /> Add Review</button>
        </div>
      </Card>

      {/* Banners */}
      <Card title="Banners (ক্লিক করলে অর্ডার ফর্মে)" toggle={{ value: data.show_banners, onChange: (v) => set("show_banners", v) }}>
        <Field label="Section Title"><input className="ip" value={data.banners_title || ""} onChange={(e) => set("banners_title", e.target.value)} /></Field>
        <div className="space-y-3">
          {(data.banners || []).map((b: any, i: number) => (
            <div key={i} className="border rounded p-3 space-y-2">
              <div className="flex gap-3 items-start">
                {b.image_url && <img src={b.image_url} alt="" className="h-20 w-32 object-cover rounded border" />}
                <div className="flex-1 space-y-2">
                  <input className="ip" placeholder="Image URL" value={b.image_url || ""} onChange={(e) => updItem("banners", i, { ...b, image_url: e.target.value })} />
                  <FileUpload onUploaded={(url) => updItem("banners", i, { ...b, image_url: url })} />
                </div>
              </div>
              <input className="ip" placeholder="Caption (optional)" value={b.caption || ""} onChange={(e) => updItem("banners", i, { ...b, caption: e.target.value })} />
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={!!b.click_to_order} onChange={(e) => updItem("banners", i, { ...b, click_to_order: e.target.checked, link_url: e.target.checked ? "" : b.link_url })} />
                  ক্লিক করলে অর্ডার ফর্মে নিয়ে যাবে
                </label>
                {!b.click_to_order && (
                  <input className="ip flex-1 min-w-[200px]" placeholder="Custom link URL (optional)" value={b.link_url || ""} onChange={(e) => updItem("banners", i, { ...b, link_url: e.target.value })} />
                )}
              </div>
              <button onClick={() => delItem("banners", i)} className="text-rose-600 text-xs flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remove</button>
            </div>
          ))}
          <button onClick={() => addItem("banners", { image_url: "", caption: "", click_to_order: true, link_url: "" })} className="flex items-center gap-1 text-sm text-primary"><Plus className="h-4 w-4" /> Add Banner</button>
        </div>
      </Card>

      {/* Gallery */}
      <Card title="Gallery" toggle={{ value: data.show_gallery, onChange: (v) => set("show_gallery", v) }}>
        <Field label="Section Title"><input className="ip" value={data.gallery_title} onChange={(e) => set("gallery_title", e.target.value)} /></Field>
        <div className="space-y-2">
          {(data.gallery || []).map((url: string, i: number) => (
            <div key={i} className="flex gap-2 items-center">
              <input className="ip flex-1" placeholder="Image URL" value={url} onChange={(e) => updItem("gallery", i, e.target.value)} />
              {url && <img src={url} alt="" className="h-10 w-10 object-cover rounded border" />}
              <button onClick={() => delItem("gallery", i)} className="text-rose-600 px-2"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <FileUpload onUploaded={(url) => addItem("gallery", url)} label="Upload & add image" />
          <button onClick={() => addItem("gallery", "")} className="flex items-center gap-1 text-sm text-primary"><Plus className="h-4 w-4" /> Add URL field</button>
        </div>
      </Card>

      {/* FAQ */}
      <Card title="FAQ" toggle={{ value: data.show_faq, onChange: (v) => set("show_faq", v) }}>
        <Field label="Section Title"><input className="ip" value={data.faq_title} onChange={(e) => set("faq_title", e.target.value)} /></Field>
        <div className="space-y-2">
          {(data.faqs || []).map((f: any, i: number) => (
            <div key={i} className="border rounded p-3 space-y-2">
              <input className="ip" placeholder="Question" value={f.q || ""} onChange={(e) => updItem("faqs", i, { ...f, q: e.target.value })} />
              <textarea className="ip" rows={2} placeholder="Answer" value={f.a || ""} onChange={(e) => updItem("faqs", i, { ...f, a: e.target.value })} />
              <button onClick={() => delItem("faqs", i)} className="text-rose-600 text-xs flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remove</button>
            </div>
          ))}
          <button onClick={() => addItem("faqs", { q: "", a: "" })} className="flex items-center gap-1 text-sm text-primary"><Plus className="h-4 w-4" /> Add FAQ</button>
        </div>
      </Card>

      {/* Final CTA */}
      <Card title="Final CTA">
        <Field label="Title"><input className="ip" value={data.final_cta_title || ""} onChange={(e) => set("final_cta_title", e.target.value)} /></Field>
        <Field label="Subtitle"><input className="ip" value={data.final_cta_subtitle || ""} onChange={(e) => set("final_cta_subtitle", e.target.value)} /></Field>
      </Card>

      <div className="flex justify-end pb-8">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded font-semibold disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Landing Page"}
        </button>
      </div>

      <style>{`.ip{width:100%;border:1px solid hsl(var(--border));border-radius:6px;padding:8px 10px;background:hsl(var(--background));font-size:14px}`}</style>
    </div>
  );
}

function Card({ title, children, toggle }: { title: string; children: React.ReactNode; toggle?: { value: boolean; onChange: (v: boolean) => void } }) {
  return (
    <div className="bg-card rounded-xl shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-lg">{title}</h2>
        {toggle && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={toggle.value} onChange={(e) => toggle.onChange(e.target.checked)} />
            Show
          </label>
        )}
      </div>
      {(!toggle || toggle.value) && <div className="space-y-3">{children}</div>}
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

function FileUpload({ onUploaded, label = "Upload image" }: { onUploaded: (url: string) => void; label?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className={`inline-flex items-center gap-2 px-3 py-2 text-xs border rounded cursor-pointer hover:bg-muted ${busy ? "opacity-50 pointer-events-none" : ""}`}>
      <Plus className="h-3 w-3" /> {busy ? "Uploading…" : label}
      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setBusy(true);
        const url = await uploadFile(f);
        setBusy(false);
        if (url) onUploaded(url);
        e.target.value = "";
      }} />
    </label>
  );
}
