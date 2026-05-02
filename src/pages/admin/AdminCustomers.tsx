import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Ban, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";

type C = {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  address: string | null;
  total_orders: number;
  total_spent: number;
  is_blocked: boolean;
  notes: string | null;
  created_at: string;
};

export default function AdminCustomers() {
  const [rows, setRows] = useState<C[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<C | null>(null);
  const [orders, setOrders] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("customers").select("*").order("total_spent", { ascending: false });
    setRows((data ?? []) as C[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) =>
      r.phone.toLowerCase().includes(q) ||
      (r.name ?? "").toLowerCase().includes(q) ||
      (r.email ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const openView = async (c: C) => {
    setView(c);
    const { data } = await supabase.from("orders").select("invoice_no, total, status, created_at").eq("phone", c.phone).order("created_at", { ascending: false });
    setOrders(data ?? []);
  };

  const toggleBlock = async (c: C) => {
    const { error } = await supabase.from("customers").update({ is_blocked: !c.is_blocked }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(!c.is_blocked ? "Blocked" : "Unblocked");
    load();
  };

  const remove = async (c: C) => {
    if (!confirm(`Delete customer ${c.phone}?`)) return;
    const { error } = await supabase.from("customers").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Customers</h1>
        <div className="text-sm text-muted-foreground">{rows.length} total</div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
        <div className="flex justify-end mb-4">
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
                <th className="p-3">Address</th>
                <th className="p-3 text-center">Orders</th>
                <th className="p-3 text-right">Spent</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No customers yet</td></tr>
              ) : filtered.map((c, i) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3">{c.name || "—"}</td>
                  <td className="p-3">{c.phone}</td>
                  <td className="p-3 max-w-xs truncate">{c.address}</td>
                  <td className="p-3 text-center">{c.total_orders}</td>
                  <td className="p-3 text-right">৳{Number(c.total_spent).toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${c.is_blocked ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {c.is_blocked ? "Blocked" : "Active"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openView(c)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => toggleBlock(c)} title={c.is_blocked ? "Unblock" : "Block"}>
                        {c.is_blocked ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
          <DialogHeader><DialogTitle>{view?.name} ({view?.phone})</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Email:</span> {view?.email || "—"}</div>
            <div><span className="text-muted-foreground">Total Orders:</span> {view?.total_orders}</div>
            <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {view?.address}</div>
            <div><span className="text-muted-foreground">Total Spent:</span> ৳{Number(view?.total_spent ?? 0).toLocaleString()}</div>
            <div><span className="text-muted-foreground">Joined:</span> {view && new Date(view.created_at).toLocaleDateString()}</div>
          </div>
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Order History</h3>
            <div className="max-h-64 overflow-y-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr><th className="p-2 text-left">Invoice</th><th className="p-2 text-left">Status</th><th className="p-2 text-right">Total</th><th className="p-2 text-right">Date</th></tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.invoice_no} className="border-t">
                      <td className="p-2">{o.invoice_no}</td>
                      <td className="p-2 capitalize">{o.status}</td>
                      <td className="p-2 text-right">৳{Number(o.total).toLocaleString()}</td>
                      <td className="p-2 text-right text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
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
