import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, ThumbsUp, ThumbsDown, Search as SearchIcon, Upload, Video, FileText, Link as LinkIcon, ImagePlus } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";

interface Lookup { id: string; name: string; }

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [cats, setCats] = useState<Lookup[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [childs, setChilds] = useState<any[]>([]);
  const [brands, setBrands] = useState<Lookup[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [sizes, setSizes] = useState<Lookup[]>([]);
  const [shippings, setShippings] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [demoFile, setDemoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const [variantImageFiles, setVariantImageFiles] = useState<Record<string, File>>({});
  const [reviewFiles, setReviewFiles] = useState<File[]>([]);

  const load = async () => {
    const [{ data: ps }, { data: cs }, { data: sc }, { data: cc }, { data: bs }, { data: ms }, { data: cl }, { data: sz }, { data: sh }] = await Promise.all([
      supabase.from("products").select("*, product_colors(color_id), product_sizes(size_id), product_models(model_id), product_shipping_charges(shipping_charge_id), product_variants(*, variant_shipping_charges(shipping_charge_id))").order("created_at", { ascending: false }),
      supabase.from("categories").select("id,name").order("name"),
      supabase.from("subcategories").select("id,name,category_id").order("name"),
      supabase.from("childcategories").select("id,name,subcategory_id").order("name"),
      supabase.from("brands").select("id,name").order("name"),
      supabase.from("models").select("id,name").order("name"),
      supabase.from("colors").select("id,name,hex_code").order("name"),
      supabase.from("sizes").select("id,name").order("sort_order"),
      supabase.from("shipping_charges").select("id,name,charge").eq("is_active", true).order("sort_order"),
    ]);
    setProducts(ps || []); setCats(cs || []); setSubs(sc || []); setChilds(cc || []);
    setBrands(bs || []); setModels(ms || []); setColors(cl || []); setSizes(sz || []); setShippings(sh || []);
  };
  useEffect(() => { document.title = "Product Manage | Admin"; load(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const s = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s));
  }, [products, search]);

  const allChecked = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const toggleAll = () => {
    const ns = new Set(selected);
    if (allChecked) filtered.forEach((p) => ns.delete(p.id)); else filtered.forEach((p) => ns.add(p.id));
    setSelected(ns);
  };
  const toggleOne = (id: string) => { const ns = new Set(selected); ns.has(id) ? ns.delete(id) : ns.add(id); setSelected(ns); };

  const requireSel = () => { if (selected.size === 0) { toast.error("Select products"); return false; } return true; };

  const bulkUpdate = async (patch: any, label: string) => {
    if (!requireSel()) return;
    const { error } = await supabase.from("products").update(patch).in("id", Array.from(selected));
    if (error) toast.error(error.message); else { toast.success(`${label} applied to ${selected.size}`); load(); }
  };

  const openNew = () => {
    setGalleryFiles([]); setVideoFile(null); setDemoFile(null); setFile(null); setVariantImageFiles({}); setReviewFiles([]);
    setEditing({
      name: "", description: "", short_description: "", sku: "", price: 0, discount_price: null,
      stock: 0, is_active: true, is_hot_deal: false, is_top_feature: false, is_deal: false,
      category_id: "", subcategory_id: "", childcategory_id: "", brand_id: "",
      image_url: "", gallery: [] as string[],
      video_url: "", video_type: "none",
      gallery_video_url: "",
      demo_url: "", demo_type: "none",
      review_images: [] as string[], review_slide_speed: 3000,
      colors: [] as string[], sizes: [] as string[], models: [] as string[],
      shipping_charges: [] as string[],
      variants: [] as any[],
    });
  };

  const openEdit = (p: any) => {
    setGalleryFiles([]); setVideoFile(null); setDemoFile(null); setFile(null); setVariantImageFiles({}); setReviewFiles([]);
    setEditing({
      ...p,
      gallery: Array.isArray(p.gallery) ? p.gallery : [],
      review_images: Array.isArray(p.review_images) ? p.review_images : [],
      review_slide_speed: p.review_slide_speed || 3000,
      video_url: p.video_url || "", video_type: p.video_type || "none",
      gallery_video_url: p.gallery_video_url || "",
      demo_url: p.demo_url || "", demo_type: p.demo_type || "none",
      colors: (p.product_colors || []).map((c: any) => c.color_id),
      sizes: (p.product_sizes || []).map((s: any) => s.size_id),
      models: (p.product_models || []).map((m: any) => m.model_id),
      shipping_charges: (p.product_shipping_charges || []).map((s: any) => s.shipping_charge_id),
      variants: (p.product_variants || []).map((v: any) => ({
        ...v,
        _key: v.id,
        shipping_charges: (v.variant_shipping_charges || []).map((s: any) => s.shipping_charge_id),
      })),
    });
  };

  const uploadTo = async (bucket: string, f: File, prefix: string) => {
    const path = `${prefix}/${Date.now()}-${f.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from(bucket).upload(path, f);
    if (error) throw error;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let image_url = editing.image_url || null;
      if (file) image_url = await uploadTo("product-images", file, "products");

      // Upload gallery images
      let gallery: string[] = Array.isArray(editing.gallery) ? [...editing.gallery] : [];
      for (const gf of galleryFiles) {
        const url = await uploadTo("product-images", gf, "gallery");
        gallery.push(url);
      }

      // Video
      let video_url = editing.video_url || null;
      let video_type = editing.video_type || "none";
      if (video_type === "upload" && videoFile) {
        video_url = await uploadTo("product-videos", videoFile, "videos");
      }
      if (video_type === "none") { video_url = null; }

      // Demo
      let demo_url = editing.demo_url || null;
      let demo_type = editing.demo_type || "none";
      if (demo_type === "pdf" && demoFile) {
        demo_url = await uploadTo("product-demos", demoFile, "demos");
      }
      if (demo_type === "none") { demo_url = null; }

      // Review screenshots
      let review_images: string[] = Array.isArray(editing.review_images) ? [...editing.review_images] : [];
      for (const rf of reviewFiles) {
        const url = await uploadTo("product-images", rf, "reviews");
        review_images.push(url);
      }

      const { colors: selColors, sizes: selSizes, models: selModels, shipping_charges: selShipping, variants: selVariants, product_colors, product_sizes, product_models, product_shipping_charges, product_variants, ...rest } = editing;
      const payload: any = {
        ...rest, image_url, gallery, video_url, video_type, demo_url, demo_type,
        gallery_video_url: rest.gallery_video_url || null,
        review_images,
        review_slide_speed: Number(rest.review_slide_speed) || 3000,
        price: Number(rest.price),
        discount_price: rest.discount_price ? Number(rest.discount_price) : null,
        stock: Number(rest.stock),
      };
      // model_id column on products is deprecated (moved to product_models join table)
      delete payload.model_id;
      Object.keys(payload).forEach((k) => payload[k] === "" && (payload[k] = null));

      let id = editing.id;
      if (id) {
        const { error } = await supabase.from("products").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        delete payload.id; delete payload.created_at; delete payload.updated_at;
        const { data, error } = await supabase.from("products").insert(payload).select().single();
        if (error) throw error;
        id = data.id;
      }

      await supabase.from("product_colors").delete().eq("product_id", id);
      await supabase.from("product_sizes").delete().eq("product_id", id);
      await supabase.from("product_models").delete().eq("product_id", id);
      await supabase.from("product_shipping_charges").delete().eq("product_id", id);
      if (selColors?.length) await supabase.from("product_colors").insert(selColors.map((c: string) => ({ product_id: id, color_id: c })));
      if (selSizes?.length) await supabase.from("product_sizes").insert(selSizes.map((s: string) => ({ product_id: id, size_id: s })));
      if (selModels?.length) await supabase.from("product_models").insert(selModels.map((m: string) => ({ product_id: id, model_id: m })));
      if (selShipping?.length) await supabase.from("product_shipping_charges").insert(selShipping.map((s: string) => ({ product_id: id, shipping_charge_id: s })));

      // Variants: delete-and-reinsert (simpler, idempotent)
      await supabase.from("product_variants").delete().eq("product_id", id);
      if (Array.isArray(selVariants) && selVariants.length) {
        const rows: any[] = [];
        const variantShippingPlan: { idx: number; shipping: string[] }[] = [];
        selVariants.forEach((v: any, idx: number) => {
          variantShippingPlan.push({ idx, shipping: Array.isArray(v.shipping_charges) ? v.shipping_charges : [] });
        });
        for (const v of selVariants) {
          let vimg = v.image_url || null;
          const f = variantImageFiles[v._key];
          if (f) vimg = await uploadTo("product-images", f, "variants");
          rows.push({
            product_id: id,
            color_id: v.color_id || null,
            size_id: v.size_id || null,
            model_id: v.model_id || null,
            price: v.price !== "" && v.price != null ? Number(v.price) : null,
            discount_price: v.discount_price !== "" && v.discount_price != null ? Number(v.discount_price) : null,
            image_url: vimg,
            stock: Number(v.stock || 0),
            sku: v.sku || null,
            sort_order: Number(v.sort_order || 0),
            is_active: v.is_active !== false,
          });
        }
        const { data: insertedVariants, error: vErr } = await supabase.from("product_variants").insert(rows).select("id");
        if (vErr) throw vErr;
        const vsRows: any[] = [];
        (insertedVariants || []).forEach((iv: any, i: number) => {
          const plan = variantShippingPlan[i];
          if (plan && plan.shipping.length) {
            plan.shipping.forEach((sid) => vsRows.push({ variant_id: iv.id, shipping_charge_id: sid }));
          }
        });
        if (vsRows.length) {
          const { error: vsErr } = await supabase.from("variant_shipping_charges").insert(vsRows);
          if (vsErr) throw vsErr;
        }
      }

      toast.success("Saved");
      setEditing(null); setFile(null); setGalleryFiles([]); setVideoFile(null); setDemoFile(null); setVariantImageFiles({}); setReviewFiles([]);
      load();
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    load();
  };

  const filteredSubs = subs.filter((s) => !editing?.category_id || s.category_id === editing.category_id);
  const filteredChilds = childs.filter((c) => !editing?.subcategory_id || c.subcategory_id === editing.subcategory_id);
  // Models are now independent of Brand and live in the Variants section as a multi-select.

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-card p-5 flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl">Product Manage</h1>
        <button onClick={openNew} className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-5 py-2.5 font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-card p-5 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={() => bulkUpdate({ is_deal: true }, "Deal")} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-4 py-2 text-sm font-medium flex items-center gap-2"><ThumbsUp className="h-4 w-4" /> Deal</button>
          <button onClick={() => bulkUpdate({ is_deal: false }, "Remove Deal")} className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-4 py-2 text-sm font-medium flex items-center gap-2"><ThumbsDown className="h-4 w-4" /> Deal</button>
          <button onClick={() => bulkUpdate({ is_active: true }, "Activate")} className="bg-violet-500 hover:bg-violet-600 text-white rounded-full px-4 py-2 text-sm font-medium flex items-center gap-2"><ThumbsUp className="h-4 w-4" /> Active</button>
          <button onClick={() => bulkUpdate({ is_active: false }, "Deactivate")} className="bg-amber-500 hover:bg-amber-600 text-white rounded-full px-4 py-2 text-sm font-medium flex items-center gap-2"><ThumbsDown className="h-4 w-4" /> Inactive</button>
          <div className="ml-auto flex items-center gap-2">
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)} placeholder="Search" className="px-4 py-2 border rounded-full text-sm w-64 focus:ring-2 focus:ring-cyan-400 focus:outline-none" />
            <button onClick={() => setSearch(searchInput)} className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full px-5 py-2 text-sm font-medium flex items-center gap-2"><SearchIcon className="h-4 w-4" /> Search</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-3 text-left"><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
                <th className="p-3 text-left">SL</th>
                <th className="p-3 text-left">Action</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Image</th>
                <th className="p-3 text-left">Price</th>
                <th className="p-3 text-left">Stock</th>
                <th className="p-3 text-left">Deal & Feature</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id} className="border-t hover:bg-slate-50">
                  <td className="p-3"><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} /></td>
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1 text-slate-500">
                      <button onClick={() => bulkUpdate({ is_active: !p.is_active }, "Toggled")} title="Toggle Active"><ThumbsDown className="h-4 w-4 hover:text-amber-600" /></button>
                      <button onClick={() => openEdit(p)} title="Edit"><Pencil className="h-4 w-4 hover:text-blue-600" /></button>
                      <button onClick={() => del(p.id)} title="Delete"><Trash2 className="h-4 w-4 hover:text-rose-600" /></button>
                    </div>
                  </td>
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-slate-600">{cats.find((c) => c.id === p.category_id)?.name || "—"}</td>
                  <td className="p-3">{p.image_url ? <img src={p.image_url} className="h-12 w-12 rounded object-cover" alt="" /> : <div className="h-12 w-12 bg-slate-100 rounded" />}</td>
                  <td className="p-3 font-semibold">৳{p.discount_price ?? p.price}</td>
                  <td className="p-3">{p.stock}</td>
                  <td className="p-3 text-xs"><div>Hot Deals : {p.is_hot_deal ? "Yes" : "No"}</div><div>Top Feature : {p.is_top_feature ? "Yes" : "No"}</div></td>
                  <td className="p-3"><span className={`px-3 py-1 rounded-full text-xs font-medium ${p.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{p.is_active ? "Active" : "Inactive"}</span></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={10} className="p-10 text-center text-slate-500">No products</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={() => setEditing(null)}>
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-6xl my-4 overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-display font-bold text-xl text-slate-800">{editing.id ? "Edit Product" : "Product Create"}</h3>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setEditing(null)} className="bg-violet-500 hover:bg-violet-600 text-white rounded-full px-5 py-2 text-sm font-semibold">Manage</button>
                <button type="button" onClick={() => setEditing(null)} className="p-2 hover:bg-slate-100 rounded-full"><X className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Section 1: Basic Info */}
              <Section title="Basic Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                  <Field label="Product Name" required><input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="inp" placeholder="Enter product name" /></Field>
                  <Field label="Categories" required>
                    <select required value={editing.category_id || ""} onChange={(e) => setEditing({ ...editing, category_id: e.target.value, subcategory_id: "", childcategory_id: "" })} className="inp">
                      <option value="">Select..</option>
                      {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                  <Field label="SubCategories" optional>
                    <select value={editing.subcategory_id || ""} onChange={(e) => setEditing({ ...editing, subcategory_id: e.target.value, childcategory_id: "" })} className="inp">
                      <option value="">Choose ...</option>
                      {filteredSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Child Categories" optional>
                    <select value={editing.childcategory_id || ""} onChange={(e) => setEditing({ ...editing, childcategory_id: e.target.value })} className="inp">
                      <option value="">Choose ...</option>
                      {filteredChilds.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </Field>
                </div>
              </Section>

              {/* Section 2: Pricing & Stock */}
              <Section title="Pricing & Inventory">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-4">
                  <Field label="Brand" optional>
                    <select value={editing.brand_id || ""} onChange={(e) => setEditing({ ...editing, brand_id: e.target.value })} className="inp">
                      <option value="">Select..</option>
                      {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Price" required><input type="number" required value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} className="inp" placeholder="0" /></Field>
                  <Field label="Discount Price" optional><input type="number" value={editing.discount_price ?? ""} onChange={(e) => setEditing({ ...editing, discount_price: e.target.value })} className="inp" placeholder="0" /></Field>
                  <Field label="SKU"><input value={editing.sku || ""} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} className="inp" placeholder="SKU code" /></Field>
                  <Field label="Stock" required><input type="number" required value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: e.target.value })} className="inp" placeholder="0" /></Field>
                </div>
              </Section>

              {/* Section 3: Media */}
              <Section title="Media & Image">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Main Image" required>
                    <label className="cursor-pointer flex items-center border rounded-md overflow-hidden bg-white">
                      <span className="px-4 py-2 bg-slate-100 text-sm font-medium border-r">Choose file</span>
                      <span className="px-3 py-2 text-sm text-slate-500 truncate flex-1">{file?.name || "No file chosen"}</span>
                      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
                    </label>
                    {editing.image_url && !file && <img src={editing.image_url} className="mt-2 h-20 rounded border" alt="" />}
                  </Field>
                  <Field label="Short Description" optional><input value={editing.short_description || ""} onChange={(e) => setEditing({ ...editing, short_description: e.target.value })} className="inp" placeholder="Brief description" /></Field>
                </div>

                {/* Gallery (multiple images) */}
                <div className="mt-5">
                  <label className="block text-xs font-semibold mb-1.5 text-slate-700">
                    Gallery Images <span className="text-slate-400 font-normal ml-1">(Multiple)</span>
                  </label>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md border-2 border-dashed border-slate-300 hover:border-cyan-500 hover:bg-cyan-50 text-sm text-slate-600 transition">
                    <ImagePlus className="h-4 w-4" />
                    <span>Add Multiple Images</span>
                    <input type="file" accept="image/*" multiple onChange={(e) => setGalleryFiles([...galleryFiles, ...Array.from(e.target.files || [])])} className="hidden" />
                  </label>
                  {(editing.gallery?.length > 0 || galleryFiles.length > 0) && (
                    <div className="mt-3 grid grid-cols-4 md:grid-cols-6 gap-2">
                      {editing.gallery?.map((url: string, i: number) => (
                        <div key={`g-${i}`} className="relative group">
                          <img src={url} className="h-20 w-full object-cover rounded border" alt="" />
                          <button type="button" onClick={() => setEditing({ ...editing, gallery: editing.gallery.filter((_: any, x: number) => x !== i) })}
                            className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {galleryFiles.map((f, i) => (
                        <div key={`gf-${i}`} className="relative group">
                          <img src={URL.createObjectURL(f)} className="h-20 w-full object-cover rounded border ring-2 ring-emerald-400" alt="" />
                          <button type="button" onClick={() => setGalleryFiles(galleryFiles.filter((_, x) => x !== i))}
                            className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Gallery YouTube Video — shown inside product image gallery */}
                <div className="mt-4 pt-4 border-t">
                  <label className="block text-xs font-semibold mb-1.5 text-slate-700">
                    Gallery YouTube Video
                    <span className="text-slate-400 font-normal ml-1">(প্রোডাক্ট ইমেজের সাথে গ্যালারিতে দেখাবে)</span>
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      value={editing.gallery_video_url || ""}
                      onChange={(e) => setEditing({ ...editing, gallery_video_url: e.target.value })}
                      className="inp pl-9"
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                  </div>
                  {editing.gallery_video_url && (
                    <p className="text-xs text-emerald-600 mt-1.5">✓ গ্যালারিতে এই ভিডিওটি প্রথমে অটো-প্লে হবে (mute অবস্থায়)</p>
                  )}
                </div>
              </Section>

              {/* Section 3.5: Product Video */}
              <Section title="Product Video">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { v: "none", label: "No Video" },
                      { v: "upload", label: "Upload Video", icon: Upload },
                      { v: "youtube", label: "YouTube Link", icon: Video },
                      { v: "facebook", label: "Facebook Link", icon: Video },
                    ].map((opt) => (
                      <button key={opt.v} type="button" onClick={() => setEditing({ ...editing, video_type: opt.v, video_url: "" })}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition flex items-center gap-2 ${editing.video_type === opt.v ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-slate-200 hover:border-slate-300"}`}>
                        {opt.icon && <opt.icon className="h-4 w-4" />} {opt.label}
                      </button>
                    ))}
                  </div>

                  {editing.video_type === "upload" && (
                    <Field label="Upload Video File">
                      <label className="cursor-pointer flex items-center border rounded-md overflow-hidden bg-white">
                        <span className="px-4 py-2 bg-slate-100 text-sm font-medium border-r">Choose video</span>
                        <span className="px-3 py-2 text-sm text-slate-500 truncate flex-1">{videoFile?.name || (editing.video_url ? "Current video uploaded" : "No file chosen")}</span>
                        <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} className="hidden" />
                      </label>
                      {editing.video_url && !videoFile && <video src={editing.video_url} controls className="mt-2 h-32 rounded border" />}
                    </Field>
                  )}

                  {editing.video_type === "youtube" && (
                    <Field label="YouTube Video URL">
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input value={editing.video_url || ""} onChange={(e) => setEditing({ ...editing, video_url: e.target.value })}
                          className="inp pl-9" placeholder="https://www.youtube.com/watch?v=..." />
                      </div>
                    </Field>
                  )}

                  {editing.video_type === "facebook" && (
                    <Field label="Facebook Video URL">
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input value={editing.video_url || ""} onChange={(e) => setEditing({ ...editing, video_url: e.target.value })}
                          className="inp pl-9" placeholder="https://www.facebook.com/.../videos/..." />
                      </div>
                    </Field>
                  )}
                </div>
              </Section>

              {/* Section 3.6: Product Demo */}
              <Section title="Product Demo / Document">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { v: "none", label: "No Demo" },
                      { v: "pdf", label: "Upload PDF", icon: FileText },
                      { v: "drive", label: "Google Drive Link", icon: LinkIcon },
                    ].map((opt) => (
                      <button key={opt.v} type="button" onClick={() => setEditing({ ...editing, demo_type: opt.v, demo_url: "" })}
                        className={`px-4 py-2 rounded-full border text-sm font-medium transition flex items-center gap-2 ${editing.demo_type === opt.v ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-slate-200 hover:border-slate-300"}`}>
                        {opt.icon && <opt.icon className="h-4 w-4" />} {opt.label}
                      </button>
                    ))}
                  </div>

                  {editing.demo_type === "pdf" && (
                    <Field label="Upload PDF File">
                      <label className="cursor-pointer flex items-center border rounded-md overflow-hidden bg-white">
                        <span className="px-4 py-2 bg-slate-100 text-sm font-medium border-r">Choose PDF</span>
                        <span className="px-3 py-2 text-sm text-slate-500 truncate flex-1">{demoFile?.name || (editing.demo_url ? "Current PDF uploaded" : "No file chosen")}</span>
                        <input type="file" accept="application/pdf" onChange={(e) => setDemoFile(e.target.files?.[0] || null)} className="hidden" />
                      </label>
                      {editing.demo_url && !demoFile && (
                        <a href={editing.demo_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm text-cyan-600 hover:underline">
                          <FileText className="h-4 w-4" /> View current PDF
                        </a>
                      )}
                    </Field>
                  )}

                  {editing.demo_type === "drive" && (
                    <Field label="Google Drive Share URL">
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input value={editing.demo_url || ""} onChange={(e) => setEditing({ ...editing, demo_url: e.target.value })}
                          className="inp pl-9" placeholder="https://drive.google.com/file/d/..." />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Make sure the link is set to "Anyone with the link can view"</p>
                    </Field>
                  )}
                </div>
              </Section>


              {/* Section 4: Variants */}
              <Section title="Variants (Optional)">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Field label="Colors" optional>
                    <div className="flex flex-wrap gap-2 p-3 bg-white rounded-md border min-h-[44px]">
                      {colors.map((c) => {
                        const on = editing.colors?.includes(c.id);
                        return (
                          <button type="button" key={c.id} onClick={() => setEditing({ ...editing, colors: on ? editing.colors.filter((x: string) => x !== c.id) : [...(editing.colors || []), c.id] })}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition ${on ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-slate-200 hover:border-slate-300"}`}>
                            <span className="h-4 w-4 rounded-full border" style={{ background: c.hex_code }} />{c.name}
                          </button>
                        );
                      })}
                      {colors.length === 0 && <span className="text-xs text-slate-400">No colors available</span>}
                    </div>
                  </Field>
                  <Field label="Sizes" optional>
                    <div className="flex flex-wrap gap-2 p-3 bg-white rounded-md border min-h-[44px]">
                      {sizes.map((s) => {
                        const on = editing.sizes?.includes(s.id);
                        return (
                          <button type="button" key={s.id} onClick={() => setEditing({ ...editing, sizes: on ? editing.sizes.filter((x: string) => x !== s.id) : [...(editing.sizes || []), s.id] })}
                            className={`px-3 py-1.5 rounded-full border text-xs transition ${on ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-slate-200 hover:border-slate-300"}`}>{s.name}</button>
                        );
                      })}
                      {sizes.length === 0 && <span className="text-xs text-slate-400">No sizes available</span>}
                    </div>
                  </Field>
                  <Field label="Models" optional>
                    <div className="flex flex-wrap gap-2 p-3 bg-white rounded-md border min-h-[44px]">
                      {models.map((m) => {
                        const on = editing.models?.includes(m.id);
                        return (
                          <button type="button" key={m.id} onClick={() => setEditing({ ...editing, models: on ? editing.models.filter((x: string) => x !== m.id) : [...(editing.models || []), m.id] })}
                            className={`px-3 py-1.5 rounded-full border text-xs transition ${on ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-slate-200 hover:border-slate-300"}`}>{m.name}</button>
                        );
                      })}
                      {models.length === 0 && <span className="text-xs text-slate-400">No models available</span>}
                    </div>
                  </Field>
                </div>
              </Section>

              {/* Section 4.2: Shipping Charges (per product) */}
              <Section title="Shipping Charges (Optional)">
                <p className="text-xs text-slate-500 mb-3">
                  এই প্রডাক্টের জন্য এক বা একাধিক ডেলিভারি চার্জ অপশন বেছে দিন। কাস্টমার চেকআউটে এগুলো থেকে একটি বাছাই করতে পারবে।
                </p>
                <div className="flex flex-wrap gap-2 p-3 bg-white rounded-md border min-h-[44px]">
                  {shippings.map((s) => {
                    const on = editing.shipping_charges?.includes(s.id);
                    return (
                      <button type="button" key={s.id} onClick={() => setEditing({ ...editing, shipping_charges: on ? editing.shipping_charges.filter((x: string) => x !== s.id) : [...(editing.shipping_charges || []), s.id] })}
                        className={`px-3 py-1.5 rounded-full border text-xs transition ${on ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 hover:border-slate-300"}`}>
                        {s.name} <span className="text-slate-400">৳{s.charge}</span>
                      </button>
                    );
                  })}
                  {shippings.length === 0 && <span className="text-xs text-slate-400">No active shipping charges. Add some in Settings → Shipping Charge.</span>}
                </div>
              </Section>

              {/* Section 4.5: Variant Combinations (price/image/stock per combo) */}
              <Section title="Variant Combinations (Optional)">
                <p className="text-xs text-slate-500 mb-3">
                  প্রতিটি কালার/সাইজ/মডেল কম্বিনেশনের জন্য আলাদা দাম, ছবি ও স্টক যোগ করুন।
                  না দিলে product এর default price/image use হবে।
                </p>
                <div className="space-y-3">
                  {(editing.variants || []).map((v: any, idx: number) => (
                    <div key={v._key || idx} className="bg-white border rounded-lg p-3 grid grid-cols-12 gap-2 items-start md:[grid-template-columns:repeat(14,minmax(0,1fr))]">
                      <div className="col-span-12 md:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Color</label>
                        <select value={v.color_id || ""} onChange={(e) => {
                          const arr = [...editing.variants]; arr[idx] = { ...v, color_id: e.target.value || null };
                          setEditing({ ...editing, variants: arr });
                        }} className="inp text-xs">
                          <option value="">—</option>
                          {colors.filter((c) => !editing.colors?.length || editing.colors.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-12 md:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Size</label>
                        <select value={v.size_id || ""} onChange={(e) => {
                          const arr = [...editing.variants]; arr[idx] = { ...v, size_id: e.target.value || null };
                          setEditing({ ...editing, variants: arr });
                        }} className="inp text-xs">
                          <option value="">—</option>
                          {sizes.filter((s) => !editing.sizes?.length || editing.sizes.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-12 md:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Model</label>
                        <select value={v.model_id || ""} onChange={(e) => {
                          const arr = [...editing.variants]; arr[idx] = { ...v, model_id: e.target.value || null };
                          setEditing({ ...editing, variants: arr });
                        }} className="inp text-xs">
                          <option value="">—</option>
                          {models.filter((m) => !editing.models?.length || editing.models.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-6 md:col-span-1">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Price</label>
                        <input type="number" value={v.price ?? ""} onChange={(e) => {
                          const arr = [...editing.variants]; arr[idx] = { ...v, price: e.target.value };
                          setEditing({ ...editing, variants: arr });
                        }} className="inp text-xs" placeholder="—" />
                      </div>
                      <div className="col-span-6 md:col-span-1">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Disc.</label>
                        <input type="number" value={v.discount_price ?? ""} onChange={(e) => {
                          const arr = [...editing.variants]; arr[idx] = { ...v, discount_price: e.target.value };
                          setEditing({ ...editing, variants: arr });
                        }} className="inp text-xs" placeholder="—" />
                      </div>
                      <div className="col-span-6 md:col-span-1">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Stock</label>
                        <input type="number" value={v.stock ?? 0} onChange={(e) => {
                          const arr = [...editing.variants]; arr[idx] = { ...v, stock: e.target.value };
                          setEditing({ ...editing, variants: arr });
                        }} className="inp text-xs" placeholder="0" />
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Image</label>
                        <label className="cursor-pointer flex items-center gap-1.5 text-xs px-2 py-1.5 border rounded bg-slate-50 hover:bg-slate-100">
                          <ImagePlus className="h-3.5 w-3.5" />
                          <span className="truncate flex-1">{variantImageFiles[v._key]?.name || (v.image_url ? "Uploaded" : "Choose")}</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const f = e.target.files?.[0]; if (!f) return;
                            setVariantImageFiles({ ...variantImageFiles, [v._key]: f });
                          }} />
                        </label>
                        {(v.image_url || variantImageFiles[v._key]) && (
                          <img src={variantImageFiles[v._key] ? URL.createObjectURL(variantImageFiles[v._key]) : v.image_url} className="mt-1 h-10 w-10 rounded object-cover border" alt="" />
                        )}
                      </div>
                      <div className="col-span-12 md:col-span-1 flex md:items-end justify-end h-full">
                        <button type="button" onClick={() => {
                          const arr = editing.variants.filter((_: any, i: number) => i !== idx);
                          setEditing({ ...editing, variants: arr });
                        }} className="p-2 text-rose-500 hover:bg-rose-50 rounded">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {shippings.length > 0 && (
                        <div className="col-span-12">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Shipping Override (optional — না দিলে product-level shipping ব্যবহার হবে)</label>
                          <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded border">
                            {shippings.map((s) => {
                              const list: string[] = Array.isArray(v.shipping_charges) ? v.shipping_charges : [];
                              const on = list.includes(s.id);
                              return (
                                <button type="button" key={s.id} onClick={() => {
                                  const arr = [...editing.variants];
                                  const next = on ? list.filter((x) => x !== s.id) : [...list, s.id];
                                  arr[idx] = { ...v, shipping_charges: next };
                                  setEditing({ ...editing, variants: arr });
                                }} className={`px-2 py-1 rounded-full border text-[11px] transition ${on ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 hover:border-slate-300"}`}>
                                  {s.name} <span className="text-slate-400">৳{s.charge}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => {
                    const newV = { _key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, color_id: null, size_id: null, model_id: null, price: "", discount_price: "", stock: 0, image_url: null, is_active: true, shipping_charges: [] };
                    setEditing({ ...editing, variants: [...(editing.variants || []), newV] });
                  }} className="w-full border-2 border-dashed border-slate-300 hover:border-cyan-500 hover:bg-cyan-50 rounded-lg py-2.5 text-sm font-medium text-slate-600 hover:text-cyan-700 transition flex items-center justify-center gap-2">
                    <Plus className="h-4 w-4" /> Add Variant Combination
                  </button>
                </div>
              </Section>

              {/* Section 5: Description */}
              <Section title="Description">
                <Field label="Description" required>
                  <RichTextEditor value={editing.description || ""} onChange={(val) => setEditing({ ...editing, description: val })} />
                </Field>
              </Section>

              {/* Section 5.5: Customer Review Screenshots */}
              <Section title="Customer Review Screenshots (Slider)">
                <p className="text-xs text-slate-500 mb-3">
                  রিভিউয়ের স্ক্রিনশট ছবি আপলোড করুন — প্রোডাক্ট পেজে স্লাইড আকারে দেখাবে। স্লাইড স্পিড আপনি কন্ট্রোল করতে পারবেন।
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Add Review Screenshots (Multiple)">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md border-2 border-dashed border-slate-300 hover:border-cyan-500 hover:bg-cyan-50 text-sm text-slate-600 transition w-full justify-center">
                      <ImagePlus className="h-4 w-4" />
                      <span>{reviewFiles.length > 0 ? `${reviewFiles.length} new image(s) selected` : "Choose Images"}</span>
                      <input type="file" accept="image/*" multiple className="hidden"
                        onChange={(e) => setReviewFiles([...reviewFiles, ...Array.from(e.target.files || [])])} />
                    </label>
                  </Field>
                  <Field label={`Slide Speed (ms) — ${editing.review_slide_speed || 3000}ms`}>
                    <input type="range" min={1000} max={10000} step={250}
                      value={editing.review_slide_speed || 3000}
                      onChange={(e) => setEditing({ ...editing, review_slide_speed: Number(e.target.value) })}
                      className="w-full" />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>Fast (1s)</span><span>Slow (10s)</span>
                    </div>
                  </Field>
                </div>

                {/* Existing review images */}
                {Array.isArray(editing.review_images) && editing.review_images.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-xs font-semibold mb-2 text-slate-700">Current Review Images</label>
                    <div className="flex flex-wrap gap-2">
                      {editing.review_images.map((url: string, i: number) => (
                        <div key={i} className="relative group">
                          <img src={url} className="h-20 w-20 object-cover rounded border" alt="" />
                          <button type="button"
                            onClick={() => setEditing({ ...editing, review_images: editing.review_images.filter((_: string, j: number) => j !== i) })}
                            className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition">
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New uploads preview */}
                {reviewFiles.length > 0 && (
                  <div className="mt-3">
                    <label className="block text-xs font-semibold mb-2 text-slate-700">New Uploads (Pending Save)</label>
                    <div className="flex flex-wrap gap-2">
                      {reviewFiles.map((f, i) => (
                        <div key={i} className="relative group">
                          <img src={URL.createObjectURL(f)} className="h-20 w-20 object-cover rounded border" alt="" />
                          <button type="button"
                            onClick={() => setReviewFiles(reviewFiles.filter((_, j) => j !== i))}
                            className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition">
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Section>

              {/* Section 6: Status */}
              <Section title="Status & Flags">
                <div className="flex flex-wrap gap-8">
                  <Toggle label="Status" checked={editing.is_active} onChange={(v) => setEditing({ ...editing, is_active: v })} color="cyan" />
                  <Toggle label="Hot Deals" checked={editing.is_hot_deal} onChange={(v) => setEditing({ ...editing, is_hot_deal: v })} color="rose" />
                  <Toggle label="Top Feature" checked={editing.is_top_feature} onChange={(v) => setEditing({ ...editing, is_top_feature: v })} color="violet" />
                  <Toggle label="Deal" checked={editing.is_deal} onChange={(v) => setEditing({ ...editing, is_deal: v })} color="emerald" />
                </div>
              </Section>

              {/* Submit */}
              <div className="flex items-center gap-3 pt-2">
                <button disabled={busy} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-2.5 rounded-md font-semibold disabled:opacity-50">
                  {busy ? "Saving..." : "Submit"}
                </button>
                <button type="button" onClick={() => setEditing(null)} className="bg-white hover:bg-slate-100 text-slate-700 px-6 py-2.5 rounded-md font-semibold border">
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <style>{`.inp{width:100%;padding:0.625rem 0.875rem;border:1px solid #e2e8f0;border-radius:0.5rem;font-size:0.875rem;background:white;transition:all .15s}.inp:focus{outline:none;border-color:#06b6d4;box-shadow:0 0 0 3px rgba(6,182,212,0.15)}.inp:hover{border-color:#cbd5e1}`}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h4 className="font-display font-semibold text-sm text-slate-800 mb-4 pb-2 border-b border-slate-100 uppercase tracking-wide">{title}</h4>
      {children}
    </div>
  );
}

function Field({ label, children, required, optional }: { label: string; children: React.ReactNode; required?: boolean; optional?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 text-slate-700">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
        {optional && <span className="text-slate-400 font-normal ml-1">(Optional)</span>}
      </label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange, color = "cyan" }: { label: string; checked: boolean; onChange: (v: boolean) => void; color?: string }) {
  const colorMap: Record<string, string> = {
    cyan: "bg-cyan-500", rose: "bg-rose-500", violet: "bg-violet-500", emerald: "bg-emerald-500",
  };
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${checked ? colorMap[color] : "bg-slate-300"}`}>
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}
