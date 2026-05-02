import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Eye, Edit, Trash2, Plus, Printer, Truck, UserPlus, Shield,
  ShieldCheck, ShieldAlert, Loader2,
  Search as SearchIcon, X
} from "lucide-react";

type FraudInfo = { loading?: boolean; rate?: number; total?: number; error?: boolean };
const FRAUD_CACHE_KEY = "fraud_cache_v2";
const FRAUD_TTL_MS = 1000 * 60 * 60 * 6; // 6h

function readFraudCache(): Record<string, { t: number; v: FraudInfo }> {
  try { return JSON.parse(sessionStorage.getItem(FRAUD_CACHE_KEY) || "{}"); } catch { return {}; }
}
function writeFraudCache(c: Record<string, { t: number; v: FraudInfo }>) {
  try { sessionStorage.setItem(FRAUD_CACHE_KEY, JSON.stringify(c)); } catch {}
}
function normalizePhone(p: string) {
  const d = (p || "").replace(/\D/g, "");
  return d.length > 11 ? d.slice(-11) : d;
}

const STATUSES = ["incomplete","pending","processing","on_the_way","on_hold","in_courier","completed","cancelled"] as const;
type Status = typeof STATUSES[number];

const STATUS_LABEL: Record<string, string> = {
  incomplete: "Incomplete", pending: "Pending", processing: "Processing",
  on_the_way: "On The Way", on_hold: "On Hold", in_courier: "In Courier",
  completed: "Completed", cancelled: "Cancelled",
};
const STATUS_COLOR: Record<string, string> = {
  incomplete: "bg-gray-100 text-gray-700",
  pending: "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  on_the_way: "bg-indigo-100 text-indigo-700",
  on_hold: "bg-orange-100 text-orange-700",
  in_courier: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

type OrderItemDraft = {
  id?: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
};

export default function AdminOrders() {
  const { status: routeStatus } = useParams();
  const nav = useNavigate();
  const filter = routeStatus as Status | undefined;

  const [orders, setOrders] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [modal, setModal] = useState<null | "status" | "assign" | "view" | "create">(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [courierCfg, setCourierCfg] = useState<any>({ pathao: {}, steadfast: {} });
  const [fraudMap, setFraudMap] = useState<Record<string, FraudInfo>>({});

  const load = async () => {
    let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (filter) q = q.eq("status", filter);
    const { data } = await q;
    setOrders(data || []);
    setSelected(new Set());
  };

  const loadStaff = async () => {
    const { data } = await supabase.from("user_roles").select("user_id, role").in("role", ["admin", "staff"]);
    setStaff(data || []);
  };

  useEffect(() => {
    document.title = `${filter ? STATUS_LABEL[filter] : "All"} Orders | Admin`;
    load();
    loadStaff();
  }, [filter]);

  useEffect(() => {
    const loadCfg = async () => {
      const { data } = await supabase.from("site_settings").select("api_keys").limit(1).maybeSingle();
      setCourierCfg((data?.api_keys as any)?.courier || {});
    };
    loadCfg();
    const ch = supabase
      .channel("admin-orders-courier-rt")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "site_settings" }, (payload: any) => {
        const next = (payload.new?.api_keys as any)?.courier;
        if (next) setCourierCfg(next);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return orders;
    const s = search.toLowerCase();
    return orders.filter((o) =>
      o.invoice_no?.toLowerCase().includes(s) ||
      o.customer_name?.toLowerCase().includes(s) ||
      o.phone?.includes(s)
    );
  }, [orders, search]);

  // Auto fraud-check: run for each unique phone in the visible orders (cached + throttled)
  useEffect(() => {
    const phones = Array.from(new Set(filtered.map((o) => normalizePhone(o.phone || "")).filter((p) => p.length >= 10)));
    if (phones.length === 0) return;
    const cache = readFraudCache();
    const now = Date.now();
    const initial: Record<string, FraudInfo> = {};
    const toFetch: string[] = [];
    for (const p of phones) {
      const c = cache[p];
      if (c && now - c.t < FRAUD_TTL_MS) initial[p] = c.v;
      else if (!fraudMap[p]) toFetch.push(p);
    }
    if (Object.keys(initial).length) setFraudMap((m) => ({ ...m, ...initial }));
    if (toFetch.length === 0) return;
    let cancelled = false;
    (async () => {
      setFraudMap((m) => {
        const n = { ...m };
        toFetch.forEach((p) => { n[p] = { loading: true }; });
        return n;
      });
      for (const phone of toFetch) {
        if (cancelled) return;
        try {
          const { data, error } = await supabase.functions.invoke("fraud-check", { body: { phone } });
          const info: FraudInfo = error || data?.error
            ? { error: true }
            : { rate: data?.summary?.successRate ?? 0, total: data?.summary?.total ?? 0 };
          if (cancelled) return;
          setFraudMap((m) => ({ ...m, [phone]: info }));
          const c2 = readFraudCache();
          c2[phone] = { t: Date.now(), v: info };
          writeFraudCache(c2);
        } catch {
          if (!cancelled) setFraudMap((m) => ({ ...m, [phone]: { error: true } }));
        }
        await new Promise((r) => setTimeout(r, 250));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);


  const allChecked = filtered.length > 0 && filtered.every((o) => selected.has(o.id));
  const toggleAll = () => {
    const ns = new Set(selected);
    if (allChecked) filtered.forEach((o) => ns.delete(o.id));
    else filtered.forEach((o) => ns.add(o.id));
    setSelected(ns);
  };
  const toggleOne = (id: string) => {
    const ns = new Set(selected);
    ns.has(id) ? ns.delete(id) : ns.add(id);
    setSelected(ns);
  };

  const requireSelection = () => {
    if (selected.size === 0) { toast.error("Select at least one order"); return false; }
    return true;
  };

  const bulkChangeStatus = async (newStatus: Status) => {
    if (!requireSelection()) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from("orders").update({ status: newStatus as any }).in("id", ids);
    if (error) { toast.error(error.message); return; }
    toast.success(`Updated ${ids.length} orders`);
    // Send customer email + SMS for each updated order (fire-and-forget)
    try {
      const { data: list } = await supabase
        .from("orders")
        .select("invoice_no, customer_name, phone, notes, total")
        .in("id", ids);
      if (list && list.length) {
        const { notifyOrderStatusChanged } = await import("@/lib/email");
        list.forEach((o: any) => {
          const email = (o.notes || "").match(/Email:\s*([^\s\n]+@[^\s\n]+)/i)?.[1] || null;
          notifyOrderStatusChanged({
            invoice: o.invoice_no,
            customerName: o.customer_name,
            customerEmail: email,
            customerPhone: o.phone,
            total: o.total,
            status: newStatus,
          });
        });
      }
    } catch (_) { /* ignore */ }
    load();
    setModal(null);
  };

  const bulkDelete = async () => {
    if (!requireSelection()) return;
    if (!confirm(`Delete ${selected.size} orders? This cannot be undone.`)) return;
    const { error } = await supabase.from("orders").delete().in("id", Array.from(selected));
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const bulkAssign = async (userId: string) => {
    if (!requireSelection()) return;
    const { error } = await supabase.from("orders").update({ assigned_to: userId }).in("id", Array.from(selected));
    if (error) toast.error(error.message); else { toast.success("Assigned"); load(); setModal(null); }
  };

  const sendToCourier = async (provider: "steadfast" | "pathao" | "redx" | "carrybee") => {
    if (!requireSelection()) return;
    const cfg = courierCfg?.[provider] || {};
    if (!cfg.enabled) {
      toast.error(`${provider} disabled`, { description: "Enable it from Admin → Courier API" });
      return;
    }
    const ids = Array.from(selected);
    const body: any = { order_ids: ids };
    if (provider === "pathao") {
      if (!cfg.store_id) {
        toast.error("Pathao Store ID missing", { description: "Set Default Store ID in Admin → Courier API" });
        return;
      }
      body.store_id = cfg.store_id;
    }
    toast.loading(`Sending to ${provider}...`, { id: "courier" });
    const { data, error } = await supabase.functions.invoke(`${provider}-send`, { body });
    if (error) { toast.error(error.message, { id: "courier" }); return; }
    const ok = (data?.results || []).filter((r: any) => r.ok).length;
    const fail = (data?.results || []).length - ok;
    toast.success(`${ok} sent, ${fail} failed`, { id: "courier" });
    load();
  };

  const printOrders = () => {
    if (!requireSelection()) return;
    const list = filtered.filter((o) => selected.has(o.id));
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(`<html><head><title>Print Orders</title><style>
      body{font-family:Arial,sans-serif;padding:20px}
      .invoice{border:1px solid #ddd;padding:16px;margin-bottom:16px;page-break-after:always}
      h2{margin:0 0 8px} .row{display:flex;justify-content:space-between;font-size:13px}
      table{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}
      td,th{border:1px solid #ddd;padding:6px;text-align:left}
    </style></head><body>${
      list.map((o) => `
        <div class="invoice">
          <h2>Navigator Series Book</h2>
          <div class="row"><b>Invoice:</b><span>#${o.invoice_no}</span></div>
          <div class="row"><b>Date:</b><span>${new Date(o.created_at).toLocaleString()}</span></div>
          <div class="row"><b>Customer:</b><span>${o.customer_name}</span></div>
          <div class="row"><b>Phone:</b><span>${o.phone}</span></div>
          <div class="row"><b>Address:</b><span>${o.address}</span></div>
          <div class="row"><b>Total:</b><span>৳${o.total}</span></div>
          <div class="row"><b>Status:</b><span>${STATUS_LABEL[o.status]}</span></div>
        </div>`).join("")
    }<script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
  };

  const openView = async (o: any) => {
    setActiveOrder(o);
    setModal("view");
  };

  const updateOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    // Customer email + SMS only — NO admin email on status change
    try {
      const { data: o } = await supabase.from("orders").select("invoice_no, customer_name, phone, notes, total").eq("id", id).maybeSingle();
      if (o) {
        const email = ((o as any).notes || "").match(/Email:\s*([^\s\n]+@[^\s\n]+)/i)?.[1] || null;
        const { notifyOrderStatusChanged } = await import("@/lib/email");
        notifyOrderStatusChanged({
          invoice: (o as any).invoice_no,
          customerName: (o as any).customer_name,
          customerEmail: email,
          customerPhone: (o as any).phone,
          total: (o as any).total,
          status,
        });
      }
    } catch (_) { /* ignore */ }
    load();
  };

  const delOne = async (id: string) => {
    if (!confirm("Delete this order?")) return;
    await supabase.from("orders").delete().eq("id", id);
    load();
  };

  const title = filter ? STATUS_LABEL[filter] : "All Order";

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-card p-5 flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl">{title} ({filtered.length})</h1>
        <button onClick={() => { setActiveOrder(null); setModal("create"); }} className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-5 py-2.5 font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add New
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-card p-5 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={() => setModal("assign")} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-4 py-2 text-sm font-medium flex items-center gap-2"><UserPlus className="h-4 w-4" /> Assign User</button>
          <button onClick={() => setModal("status")} className="bg-violet-500 hover:bg-violet-600 text-white rounded-full px-4 py-2 text-sm font-medium flex items-center gap-2"><Plus className="h-4 w-4" /> Change Status</button>
          <button onClick={bulkDelete} className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-4 py-2 text-sm font-medium flex items-center gap-2"><Trash2 className="h-4 w-4" /> Delete All</button>
          <button onClick={printOrders} className="bg-sky-500 hover:bg-sky-600 text-white rounded-full px-4 py-2 text-sm font-medium flex items-center gap-2"><Printer className="h-4 w-4" /> Print</button>
          <button onClick={() => sendToCourier("steadfast")} disabled={!courierCfg?.steadfast?.enabled} className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-full px-4 py-2 text-sm font-medium flex items-center gap-2"><Truck className="h-4 w-4" /> Steadfast</button>
          <button onClick={() => sendToCourier("pathao")} disabled={!courierCfg?.pathao?.enabled} className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-full px-4 py-2 text-sm font-medium flex items-center gap-2"><Truck className="h-4 w-4" /> Pathao</button>
          <button onClick={() => sendToCourier("redx")} disabled={!courierCfg?.redx?.enabled} className="bg-red-500 hover:bg-red-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-full px-4 py-2 text-sm font-medium flex items-center gap-2"><Truck className="h-4 w-4" /> RedX</button>
          <button onClick={() => sendToCourier("carrybee")} disabled={!courierCfg?.carrybee?.enabled} className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-full px-4 py-2 text-sm font-medium flex items-center gap-2"><Truck className="h-4 w-4" /> CarryBee</button>
          <div className="ml-auto flex items-center gap-2">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
              placeholder="Search invoice, name, phone"
              className="px-4 py-2 border rounded-full text-sm w-64 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
            />
            <button onClick={() => setSearch(searchInput)} className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full px-5 py-2 text-sm font-medium flex items-center gap-2">
              <SearchIcon className="h-4 w-4" /> Search
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-3 text-left"><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
                <th className="p-3 text-left">SL</th>
                <th className="p-3 text-left">Action</th>
                <th className="p-3 text-left">Invoice</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left">Assign</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Shipping</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => (
                <tr key={o.id} className="border-t hover:bg-slate-50">
                  <td className="p-3"><input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleOne(o.id)} /></td>
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1 text-slate-500">
                      <button onClick={() => openView(o)} title="View / Edit"><Eye className="h-4 w-4 hover:text-cyan-600" /></button>
                      <button onClick={() => openView(o)} title="Edit"><Edit className="h-4 w-4 hover:text-blue-600" /></button>
                      <button onClick={() => delOne(o.id)} title="Delete"><Trash2 className="h-4 w-4 hover:text-rose-600" /></button>
                    </div>
                  </td>
                  <td className="p-3 font-mono">{o.invoice_no}</td>
                  <td className="p-3 text-xs text-slate-600">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="p-3 font-semibold">{o.customer_name}<div className="text-xs text-slate-500 font-normal max-w-[200px] truncate">{o.address}</div></td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{o.phone}</span>
                      {(() => {
                        const f = fraudMap[normalizePhone(o.phone || "")];
                        if (!f) return null;
                        if (f.loading) return <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />;
                        if (f.error) return <span title="Check failed" className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">N/A</span>;
                        if (!f.total) return <span title="No courier history" className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">New</span>;
                        const rate = f.rate || 0;
                        const cls = rate >= 80 ? "bg-emerald-100 text-emerald-700" : rate >= 50 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700";
                        const Icon = rate >= 80 ? ShieldCheck : rate >= 50 ? Shield : ShieldAlert;
                        return (
                          <span title={`${f.total} orders • ${rate}% delivered`} className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cls}`}>
                            <Icon className="h-3 w-3" /> {rate}%
                          </span>
                        );
                      })()}
                      <a
                        href={`/admin/fraud-check?phone=${encodeURIComponent(o.phone || "")}`}
                        title="Full Fraud Report"
                        className="text-slate-400 hover:text-amber-600"
                        onClick={(e) => { e.stopPropagation(); }}
                      >
                        <Shield className="h-4 w-4" />
                      </a>
                    </div>
                  </td>
                  <td className="p-3 text-xs text-slate-500">{o.assigned_to ? "Assigned" : "—"}</td>
                  <td className="p-3 font-semibold">৳{o.total}</td>
                  <td className="p-3">৳{o.shipping_cost || 0}</td>
                  <td className="p-3">
                    <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                      className={`text-xs rounded-full px-3 py-1 border-0 font-medium ${STATUS_COLOR[o.status]}`}>
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={11} className="p-10 text-center text-slate-500">No orders</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal === "status" && (
        <Modal title="Change Status" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600 mb-4">Apply to {selected.size} selected order(s):</p>
          <div className="grid grid-cols-2 gap-2">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => bulkChangeStatus(s)}
                className={`px-3 py-2 rounded-md text-sm font-medium ${STATUS_COLOR[s]} hover:opacity-80`}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {modal === "assign" && (
        <Modal title="Assign User" onClose={() => setModal(null)}>
          <p className="text-sm text-slate-600 mb-4">Assign {selected.size} order(s) to:</p>
          {staff.length === 0 ? (
            <p className="text-sm text-slate-500">No admin/staff users yet.</p>
          ) : (
            <div className="space-y-2">
              {staff.map((u) => (
                <button key={u.user_id} onClick={() => bulkAssign(u.user_id)}
                  className="w-full text-left px-4 py-3 border rounded-md hover:bg-slate-50">
                  <span className="font-mono text-xs text-slate-500">{u.user_id.slice(0, 8)}</span>
                  <span className="ml-3 text-xs px-2 py-0.5 rounded-full bg-slate-100">{u.role}</span>
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}

      {modal === "view" && activeOrder && (
        <OrderEditor mode="edit" order={activeOrder} onClose={() => { setModal(null); load(); }} />
      )}

      {modal === "create" && (
        <OrderEditor mode="create" onClose={() => { setModal(null); load(); }} />
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg">{title}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-500" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function OrderEditor({ mode, order, onClose }: { mode: "create" | "edit"; order?: any; onClose: () => void }) {
  const [form, setForm] = useState({
    customer_name: order?.customer_name || "",
    phone: order?.phone || "",
    address: order?.address || "",
    shipping_cost: order?.shipping_cost ?? 0,
    discount: order?.discount ?? 0,
    notes: order?.notes || "",
    payment_method: order?.payment_method || "cod",
    payment_status: order?.payment_status || "pending",
    transaction_id: order?.transaction_id || "",
    status: (order?.status as Status) || "pending",
  });
  const [items, setItems] = useState<OrderItemDraft[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("products").select("id,name,price,discount_price,sku").eq("is_active", true).order("name").limit(500);
      setProducts(data || []);
      if (mode === "edit" && order) {
        const { data: its } = await supabase.from("order_items").select("*").eq("order_id", order.id);
        setItems((its || []).map((i: any) => ({ id: i.id, product_id: i.product_id, product_name: i.product_name, quantity: i.quantity, unit_price: Number(i.unit_price) })));
      }
    })();
  }, [mode, order?.id]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 20);
    const s = productSearch.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s)).slice(0, 20);
  }, [products, productSearch]);

  const addProduct = (p: any) => {
    const price = Number(p.discount_price ?? p.price);
    const existing = items.find((i) => i.product_id === p.id);
    if (existing) {
      setItems(items.map((i) => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { product_id: p.id, product_name: p.name, quantity: 1, unit_price: price }]);
    }
    setProductSearch("");
  };

  const updateItem = (idx: number, patch: Partial<OrderItemDraft>) => {
    setItems(items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const addCustomItem = () => setItems([...items, { product_id: null, product_name: "", quantity: 1, unit_price: 0 }]);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const total = Math.max(0, subtotal + Number(form.shipping_cost || 0) - Number(form.discount || 0));

  const save = async () => {
    if (!form.customer_name.trim() || !form.phone.trim() || !form.address.trim()) {
      toast.error("Name, phone & address are required"); return;
    }
    if (items.length === 0) { toast.error("Add at least one item"); return; }
    if (items.some((i) => !i.product_name.trim() || i.quantity < 1 || i.unit_price < 0)) {
      toast.error("Invalid item details"); return;
    }
    setSaving(true);
    try {
      if (mode === "create") {
        const invoice_no = `${Date.now()}`.slice(-10);
        const { data: created, error } = await supabase.from("orders").insert({
          customer_name: form.customer_name,
          phone: form.phone,
          address: form.address,
          shipping_cost: Number(form.shipping_cost) || 0,
          discount: Number(form.discount) || 0,
          notes: form.notes || null,
          payment_method: form.payment_method || null,
          payment_status: form.payment_status,
          transaction_id: form.transaction_id || null,
          status: form.status as any,
          total,
          invoice_no,
        }).select().single();
        if (error) throw error;
        const { error: iErr } = await supabase.from("order_items").insert(
          items.map((i) => ({
            order_id: created.id,
            product_id: i.product_id || null,
            product_name: i.product_name,
            quantity: i.quantity,
            unit_price: i.unit_price,
          }))
        );
        if (iErr) throw iErr;
        toast.success("Order created");
      } else {
        const { error } = await supabase.from("orders").update({
          customer_name: form.customer_name,
          phone: form.phone,
          address: form.address,
          shipping_cost: Number(form.shipping_cost) || 0,
          discount: Number(form.discount) || 0,
          notes: form.notes || null,
          payment_method: form.payment_method || null,
          payment_status: form.payment_status,
          transaction_id: form.transaction_id || null,
          status: form.status as any,
          total,
        }).eq("id", order.id);
        if (error) throw error;
        // Replace items: delete existing then re-insert
        await supabase.from("order_items").delete().eq("order_id", order.id);
        const { error: iErr } = await supabase.from("order_items").insert(
          items.map((i) => ({
            order_id: order.id,
            product_id: i.product_id || null,
            product_name: i.product_name,
            quantity: i.quantity,
            unit_price: i.unit_price,
          }))
        );
        if (iErr) throw iErr;
        toast.success("Order updated");
      }
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const title = mode === "create" ? "Create New Order" : `Edit Order #${order?.invoice_no}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full p-6 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg">{title}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-500" /></button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Customer Name *</label>
            <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Phone *</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1">Address *</label>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" rows={2} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Payment Method</label>
            <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm">
              <option value="cod">COD</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="rocket">Rocket</option>
              <option value="bank">Bank</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Payment Status</label>
            <select value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm">
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Transaction ID</label>
            <input value={form.transaction_id} onChange={(e) => setForm({ ...form, transaction_id: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })} className="w-full px-3 py-2 border rounded-md text-sm">
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border rounded-md text-sm" rows={2} />
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm">Items</h3>
            <button onClick={addCustomItem} className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200">+ Custom Item</button>
          </div>

          <div className="relative mb-3">
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search product to add…"
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
            {productSearch && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredProducts.length === 0 && <div className="p-3 text-xs text-slate-500">No matches</div>}
                {filteredProducts.map((p) => (
                  <button key={p.id} type="button" onClick={() => addProduct(p)} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex justify-between">
                    <span>{p.name}</span>
                    <span className="text-slate-500">৳{Number(p.discount_price ?? p.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs">
                <tr>
                  <th className="p-2 text-left">Product</th>
                  <th className="p-2 w-20 text-right">Qty</th>
                  <th className="p-2 w-28 text-right">Price</th>
                  <th className="p-2 w-28 text-right">Subtotal</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">
                      <input value={it.product_name} onChange={(e) => updateItem(idx, { product_name: e.target.value })} className="w-full px-2 py-1 border rounded text-sm" />
                    </td>
                    <td className="p-2">
                      <input type="number" min={1} value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Math.max(1, Number(e.target.value)) })} className="w-full px-2 py-1 border rounded text-sm text-right" />
                    </td>
                    <td className="p-2">
                      <input type="number" min={0} value={it.unit_price} onChange={(e) => updateItem(idx, { unit_price: Math.max(0, Number(e.target.value)) })} className="w-full px-2 py-1 border rounded text-sm text-right" />
                    </td>
                    <td className="p-2 text-right font-medium">৳{(it.quantity * it.unit_price).toFixed(0)}</td>
                    <td className="p-2 text-center">
                      <button onClick={() => removeItem(idx)} className="text-rose-500 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-xs text-slate-500">No items added</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="grid md:grid-cols-3 gap-3 mt-4">
            <div>
              <label className="block text-xs font-medium mb-1">Shipping Cost</label>
              <input type="number" value={form.shipping_cost} onChange={(e) => setForm({ ...form, shipping_cost: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Discount</label>
              <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>
            <div className="flex flex-col justify-end">
              <div className="text-xs text-slate-500">Subtotal: ৳{subtotal.toFixed(0)}</div>
              <div className="text-lg font-bold">Total: ৳{total.toFixed(0)}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button disabled={saving} onClick={save} className="flex-1 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-300 text-white py-2.5 rounded-md font-semibold">
            {saving ? "Saving…" : (mode === "create" ? "Create Order" : "Save Changes")}
          </button>
          <button onClick={onClose} className="px-6 bg-slate-100 hover:bg-slate-200 rounded-md font-medium">Cancel</button>
        </div>
      </div>
    </div>
  );
}
