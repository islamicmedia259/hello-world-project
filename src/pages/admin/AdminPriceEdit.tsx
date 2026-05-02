import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save } from "lucide-react";

export default function AdminPriceEdit() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [edits, setEdits] = useState<Record<string, { price: number; discount_price: number | null }>>({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("products").select("id, name, price, discount_price, stock").order("name");
    setProducts(data || []);
  };
  useEffect(() => { document.title = "Price Edit | Admin"; load(); }, []);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const set = (id: string, key: "price" | "discount_price", val: number | null) => {
    setEdits((e) => ({ ...e, [id]: { ...(e[id] || { price: products.find((p) => p.id === id)!.price, discount_price: products.find((p) => p.id === id)!.discount_price }), [key]: val } }));
  };

  const saveAll = async () => {
    const changes = Object.entries(edits);
    if (changes.length === 0) { toast.error("No changes"); return; }
    setBusy(true);
    let ok = 0;
    for (const [id, { price, discount_price }] of changes) {
      const old = products.find((p) => p.id === id);
      const { error } = await supabase.from("products").update({ price, discount_price }).eq("id", id);
      if (!error) {
        await supabase.from("price_history").insert({
          product_id: id, old_price: old.price, new_price: price,
          old_discount: old.discount_price, new_discount: discount_price,
        });
        ok++;
      }
    }
    setBusy(false);
    toast.success(`Updated ${ok} products`);
    setEdits({});
    load();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-card p-5 flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl">Price Edit ({filtered.length})</h1>
        <button onClick={saveAll} disabled={busy || Object.keys(edits).length === 0} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-5 py-2.5 font-semibold flex items-center gap-2 disabled:opacity-50">
          <Save className="h-4 w-4" /> Save Changes ({Object.keys(edits).length})
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-card p-5">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product..." className="w-full px-4 py-2 border rounded-full text-sm mb-4 focus:ring-2 focus:ring-cyan-400 focus:outline-none" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Stock</th><th className="p-3 text-left">Price (৳)</th><th className="p-3 text-left">Discount Price (৳)</th></tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const e = edits[p.id];
                return (
                  <tr key={p.id} className="border-t">
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3">{p.stock}</td>
                    <td className="p-3"><input type="number" defaultValue={p.price} onChange={(ev) => set(p.id, "price", Number(ev.target.value))} className={`w-28 px-2 py-1 border rounded ${e?.price !== undefined && e.price !== p.price ? "border-cyan-500 bg-cyan-50" : ""}`} /></td>
                    <td className="p-3"><input type="number" defaultValue={p.discount_price ?? ""} onChange={(ev) => set(p.id, "discount_price", ev.target.value ? Number(ev.target.value) : null)} className={`w-28 px-2 py-1 border rounded ${e?.discount_price !== undefined && e.discount_price !== p.discount_price ? "border-cyan-500 bg-cyan-50" : ""}`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
