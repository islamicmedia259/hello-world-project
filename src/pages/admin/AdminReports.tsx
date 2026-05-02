import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, TrendingUp, Package, ShoppingCart, DollarSign, Users, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from "recharts";

type Order = { id: string; total: number; status: string; created_at: string; phone: string; payment_status: string };
type OrderItem = { order_id: string; product_id: string | null; product_name: string; unit_price: number; quantity: number };
type Product = { id: string; name: string; price: number; discount_price: number | null; stock: number; sku: string | null; is_active: boolean };

const fmt = (n: number) => "৳" + Math.round(n).toLocaleString();
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const monthKey = (d: Date) => d.toISOString().slice(0, 7);
const yearKey = (d: Date) => d.toISOString().slice(0, 4);

export default function AdminReports() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7" | "30" | "90" | "365">("30");

  const loadData = async () => {
    const [{ data: o }, { data: it }, { data: p }] = await Promise.all([
      supabase.from("orders").select("id,total,status,created_at,phone,payment_status").order("created_at", { ascending: false }).limit(5000),
      supabase.from("order_items").select("order_id,product_id,product_name,unit_price,quantity").limit(20000),
      supabase.from("products").select("id,name,price,discount_price,stock,sku,is_active").limit(2000),
    ]);
    setOrders((o as any) || []);
    setItems((it as any) || []);
    setProducts((p as any) || []);
  };

  useEffect(() => {
    document.title = "Reports | Admin";
    (async () => { setLoading(true); await loadData(); setLoading(false); })();

    let t: any;
    const refetch = () => { clearTimeout(t); t = setTimeout(loadData, 400); };
    const channel = supabase
      .channel("admin-reports-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, refetch)
      .subscribe();
    return () => { clearTimeout(t); supabase.removeChannel(channel); };
  }, []);

  const stats = useMemo(() => {
    const valid = orders.filter((o) => o.status !== "cancelled");
    const today = new Date(); today.setHours(0,0,0,0);
    const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0,0,0,0);
    const startYear = new Date(today.getFullYear(), 0, 1);
    const todayOrders = valid.filter(o => new Date(o.created_at) >= today);
    const monthOrders = valid.filter(o => new Date(o.created_at) >= startMonth);
    const yearOrders = valid.filter(o => new Date(o.created_at) >= startYear);
    const sum = (arr: Order[]) => arr.reduce((s, o) => s + Number(o.total || 0), 0);
    const customers = new Set(valid.map(o => o.phone)).size;
    const stockValue = products.reduce((s, p) => s + Number(p.price || 0) * (p.stock || 0), 0);
    const stockUnits = products.reduce((s, p) => s + (p.stock || 0), 0);
    const lowStock = products.filter(p => p.is_active && (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5).length;
    const outOfStock = products.filter(p => p.is_active && (p.stock ?? 0) <= 0).length;
    return {
      todaySales: sum(todayOrders), todayCount: todayOrders.length,
      monthSales: sum(monthOrders), monthCount: monthOrders.length,
      yearSales: sum(yearOrders), yearCount: yearOrders.length,
      totalSales: sum(valid), totalCount: valid.length,
      pending: orders.filter(o => o.status === "pending").length,
      cancelled: orders.filter(o => o.status === "cancelled").length,
      delivered: orders.filter(o => o.status === "delivered").length,
      avgOrder: valid.length ? sum(valid) / valid.length : 0,
      customers, stockValue, stockUnits, lowStock, outOfStock,
      totalProducts: products.length, activeProducts: products.filter(p => p.is_active).length,
    };
  }, [orders, products]);

  const dailyChart = useMemo(() => {
    const days = parseInt(range);
    const map = new Map<string, { sales: number; orders: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      map.set(dayKey(d), { sales: 0, orders: 0 });
    }
    orders.filter(o => o.status !== "cancelled").forEach((o) => {
      const k = dayKey(new Date(o.created_at));
      const cur = map.get(k);
      if (cur) { cur.sales += Number(o.total || 0); cur.orders += 1; }
    });
    return Array.from(map.entries()).map(([date, v]) => ({ date: date.slice(5), sales: Math.round(v.sales), orders: v.orders }));
  }, [orders, range]);

  const monthlyChart = useMemo(() => {
    const map = new Map<string, { sales: number; orders: number }>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1);
      map.set(monthKey(d), { sales: 0, orders: 0 });
    }
    orders.filter(o => o.status !== "cancelled").forEach((o) => {
      const k = monthKey(new Date(o.created_at));
      const cur = map.get(k);
      if (cur) { cur.sales += Number(o.total || 0); cur.orders += 1; }
    });
    return Array.from(map.entries()).map(([m, v]) => ({ month: m, sales: Math.round(v.sales), orders: v.orders }));
  }, [orders]);

  const yearlyChart = useMemo(() => {
    const map = new Map<string, { sales: number; orders: number }>();
    orders.filter(o => o.status !== "cancelled").forEach((o) => {
      const k = yearKey(new Date(o.created_at));
      const cur = map.get(k) || { sales: 0, orders: 0 };
      cur.sales += Number(o.total || 0); cur.orders += 1;
      map.set(k, cur);
    });
    return Array.from(map.entries()).sort().map(([y, v]) => ({ year: y, sales: Math.round(v.sales), orders: v.orders }));
  }, [orders]);

  const topProducts = useMemo(() => {
    const validOrderIds = new Set(orders.filter(o => o.status !== "cancelled").map(o => o.id));
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    items.filter(i => validOrderIds.has(i.order_id)).forEach((i) => {
      const key = i.product_id || i.product_name;
      const cur = map.get(key) || { name: i.product_name, qty: 0, revenue: 0 };
      cur.qty += i.quantity; cur.revenue += Number(i.unit_price) * i.quantity;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [items, orders]);

  const lowStockProducts = useMemo(() =>
    products.filter(p => p.is_active && (p.stock ?? 0) <= 5).sort((a, b) => (a.stock || 0) - (b.stock || 0)).slice(0, 20),
  [products]);

  const exportCSV = (filename: string, rows: any[]) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="space-y-4"><h1 className="font-display font-bold text-2xl">Reports</h1><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({length:8}).map((_,i)=><div key={i} className="h-28 bg-secondary animate-pulse rounded-xl" />)}</div></div>;

  const cards = [
    { icon: DollarSign, label: "আজকের সেলস", val: fmt(stats.todaySales), sub: `${stats.todayCount} অর্ডার`, color: "bg-green-100 text-green-600" },
    { icon: TrendingUp, label: "মাসিক সেলস", val: fmt(stats.monthSales), sub: `${stats.monthCount} অর্ডার`, color: "bg-blue-100 text-blue-600" },
    { icon: TrendingUp, label: "বার্ষিক সেলস", val: fmt(stats.yearSales), sub: `${stats.yearCount} অর্ডার`, color: "bg-purple-100 text-purple-600" },
    { icon: ShoppingCart, label: "মোট সেলস", val: fmt(stats.totalSales), sub: `${stats.totalCount} অর্ডার`, color: "bg-orange-100 text-orange-600" },
    { icon: Package, label: "স্টক ভ্যালু", val: fmt(stats.stockValue), sub: `${stats.stockUnits} ইউনিট`, color: "bg-indigo-100 text-indigo-600" },
    { icon: Package, label: "মোট প্রোডাক্ট", val: String(stats.totalProducts), sub: `${stats.activeProducts} সক্রিয়`, color: "bg-cyan-100 text-cyan-600" },
    { icon: Users, label: "মোট কাস্টমার", val: String(stats.customers), sub: `গড় অর্ডার ${fmt(stats.avgOrder)}`, color: "bg-pink-100 text-pink-600" },
    { icon: AlertTriangle, label: "লো / আউট স্টক", val: `${stats.lowStock} / ${stats.outOfStock}`, sub: "মনোযোগ দিন", color: "bg-red-100 text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display font-bold text-2xl">Reports</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCSV(`orders-${Date.now()}.csv`, orders.map(o => ({ created_at: o.created_at, total: o.total, status: o.status, payment_status: o.payment_status, phone: o.phone })))}><Download className="h-4 w-4 mr-1" />Orders CSV</Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV(`products-${Date.now()}.csv`, products.map(p => ({ name: p.name, sku: p.sku, price: p.price, stock: p.stock, value: Number(p.price)*(p.stock||0), active: p.is_active })))}><Download className="h-4 w-4 mr-1" />Products CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-4 flex items-center gap-3">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${c.color}`}><c.icon className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-xl font-bold truncate">{c.val}</p>
              <p className="text-xs text-muted-foreground truncate">{c.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">দৈনিক</TabsTrigger>
          <TabsTrigger value="monthly">মাসিক</TabsTrigger>
          <TabsTrigger value="yearly">বার্ষিক</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-display font-bold">দৈনিক সেলস ট্রেন্ড</h3>
              <div className="flex gap-1">
                {(["7","30","90","365"] as const).map(r => (
                  <Button key={r} size="sm" variant={range === r ? "default" : "outline"} onClick={() => setRange(r)}>{r}d</Button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} name="Sales (৳)" />
                <Line type="monotone" dataKey="orders" stroke="hsl(var(--accent-foreground))" strokeWidth={2} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card className="p-5">
            <h3 className="font-display font-bold mb-4">গত ১২ মাসের সেলস</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="hsl(var(--primary))" name="Sales (৳)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="yearly">
          <Card className="p-5">
            <h3 className="font-display font-bold mb-4">বার্ষিক সেলস</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yearlyChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="year" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="hsl(var(--primary))" name="Sales (৳)" />
                <Bar dataKey="orders" fill="hsl(var(--secondary-foreground))" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-display font-bold mb-3">টপ ১০ প্রোডাক্ট (রেভিনিউ অনুযায়ী)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40"><tr><th className="p-2 text-left">প্রোডাক্ট</th><th className="p-2 text-right">পরিমাণ</th><th className="p-2 text-right">রেভিনিউ</th></tr></thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i} className="border-t"><td className="p-2 truncate max-w-xs">{p.name}</td><td className="p-2 text-right">{p.qty}</td><td className="p-2 text-right font-semibold">{fmt(p.revenue)}</td></tr>
                ))}
                {topProducts.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">কোন ডেটা নেই</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-bold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />লো স্টক প্রোডাক্ট</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40"><tr><th className="p-2 text-left">প্রোডাক্ট</th><th className="p-2 text-right">স্টক</th><th className="p-2 text-right">দাম</th></tr></thead>
              <tbody>
                {lowStockProducts.map((p) => (
                  <tr key={p.id} className="border-t"><td className="p-2 truncate max-w-xs">{p.name}</td><td className={`p-2 text-right font-bold ${(p.stock||0) <= 0 ? "text-red-600" : "text-orange-600"}`}>{p.stock || 0}</td><td className="p-2 text-right">{fmt(Number(p.price))}</td></tr>
                ))}
                {lowStockProducts.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">সব প্রোডাক্ট স্টকে আছে</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-yellow-600">{stats.pending}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Delivered</p><p className="text-2xl font-bold text-green-600">{stats.delivered}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Cancelled</p><p className="text-2xl font-bold text-red-600">{stats.cancelled}</p></Card>
      </div>
    </div>
  );
}
