import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Tag, Check } from "lucide-react";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  scope: "global" | "product";
  min_order_amount: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
};

type Product = { id: string; name: string };

export default function AdminCoupons() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const load = async () => {
    const { data } = await (supabase as any)
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data as Coupon[]) || []);
  };

  const loadProducts = async () => {
    const { data } = await supabase.from("products").select("id,name").order("name");
    setProducts((data as Product[]) || []);
  };

  useEffect(() => {
    document.title = "Coupons | Admin";
    load();
    loadProducts();
  }, []);

  const startEdit = async (c: Coupon | null) => {
    if (c) {
      setEditing({ ...c });
      const { data } = await (supabase as any)
        .from("coupon_products")
        .select("product_id")
        .eq("coupon_id", c.id);
      setSelectedProductIds(((data as any[]) || []).map((r) => r.product_id));
    } else {
      setEditing({
        code: "",
        description: "",
        discount_type: "percent",
        discount_value: 10,
        scope: "global",
        min_order_amount: 0,
        max_discount: null,
        usage_limit: null,
        is_active: true,
      });
      setSelectedProductIds([]);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing?.code) return toast.error("Code লিখুন");
    if (editing.scope === "product" && selectedProductIds.length === 0) {
      return toast.error("Product সিলেক্ট করুন");
    }
    setBusy(true);
    const payload: any = {
      code: editing.code.trim().toUpperCase(),
      description: editing.description || null,
      discount_type: editing.discount_type,
      discount_value: Number(editing.discount_value || 0),
      scope: editing.scope,
      min_order_amount: Number(editing.min_order_amount || 0),
      max_discount: editing.max_discount ? Number(editing.max_discount) : null,
      usage_limit: editing.usage_limit ? Number(editing.usage_limit) : null,
      starts_at: editing.starts_at || null,
      expires_at: editing.expires_at || null,
      is_active: editing.is_active ?? true,
    };

    let couponId = editing.id;
    if (couponId) {
      const { error } = await (supabase as any).from("coupons").update(payload).eq("id", couponId);
      if (error) { toast.error(error.message); setBusy(false); return; }
    } else {
      const { data, error } = await (supabase as any).from("coupons").insert(payload).select("id").single();
      if (error) { toast.error(error.message); setBusy(false); return; }
      couponId = data.id;
    }

    // Update product links
    await (supabase as any).from("coupon_products").delete().eq("coupon_id", couponId);
    if (payload.scope === "product" && selectedProductIds.length > 0) {
      await (supabase as any).from("coupon_products").insert(
        selectedProductIds.map((pid) => ({ coupon_id: couponId, product_id: pid }))
      );
    }

    setBusy(false);
    toast.success("Saved ✓");
    setEditing(null);
    setSelectedProductIds([]);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    const { error } = await (supabase as any).from("coupons").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.trim().toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-card p-5 flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl flex items-center gap-2">
          <Tag className="h-6 w-6 text-rose-500" /> Coupons ({rows.length})
        </h1>
        <button onClick={() => startEdit(null)}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-5 py-2.5 font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Coupon
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">Code</th>
              <th className="p-3 text-left">Discount</th>
              <th className="p-3 text-left">Scope</th>
              <th className="p-3 text-left">Min Order</th>
              <th className="p-3 text-left">Usage</th>
              <th className="p-3 text-left">Expires</th>
              <th className="p-3 text-left">Active</th>
              <th className="p-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-slate-50">
                <td className="p-3 font-mono font-bold text-rose-600">{r.code}</td>
                <td className="p-3">
                  {r.discount_type === "percent" ? `${r.discount_value}%` : `৳${r.discount_value}`}
                  {r.max_discount ? <span className="text-xs text-slate-500"> (max ৳{r.max_discount})</span> : null}
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${r.scope === "global" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                    {r.scope === "global" ? "All Products" : "Specific"}
                  </span>
                </td>
                <td className="p-3">৳{r.min_order_amount}</td>
                <td className="p-3 text-xs">{r.used_count}{r.usage_limit ? ` / ${r.usage_limit}` : ""}</td>
                <td className="p-3 text-xs">{r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—"}</td>
                <td className="p-3">{r.is_active ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-slate-400" />}</td>
                <td className="p-3 flex gap-1">
                  <button onClick={() => startEdit(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => del(r.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-slate-500">কোন কুপন নেই</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <form onSubmit={save} onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-bold text-lg">{editing.id ? "Edit" : "Add"} Coupon</h3>
              <button type="button" onClick={() => setEditing(null)}><X className="h-5 w-5" /></button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Code *">
                <input required value={editing.code || ""} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE10" className="form-input font-mono uppercase" />
              </Field>
              <Field label="Description">
                <input value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="10% off" className="form-input" />
              </Field>
              <Field label="Discount Type *">
                <select value={editing.discount_type} onChange={(e) => setEditing({ ...editing, discount_type: e.target.value as any })}
                  className="form-input">
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (৳)</option>
                </select>
              </Field>
              <Field label="Discount Value *">
                <input type="number" min="0" step="0.01" required value={editing.discount_value ?? ""}
                  onChange={(e) => setEditing({ ...editing, discount_value: Number(e.target.value) })}
                  className="form-input" />
              </Field>
              <Field label="Scope *">
                <select value={editing.scope} onChange={(e) => setEditing({ ...editing, scope: e.target.value as any })}
                  className="form-input">
                  <option value="global">Global (সকল প্রডাক্ট)</option>
                  <option value="product">Product Wise (নির্দিষ্ট প্রডাক্ট)</option>
                </select>
              </Field>
              <Field label="Min Order Amount">
                <input type="number" min="0" value={editing.min_order_amount ?? 0}
                  onChange={(e) => setEditing({ ...editing, min_order_amount: Number(e.target.value) })}
                  className="form-input" />
              </Field>
              {editing.discount_type === "percent" && (
                <Field label="Max Discount Cap (৳)">
                  <input type="number" min="0" value={editing.max_discount ?? ""}
                    onChange={(e) => setEditing({ ...editing, max_discount: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Optional" className="form-input" />
                </Field>
              )}
              <Field label="Usage Limit">
                <input type="number" min="1" value={editing.usage_limit ?? ""}
                  onChange={(e) => setEditing({ ...editing, usage_limit: e.target.value ? Number(e.target.value) : null })}
                  placeholder="Unlimited" className="form-input" />
              </Field>
              <Field label="Starts At">
                <input type="datetime-local" value={editing.starts_at ? new Date(editing.starts_at).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setEditing({ ...editing, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="form-input" />
              </Field>
              <Field label="Expires At">
                <input type="datetime-local" value={editing.expires_at ? new Date(editing.expires_at).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setEditing({ ...editing, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="form-input" />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.is_active ?? true}
                onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                className="h-4 w-4 accent-rose-500" />
              Active
            </label>

            {editing.scope === "product" && (
              <div className="border rounded-lg p-3 space-y-2">
                <div className="font-semibold text-sm">Select Products ({selectedProductIds.length})</div>
                <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search product..." className="form-input" />
                <div className="max-h-60 overflow-y-auto space-y-1 border rounded p-2">
                  {filteredProducts.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm hover:bg-slate-50 px-2 py-1 rounded cursor-pointer">
                      <input type="checkbox" checked={selectedProductIds.includes(p.id)}
                        onChange={() => toggleProduct(p.id)} className="accent-rose-500" />
                      <span className="truncate">{p.name}</span>
                    </label>
                  ))}
                  {filteredProducts.length === 0 && <p className="text-xs text-slate-500 text-center py-2">No products</p>}
                </div>
              </div>
            )}

            <button disabled={busy} className="w-full bg-rose-500 hover:bg-rose-600 text-white py-2.5 rounded-md font-semibold disabled:opacity-50">
              {busy ? "Saving..." : "Save Coupon"}
            </button>
          </form>
        </div>
      )}

      <style>{`
        .form-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          font-size: 0.875rem;
          background: white;
          outline: none;
        }
        .form-input:focus { border-color: hsl(var(--primary)); box-shadow: 0 0 0 2px hsl(var(--primary) / 0.15); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1 text-slate-700">{label}</label>
      {children}
    </div>
  );
}
