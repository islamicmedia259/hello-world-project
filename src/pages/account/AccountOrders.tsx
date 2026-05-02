import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Eye, FileText, Loader2 } from "lucide-react";

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-purple-100 text-purple-700",
  shipped: "bg-indigo-100 text-indigo-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

export default function AccountOrders() {
  const { session, profile } = useCustomerAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      setLoading(true);
      const phone = profile?.phone;
      let query = supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (phone) {
        query = query.or(`user_id.eq.${session.user.id},phone.eq.${phone}`);
      } else {
        query = query.eq("user_id", session.user.id);
      }
      const { data } = await query;
      setOrders((data as any[]) || []);
      setLoading(false);
    })();
  }, [session, profile]);

  return (
    <div className="bg-card border rounded-xl p-5">
      <h1 className="text-2xl font-bold mb-5">আমার অর্ডার</h1>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-3">কোনো অর্ডার পাওয়া যায়নি</p>
          <Link to="/shop" className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary-hover">এখনই কেনাকাটা করুন</Link>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="sm:hidden space-y-2.5">
            {orders.map((o) => (
              <Link
                key={o.id}
                to={`/account/orders/${o.invoice_no}`}
                className="block border rounded-lg p-3 hover:bg-secondary/40"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="text-primary font-semibold text-sm truncate">#{o.invoice_no}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(o.created_at).toLocaleDateString()} · {o.payment_method || "COD"}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize shrink-0 ${statusColor[o.status] || "bg-secondary"}`}>
                    {o.status}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="font-bold text-sm">৳{Number(o.total).toLocaleString()}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                    <Eye className="h-3.5 w-3.5" /> View
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="text-left">
                  <th className="p-3">Invoice</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t hover:bg-secondary/30">
                    <td className="p-3 font-semibold">#{o.invoice_no}</td>
                    <td className="p-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColor[o.status] || "bg-secondary"}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="p-3 capitalize text-muted-foreground">{o.payment_method || "COD"}</td>
                    <td className="p-3 text-right font-semibold">৳{Number(o.total).toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <Link to={`/account/orders/${o.invoice_no}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border text-xs hover:bg-secondary">
                        <Eye className="h-3.5 w-3.5" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
