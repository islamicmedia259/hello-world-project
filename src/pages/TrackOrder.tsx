import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Truck, Search, Package, MapPin, Phone, Calendar, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";

type OrderResult = {
  invoice_no: string;
  customer_name: string;
  phone: string;
  address: string;
  status: string;
  total: number;
  shipping_cost: number;
  discount_amount: number;
  payment_method: string | null;
  payment_status: string;
  created_at: string;
  notes: string | null;
  items: { product_name: string; unit_price: number; quantity: number }[];
};

const statusColor = (s: string) => {
  const k = s.toLowerCase();
  if (["delivered", "completed"].includes(k)) return "bg-emerald-100 text-emerald-700 border-emerald-300";
  if (["cancelled", "failed", "returned"].includes(k)) return "bg-rose-100 text-rose-700 border-rose-300";
  if (["shipped", "in_transit", "courier"].includes(k)) return "bg-blue-100 text-blue-700 border-blue-300";
  if (["processing", "confirmed"].includes(k)) return "bg-indigo-100 text-indigo-700 border-indigo-300";
  return "bg-amber-100 text-amber-700 border-amber-300";
};

const statusIcon = (s: string) => {
  const k = s.toLowerCase();
  if (["delivered", "completed"].includes(k)) return <CheckCircle2 className="h-4 w-4" />;
  if (["cancelled", "failed", "returned"].includes(k)) return <XCircle className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
};

export default function TrackOrder() {
  const [params] = useSearchParams();
  const [invoice, setInvoice] = useState(params.get("inv") || "");
  const [phone, setPhone] = useState(params.get("phone") || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrderResult | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    document.title = "Track Order | Navigator Series Book";
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const inv = invoice.trim();
    const ph = phone.trim();
    if (!inv || !ph) {
      toast.error("Invoice নাম্বর এবং ফোন নাম্বর দিন");
      return;
    }
    setLoading(true);
    setSearched(true);
    setResult(null);
    const { data, error } = await supabase.rpc("track_order", { _invoice: inv, _phone: ph });
    setLoading(false);
    if (error) {
      toast.error("সমস্যা হয়েছে, পরে আবার চেষ্টা করুন");
      return;
    }
    if (!data) {
      toast.error("কোনো অর্ডার পাওয়া যায়নি", { description: "Invoice ও ফোন নাম্বর সঠিক কিনা যাচাই করুন" });
      return;
    }
    setResult(data as unknown as OrderResult);
  };

  return (
    <div className="container-page py-8 max-w-3xl">
      <div className="text-center mb-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
          <Truck className="h-7 w-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">অর্ডার ট্র্যাক করুন</h1>
        <p className="text-sm text-muted-foreground mt-1">Invoice নাম্বর এবং ফোন নাম্বর দিয়ে আপনার অর্ডারের স্ট্যাটাস দেখুন</p>
      </div>

      <form onSubmit={submit} className="bg-card border rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="invoice">Invoice নাম্বর</Label>
            <Input
              id="invoice"
              value={invoice}
              onChange={(e) => setInvoice(e.target.value)}
              placeholder="যেমন: 26043012345"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">ফোন নাম্বর</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="017XXXXXXXX"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
          {loading ? "খোঁজা হচ্ছে..." : "অর্ডার খুঁজুন"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Invoice নাম্বর আপনার অর্ডার কনফার্মেশন পেজ অথবা SMS-এ পাবেন
        </p>
      </form>

      {searched && !loading && !result && (
        <div className="mt-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-5 text-center">
          <XCircle className="h-10 w-10 mx-auto mb-2 text-rose-500" />
          <p className="font-semibold">কোনো অর্ডার পাওয়া যায়নি</p>
          <p className="text-sm mt-1">Invoice নাম্বর এবং ফোন নাম্বর সঠিক কিনা আবার যাচাই করুন</p>
        </div>
      )}

      {result && (
        <div className="mt-6 bg-card border rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-secondary/30 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Invoice No</div>
              <div className="font-bold text-lg">#{result.invoice_no}</div>
            </div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold ${statusColor(result.status)}`}>
              {statusIcon(result.status)}
              {result.status.toUpperCase()}
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-muted-foreground">অর্ডার তারিখ</div>
                  <div className="font-medium">{new Date(result.created_at).toLocaleString("bn-BD")}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-muted-foreground">ফোন</div>
                  <div className="font-medium">{result.phone}</div>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-muted-foreground">ঠিকানা</div>
                  <div className="font-medium">{result.customer_name} — {result.address}</div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">অর্ডার আইটেম</h3>
              </div>
              <div className="space-y-2">
                {result.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between bg-secondary/30 rounded-lg px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium">{it.product_name}</div>
                      <div className="text-xs text-muted-foreground">৳{it.unit_price} × {it.quantity}</div>
                    </div>
                    <div className="font-semibold">৳{(it.unit_price * it.quantity).toFixed(0)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 space-y-1.5 text-sm">
              {result.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>ডিসকাউন্ট</span>
                  <span>− ৳{result.discount_amount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">ডেলিভারি চার্জ</span>
                <span>৳{result.shipping_cost}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t">
                <span>সর্বমোট</span>
                <span className="text-primary">৳{result.total}</span>
              </div>
              {result.payment_method && (
                <div className="flex justify-between text-xs text-muted-foreground pt-2">
                  <span>পেমেন্ট মেথড</span>
                  <span>{result.payment_method} — {result.payment_status}</span>
                </div>
              )}
            </div>

            {result.notes && (
              <div className="border-t pt-3 text-xs">
                <span className="text-muted-foreground">নোট: </span>
                <span>{result.notes}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
