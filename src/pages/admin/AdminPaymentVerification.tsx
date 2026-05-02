import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, Eye, Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

type CartItem = { product_id: string; product_name: string; unit_price: number; quantity: number };
type PendingPayment = {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  notes: string | null;
  total: number;
  payment_method: string;
  transaction_id: string;
  cart_items: CartItem[];
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_order_id: string | null;
  created_at: string;
};

const STATUS_TABS = [
  { key: "pending", label: "Pending", icon: Clock, color: "text-amber-600 bg-amber-50" },
  { key: "approved", label: "Approved", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
  { key: "rejected", label: "Rejected", icon: XCircle, color: "text-rose-600 bg-rose-50" },
];

const PM_COLOR: Record<string, string> = {
  bkash: "bg-pink-100 text-pink-700 border-pink-300",
  nagad: "bg-orange-100 text-orange-700 border-orange-300",
  rocket: "bg-purple-100 text-purple-700 border-purple-300",
};

export default function AdminPaymentVerification() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [rows, setRows] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<PendingPayment | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pending_payments")
      .select("*")
      .eq("status", tab)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Payment Verification | Admin";
    load();
  }, [tab]);

  const approve = async (p: PendingPayment) => {
    if (!confirm(`Approve payment from ${p.customer_name}? Order will be created.`)) return;
    setBusyId(p.id);

    // 1. Create order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert([{
        customer_name: p.customer_name,
        phone: p.phone,
        address: p.address,
        total: p.total,
        payment_method: p.payment_method,
        transaction_id: p.transaction_id,
        payment_status: "approved",
        status: "processing",
        notes: p.notes,
      }])
      .select("id, invoice_no")
      .single();

    if (orderErr || !order) {
      toast.error("Failed to create order: " + (orderErr?.message || ""));
      setBusyId(null);
      return;
    }

    // 2. Insert order items
    const items = (p.cart_items || []).map((i) => ({
      order_id: order.id,
      product_id: i.product_id,
      product_name: i.product_name,
      unit_price: i.unit_price,
      quantity: i.quantity,
    }));
    if (items.length > 0) {
      const { error: itemsErr } = await supabase.from("order_items").insert(items);
      if (itemsErr) {
        toast.error("Order created but items failed: " + itemsErr.message);
      }
    }

    // 3. Mark pending as approved
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from("pending_payments")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
        created_order_id: order.id,
      })
      .eq("id", p.id);

    toast.success(`Approved! Invoice #${order.invoice_no} created.`);

    // Notifications: customer email + admin email + customer SMS
    try {
      const emailMatch = (p.notes || "").match(/Email:\s*([^\s\n]+@[^\s\n]+)/i);
      const { notifyPaymentVerified } = await import("@/lib/email");
      notifyPaymentVerified({
        invoice: order.invoice_no,
        customerName: p.customer_name,
        customerEmail: emailMatch ? emailMatch[1] : null,
        customerPhone: p.phone,
        address: p.address,
        paymentMethod: p.payment_method,
        items: (p.cart_items || []).map((i) => ({ name: i.product_name, qty: i.quantity, price: i.unit_price })),
        total: p.total,
      });
    } catch (_) { /* ignore */ }

    setBusyId(null);
    setView(null);
    load();
  };

  const reject = async (p: PendingPayment) => {
    const reason = prompt("Rejection reason (optional):") || "";
    if (!confirm(`Reject payment from ${p.customer_name}?`)) return;
    setBusyId(p.id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("pending_payments")
      .update({
        status: "rejected",
        rejection_reason: reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
      })
      .eq("id", p.id);
    if (error) toast.error(error.message);
    else { toast.success("Rejected"); setView(null); load(); }
    setBusyId(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-card p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl">Payment Verification</h1>
          <p className="text-sm text-slate-500 mt-1">কাস্টমারের পেমেন্ট ভেরিফাই করুন — Approve করলে অর্ডার তৈরি হবে</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-slate-50 text-sm">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-card p-2 flex gap-1">
        {STATUS_TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                active ? t.color : "text-slate-600 hover:bg-slate-50"
              }`}>
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No {tab} payments</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Txn ID</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.customer_name}</div>
                      <div className="text-xs text-slate-500">{p.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded border text-xs font-semibold capitalize ${PM_COLOR[p.payment_method] || "bg-slate-100 text-slate-700 border-slate-300"}`}>
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{p.transaction_id}</td>
                    <td className="px-4 py-3 font-bold text-primary">৳{p.total}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setView(p)} className="p-1.5 rounded hover:bg-slate-100" title="View">
                          <Eye className="h-4 w-4 text-slate-600" />
                        </button>
                        {tab === "pending" && (
                          <>
                            <button disabled={busyId === p.id} onClick={() => approve(p)}
                              className="p-1.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600 disabled:opacity-50" title="Approve">
                              <Check className="h-4 w-4" />
                            </button>
                            <button disabled={busyId === p.id} onClick={() => reject(p)}
                              className="p-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 disabled:opacity-50" title="Reject">
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {view && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setView(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-display font-bold text-lg">Payment Details</h3>
              <button onClick={() => setView(null)} className="p-1 hover:bg-slate-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><div className="text-slate-500">Customer</div><div className="font-medium">{view.customer_name}</div></div>
                <div><div className="text-slate-500">Phone</div><div className="font-medium">{view.phone}</div></div>
                <div className="col-span-2"><div className="text-slate-500">Address</div><div className="font-medium">{view.address}</div></div>
                <div>
                  <div className="text-slate-500">Payment Method</div>
                  <span className={`inline-block px-2 py-0.5 rounded border text-xs font-semibold capitalize ${PM_COLOR[view.payment_method] || "bg-slate-100"}`}>{view.payment_method}</span>
                </div>
                <div><div className="text-slate-500">Transaction ID</div><div className="font-mono font-semibold">{view.transaction_id}</div></div>
                <div><div className="text-slate-500">Total</div><div className="font-bold text-primary text-lg">৳{view.total}</div></div>
                <div><div className="text-slate-500">Submitted</div><div>{new Date(view.created_at).toLocaleString()}</div></div>
              </div>
              {view.notes && (
                <div className="text-sm"><div className="text-slate-500">Notes</div><div className="bg-slate-50 p-3 rounded">{view.notes}</div></div>
              )}
              <div>
                <div className="text-sm font-semibold mb-2">Cart Items</div>
                <div className="border rounded overflow-hidden">
                  {(view.cart_items || []).map((i, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 border-b last:border-0 text-sm">
                      <div>{i.product_name} <span className="text-slate-500">× {i.quantity}</span></div>
                      <div className="font-semibold">৳{i.unit_price * i.quantity}</div>
                    </div>
                  ))}
                </div>
              </div>
              {view.rejection_reason && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded text-sm">
                  <div className="font-semibold text-rose-700">Rejection Reason</div>
                  <div className="text-rose-600">{view.rejection_reason}</div>
                </div>
              )}
            </div>
            {view.status === "pending" && (
              <div className="p-5 border-t flex gap-3 sticky bottom-0 bg-white">
                <button disabled={busyId === view.id} onClick={() => approve(view)}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                  <Check className="h-4 w-4" /> Approve & Create Order
                </button>
                <button disabled={busyId === view.id} onClick={() => reject(view)}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-2.5 rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                  <X className="h-4 w-4" /> Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
