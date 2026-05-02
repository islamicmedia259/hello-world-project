import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, ShoppingBag, Database, Users } from "lucide-react";

interface Stats { totalOrders: number; todayOrders: number; products: number; customers: number; }

export default function AdminDashboard() {
  const [s, setS] = useState<Stats>({ totalOrders: 0, todayOrders: 0, products: 0, customers: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    document.title = "Dashboard | Admin";
    (async () => {
      const startToday = new Date(); startToday.setHours(0,0,0,0);
      const [{ count: totalOrders }, { count: todayOrders }, { count: products }, { data: orders }] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }).gte("created_at", startToday.toISOString()),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("id, invoice_no, customer_name, total, status, created_at").order("created_at", { ascending: false }).limit(5),
      ]);
      // distinct customers by phone
      const { data: phones } = await supabase.from("orders").select("phone");
      const customers = new Set((phones || []).map((p: any) => p.phone)).size;
      setS({ totalOrders: totalOrders || 0, todayOrders: todayOrders || 0, products: products || 0, customers });
      setRecent(orders || []);
    })();
  }, []);

  const cards = [
    { icon: ShoppingCart, label: "Total Orders", val: s.totalOrders, color: "bg-purple-100 text-purple-600" },
    { icon: ShoppingBag, label: "Today's Orders", val: s.todayOrders, color: "bg-green-100 text-green-600" },
    { icon: Database, label: "Products", val: s.products, color: "bg-blue-100 text-blue-600" },
    { icon: Users, label: "Customers", val: s.customers, color: "bg-orange-100 text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display font-bold text-2xl">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-card rounded-xl p-5 shadow-card flex items-center gap-4">
            <div className={`h-14 w-14 rounded-full flex items-center justify-center ${c.color}`}>
              <c.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-bold">{c.val}</p>
              <p className="text-sm text-muted-foreground">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <h3 className="font-display font-bold text-lg p-5 border-b">Latest 5 Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left">
              <tr><th className="p-3">Invoice</th><th className="p-3">Customer</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Date</th></tr>
            </thead>
            <tbody>
              {recent.map((o: any) => (
                <tr key={o.id} className="border-t">
                  <td className="p-3 font-mono">#{o.invoice_no}</td>
                  <td className="p-3">{o.customer_name}</td>
                  <td className="p-3 font-semibold">৳{o.total}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded-full text-xs bg-primary-soft text-primary capitalize">{o.status}</span></td>
                  <td className="p-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {recent.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No orders yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
