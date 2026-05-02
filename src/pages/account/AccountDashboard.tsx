import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, Clock, CheckCircle2, Truck } from "lucide-react";

export default function AccountDashboard() {
  const { session, profile } = useCustomerAuth();
  const [stats, setStats] = useState({ total: 0, pending: 0, delivered: 0, processing: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      const phone = profile?.phone;
      let query = supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (phone) {
        query = query.or(`user_id.eq.${session.user.id},phone.eq.${phone}`);
      } else {
        query = query.eq("user_id", session.user.id);
      }
      const { data } = await query;
      const list = (data as any[]) || [];
      setRecent(list.slice(0, 5));
      setStats({
        total: list.length,
        pending: list.filter((o) => o.status === "pending").length,
        processing: list.filter((o) => ["processing", "confirmed"].includes(o.status)).length,
        delivered: list.filter((o) => o.status === "delivered").length,
      });
    })();
  }, [session, profile]);

  const cards = [
    { label: "মোট অর্ডার", value: stats.total, icon: ShoppingBag, color: "bg-blue-100 text-blue-600" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "bg-amber-100 text-amber-600" },
    { label: "Processing", value: stats.processing, icon: Truck, color: "bg-purple-100 text-purple-600" },
    { label: "Delivered", value: stats.delivered, icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">স্বাগতম, {profile?.display_name || "Customer"}!</h1>
        <p className="text-muted-foreground text-sm">আপনার একাউন্টের সারসংক্ষেপ</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-card border rounded-xl p-4">
            <div className={`inline-flex h-10 w-10 rounded-lg items-center justify-center ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold mt-2">{c.value}</div>
            <div className="text-xs text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">সাম্প্রতিক অর্ডার</h2>
          <Link to="/account/orders" className="text-sm text-primary hover:underline">সব দেখুন →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">কোনো অর্ডার নেই</p>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="sm:hidden space-y-2">
              {recent.map((o) => (
                <Link
                  key={o.id}
                  to={`/account/orders/${o.invoice_no}`}
                  className="block border rounded-lg p-3 hover:bg-secondary/40"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-primary font-semibold text-sm truncate">#{o.invoice_no}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-secondary capitalize shrink-0">{o.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</span>
                    <span className="font-bold text-foreground text-sm">৳{Number(o.total).toLocaleString()}</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr><th className="p-2 text-left">Invoice</th><th className="p-2 text-left">Status</th><th className="p-2 text-right">Total</th><th className="p-2 text-right">Date</th></tr>
                </thead>
                <tbody>
                  {recent.map((o) => (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-secondary/40">
                      <td className="p-2"><Link to={`/account/orders/${o.invoice_no}`} className="text-primary hover:underline font-medium">#{o.invoice_no}</Link></td>
                      <td className="p-2"><span className="px-2 py-0.5 rounded-full text-xs bg-secondary capitalize">{o.status}</span></td>
                      <td className="p-2 text-right font-semibold">৳{Number(o.total).toLocaleString()}</td>
                      <td className="p-2 text-right text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
