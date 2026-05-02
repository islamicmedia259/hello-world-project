import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Eye, Trash2, Phone, MessageCircle } from "lucide-react";
import { toast } from "sonner";

type IO = {
  id: string;
  phone: string;
  customer_name: string | null;
  email: string | null;
  district: string | null;
  thana: string | null;
  address: string | null;
  notes: string | null;
  cart_items: any[];
  subtotal: number;
  shipping_cost: number;
  total: number;
  is_completed: boolean;
  completed_order_id: string | null;
  created_at: string;
  updated_at: string;
};

export default function AdminIncompleteOrders() {
  const [rows, setRows] = useState<IO[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "completed">("open");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<IO | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("incomplete_orders")
      .select("*")
      .order("updated_at", { ascending: false });
    setRows((data ?? []) as IO[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let out = rows;
    if (filter === "open") out = out.filter((r) => !r.is_completed);
    if (filter === "completed") out = out.filter((r) => r.is_completed);
    const q = search.toLowerCase().trim();
    if (q) {
      out = out.filter((r) =>
        r.phone.toLowerCase().includes(q) ||
        (r.customer_name ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q),
      );
    }
    return out;
  }, [rows, search, filter]);

  const remove = async (r: IO) => {
    if (!confirm(`Delete incomplete order from ${r.phone}?`)) return;
    const { error } = await (supabase as any).from("incomplete_orders").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Incomplete Orders</h1>
        <div className="text-sm text-muted-foreground">{rows.filter((r) => !r.is_completed).length} open</div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div className="flex gap-2">
            {(["open", "completed", "all"] as const).map((k) => (
              <button key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize ${filter === k ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                {k}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Search:</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" placeholder="Phone, name or email" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="p-3">SL</th>
                <th className="p-3">Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Items</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3">Updated</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No incomplete orders</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3">{r.customer_name || "—"}</td>
                  <td className="p-3 font-mono">{r.phone}</td>
                  <td className="p-3">{Array.isArray(r.cart_items) ? r.cart_items.length : 0}</td>
                  <td className="p-3 text-right">৳{Number(r.total).toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${r.is_completed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {r.is_completed ? "Completed" : "Open"}
                    </span>
                  </td>
                  <td className="p-3 text-xs">{new Date(r.updated_at).toLocaleString()}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <a href={`tel:${r.phone}`} className="inline-flex items-center justify-center h-8 w-8 rounded border hover:bg-secondary" title="Call"><Phone className="h-3.5 w-3.5" /></a>
                      <a href={`https://wa.me/88${r.phone}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center h-8 w-8 rounded border hover:bg-secondary" title="WhatsApp"><MessageCircle className="h-3.5 w-3.5" /></a>
                      <Button size="sm" variant="outline" onClick={() => setView(r)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!view} onOpenChange={(v) => !v && setView(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{view?.customer_name || "Customer"} ({view?.phone})</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Email:</span> {view?.email || "—"}</div>
            <div><span className="text-muted-foreground">District:</span> {view?.district || "—"}</div>
            <div><span className="text-muted-foreground">Thana:</span> {view?.thana || "—"}</div>
            <div><span className="text-muted-foreground">Total:</span> ৳{Number(view?.total ?? 0).toLocaleString()}</div>
            <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {view?.address || "—"}</div>
            {view?.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes:</span> {view.notes}</div>}
          </div>
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Cart Items</h3>
            <div className="border rounded">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr><th className="p-2 text-left">Product</th><th className="p-2 text-center">Qty</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">Subtotal</th></tr>
                </thead>
                <tbody>
                  {(view?.cart_items || []).map((c: any, idx: number) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">{c.product_name}</td>
                      <td className="p-2 text-center">{c.quantity}</td>
                      <td className="p-2 text-right">৳{Number(c.unit_price).toLocaleString()}</td>
                      <td className="p-2 text-right">৳{(Number(c.unit_price) * Number(c.quantity)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter><Button onClick={() => setView(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
