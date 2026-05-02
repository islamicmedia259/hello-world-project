import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Package, Phone, MapPin, Calendar, CreditCard, Receipt, Truck, Home, ShoppingBag, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OrderData {
  id: string;
  invoice_no: string;
  customer_name: string;
  phone: string;
  address: string;
  total: number;
  shipping_cost: number | null;
  discount_amount: number | null;
  coupon_code: string | null;
  payment_method: string;
  payment_status: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface OrderItem {
  id: string;
  product_id?: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  image?: string | null;
}

export default function OrderConfirmation() {
  const { invoice } = useParams();
  const isPending = invoice?.startsWith("PENDING-");

  const [order, setOrder] = useState<OrderData | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPending || !invoice) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: o } = await supabase
        .from("orders")
        .select("*")
        .eq("invoice_no", invoice)
        .maybeSingle();
      if (o) {
        setOrder(o as any);
        const { data: its } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", (o as any).id);
        setItems((its as any) || []);
      }
      setLoading(false);
    })();
  }, [invoice, isPending]);

  if (isPending) {
    return (
      <div className="min-h-[80vh] bg-gradient-to-br from-amber-50 via-white to-orange-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 text-center border border-amber-100">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-amber-200 rounded-full blur-2xl opacity-50 animate-pulse" />
              <Clock className="relative h-20 w-20 text-amber-500 mx-auto" />
            </div>
            <h1 className="font-display font-bold text-3xl mb-3">পেমেন্ট ভেরিফিকেশনের অপেক্ষায়</h1>
            <p className="text-muted-foreground mb-2">আপনার পেমেন্ট সাবমিট হয়েছে। অ্যাডমিন ভেরিফাই করার পর অর্ডার কনফার্ম হবে।</p>
            <p className="mb-6">Reference: <span className="font-bold text-primary text-xl">#{invoice}</span></p>
            <Link to="/" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold hover:bg-primary-hover transition-smooth">
              <Home className="h-4 w-4" /> Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);
  const shipping = Number(order?.shipping_cost || 0);
  const discount = Number(order?.discount_amount || 0);
  const grandTotal = Number(order?.total || subtotal + shipping - discount);

  const dateStr = order?.created_at
    ? new Date(order.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "";

  const paymentLabel = (m?: string) => {
    switch (m) {
      case "cod": return "Cash on Delivery";
      case "bkash": return "bKash";
      case "nagad": return "Nagad";
      case "rocket": return "Rocket";
      default: return m || "—";
    }
  };

  return (
    <div className="min-h-[80vh] bg-gradient-to-br from-emerald-50/40 via-white to-blue-50/40 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Hero Success Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 rounded-3xl shadow-2xl p-8 md:p-12 text-white text-center">
          {/* Decorative blobs */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <Sparkles className="absolute top-6 right-6 h-6 w-6 text-yellow-200/70 animate-pulse" />
          <Sparkles className="absolute bottom-6 left-6 h-5 w-5 text-yellow-200/70 animate-pulse" />

          <div className="relative">
            <div className="inline-flex items-center justify-center mb-5">
              <div className="absolute w-28 h-28 bg-white/30 rounded-full blur-xl animate-pulse" />
              <div className="relative bg-white rounded-full p-4 shadow-2xl">
                <CheckCircle2 className="h-14 w-14 text-emerald-500" strokeWidth={2.5} />
              </div>
            </div>
            <h1 className="font-display font-bold text-3xl md:text-4xl mb-3 tracking-tight">
              ধন্যবাদ, {order?.customer_name?.split(" ")[0] || "প্রিয় গ্রাহক"}! 🎉
            </h1>
            <p className="text-emerald-50 text-base md:text-lg mb-1">
              আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে
            </p>
            <p className="text-emerald-100/90 text-sm mb-6">
              আগামী ২–৩ কার্যদিবসের মধ্যে আপনার ঠিকানায় পৌঁছে যাবে
            </p>

            <div className="inline-flex items-center gap-3 bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl px-6 py-3">
              <Receipt className="h-5 w-5 text-white" />
              <div className="text-left">
                <div className="text-xs text-emerald-100 uppercase tracking-wider">Invoice No.</div>
                <div className="font-bold text-xl tracking-wide">#{invoice}</div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center text-muted-foreground border">Loading order details...</div>
        ) : order ? (
          <>
            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <InfoTile icon={<Calendar className="h-4 w-4" />} label="Date" value={dateStr} />
              <InfoTile icon={<Phone className="h-4 w-4" />} label="Phone" value={order.phone} />
              <InfoTile icon={<CreditCard className="h-4 w-4" />} label="Payment" value={paymentLabel(order.payment_method)} />
              <InfoTile icon={<Package className="h-4 w-4" />} label="Total" value={`৳${grandTotal}`} highlight />
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b bg-gradient-to-r from-slate-50 to-white">
                <ShoppingBag className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-lg">Order Details</h2>
                <span className="ml-auto text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="divide-y">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                    {it.image ? (
                      <img src={it.image} alt={it.product_name} className="w-16 h-16 object-cover rounded-xl border" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                        <Package className="h-6 w-6 text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{it.product_name}</div>
                      <div className="text-sm text-muted-foreground">৳{Number(it.unit_price)} × {it.quantity}</div>
                    </div>
                    <div className="font-semibold text-primary">৳{Number(it.unit_price) * it.quantity}</div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="px-6 py-5 bg-gradient-to-br from-slate-50 to-white space-y-2 border-t">
                <Row label="Subtotal" value={`৳${subtotal}`} />
                <Row label="Shipping" value={shipping > 0 ? `৳${shipping}` : "ফ্রি ডেলিভারি"} accent={shipping === 0} />
                {discount > 0 && (
                  <Row label={`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`} value={`-৳${discount}`} discount />
                )}
                <div className="h-px bg-slate-200 my-2" />
                <div className="flex justify-between items-center pt-1">
                  <span className="font-bold text-base">Grand Total</span>
                  <span className="font-bold text-2xl text-primary">৳{grandTotal}</span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b bg-gradient-to-r from-slate-50 to-white">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-lg">Shipping Address</h2>
              </div>
              <div className="p-6">
                <div className="font-semibold mb-1">{order.customer_name}</div>
                <div className="text-sm text-muted-foreground mb-1">{order.phone}</div>
                <div className="text-sm leading-relaxed">{order.address}</div>
              </div>
            </div>

            {/* What's Next */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">এরপর কী হবে?</h3>
              </div>
              <ul className="space-y-2 text-sm text-blue-900/80">
                <li className="flex gap-2"><span className="text-blue-500">✓</span> আমরা শীঘ্রই কনফার্মেশন কলে যোগাযোগ করব</li>
                <li className="flex gap-2"><span className="text-blue-500">✓</span> অর্ডার প্রসেস হলে SMS পাবেন</li>
                <li className="flex gap-2"><span className="text-blue-500">✓</span> ২-৩ কার্যদিবসের মধ্যে ডেলিভারি</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center text-muted-foreground border">Order details not found.</div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link to="/" className="flex-1 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3.5 rounded-xl font-semibold hover:bg-primary-hover transition-smooth shadow-md hover:shadow-lg">
            <Home className="h-4 w-4" /> Continue Shopping
          </Link>
          <button
            onClick={() => window.print()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-6 py-3.5 rounded-xl font-semibold hover:bg-slate-50 transition-smooth"
          >
            <Receipt className="h-4 w-4" /> Print Invoice
          </button>
        </div>

      </div>
    </div>
  );
}

function InfoTile({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 border ${highlight ? "bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20" : "bg-white border-slate-200"}`}>
      <div className={`flex items-center gap-1.5 text-xs uppercase tracking-wide mb-1 ${highlight ? "text-primary" : "text-muted-foreground"}`}>
        {icon}{label}
      </div>
      <div className={`font-semibold text-sm truncate ${highlight ? "text-primary text-base" : ""}`}>{value}</div>
    </div>
  );
}

function Row({ label, value, accent, discount }: { label: string; value: string; accent?: boolean; discount?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${accent ? "text-emerald-600" : ""} ${discount ? "text-rose-600" : ""}`}>{value}</span>
    </div>
  );
}
