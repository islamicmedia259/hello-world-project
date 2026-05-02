import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { ArrowLeft, Printer, Loader2, Package } from "lucide-react";

export default function AccountOrderDetail() {
  const { invoice } = useParams();
  const { session } = useCustomerAuth();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user || !invoice) return;
    (async () => {
      setLoading(true);
      const { data: o } = await supabase.from("orders").select("*").eq("invoice_no", invoice).maybeSingle();
      if (o) {
        setOrder(o);
        const { data: it } = await supabase.from("order_items").select("*").eq("order_id", o.id);
        setItems((it as any[]) || []);
      }
      const { data: s } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
      setSiteSettings(s);
      setLoading(false);
    })();
  }, [invoice, session]);

  if (loading) {
    return <div className="bg-card border rounded-xl p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!order) {
    return (
      <div className="bg-card border rounded-xl p-12 text-center">
        <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">অর্ডার পাওয়া যায়নি</p>
        <Link to="/account/orders" className="text-primary hover:underline text-sm mt-2 inline-block">← অর্ডার লিস্টে ফিরে যান</Link>
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center print:hidden">
        <Link to="/account/orders" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> অর্ডার লিস্টে ফিরে যান
        </Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary-hover">
          <Printer className="h-4 w-4" /> Print Invoice
        </button>
      </div>

      <div className="bg-card border rounded-xl p-6 sm:p-8 print:shadow-none print:border-0">
        {/* Invoice Header */}
        <div className="flex justify-between items-start pb-5 border-b">
          <div>
            {siteSettings?.logo_url && <img src={siteSettings.logo_url} alt="" className="h-12 mb-2" />}
            <h2 className="font-bold text-lg">{siteSettings?.site_name || "Store"}</h2>
            {siteSettings?.address && <p className="text-xs text-muted-foreground max-w-xs">{siteSettings.address}</p>}
            {siteSettings?.contact_phone && <p className="text-xs text-muted-foreground">📞 {siteSettings.contact_phone}</p>}
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold">INVOICE</h1>
            <p className="text-sm font-mono mt-1">#{order.invoice_no}</p>
            <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-secondary capitalize">{order.status}</span>
          </div>
        </div>

        {/* Customer */}
        <div className="grid sm:grid-cols-2 gap-4 py-5 border-b">
          <div>
            <h3 className="text-xs uppercase text-muted-foreground font-semibold mb-1">Bill To</h3>
            <p className="font-semibold">{order.customer_name}</p>
            <p className="text-sm text-muted-foreground">{order.phone}</p>
            <p className="text-sm text-muted-foreground">{order.address}</p>
          </div>
          <div className="sm:text-right">
            <h3 className="text-xs uppercase text-muted-foreground font-semibold mb-1">Payment</h3>
            <p className="font-semibold capitalize">{order.payment_method || "Cash on Delivery"}</p>
            <p className="text-sm text-muted-foreground capitalize">Status: {order.payment_status}</p>
            {order.transaction_id && <p className="text-xs text-muted-foreground">TXN: {order.transaction_id}</p>}
          </div>
        </div>

        {/* Items */}
        <div className="py-5">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-left">
                <th className="py-2">Product</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Price</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b">
                  <td className="py-2.5">{i.product_name}</td>
                  <td className="py-2.5 text-center">{i.quantity}</td>
                  <td className="py-2.5 text-right">৳{Number(i.unit_price).toLocaleString()}</td>
                  <td className="py-2.5 text-right">৳{(Number(i.unit_price) * Number(i.quantity)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full sm:w-72 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>৳{subtotal.toLocaleString()}</span></div>
            {Number(order.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-600"><span>Discount {order.coupon_code && `(${order.coupon_code})`}</span><span>-৳{Number(order.discount_amount).toLocaleString()}</span></div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>৳{Number(order.shipping_cost).toLocaleString()}</span></div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>Total</span><span>৳{Number(order.total).toLocaleString()}</span></div>
          </div>
        </div>

        {order.notes && (
          <div className="mt-5 pt-4 border-t">
            <h3 className="text-xs uppercase text-muted-foreground font-semibold mb-1">Notes</h3>
            <p className="text-sm whitespace-pre-line">{order.notes}</p>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6 pt-4 border-t">Thank you for your purchase!</p>
      </div>
    </div>
  );
}
