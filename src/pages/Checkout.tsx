import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useCart } from "@/context/CartContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Check, Trash2, Plus, Minus, ChevronDown, Banknote, CreditCard, Wallet, Search, X } from "lucide-react";
import { BD_DISTRICTS, BD_LOCATIONS } from "@/data/bd-locations";
import { trackInitiateCheckout, trackAddPaymentInfo, trackPurchase } from "@/lib/tracking";

type DistrictRow = { id: string; name: string };
type ThanaRow = { id: string; district_id: string; name: string };

const schema = z.object({
  customer_name: z.string().trim().min(2, "নাম লিখুন").max(100),
  phone: z.string().trim().min(10, "সঠিক ফোন নাম্বার লিখুন").max(20).regex(/^[+\d\s-]+$/, "Invalid characters"),
  email: z.string().trim().email("সঠিক ইমেইল লিখুন").max(150).optional().or(z.literal("")),
  district: z.string().trim().min(2, "জেলা সিলেক্ট করুন").max(100),
  thana: z.string().trim().max(100).optional(),
  address: z.string().trim().min(5, "বিস্তারিত ঠিকানা লিখুন").max(500),
  notes: z.string().trim().max(500).optional(),
});

type PM = {
  id: string;
  name: string;
  number: string;
  account_type: string;
  instructions: string | null;
  is_default: boolean;
};

const PAY_ICONS: Record<string, JSX.Element> = {
  cod: <Banknote className="h-6 w-6 text-emerald-600" />,
  online: <CreditCard className="h-6 w-6 text-blue-600" />,
};

const METHOD_DOT: Record<string, string> = {
  bkash: "bg-pink-500",
  nagad: "bg-orange-500",
  rocket: "bg-purple-500",
};

export default function Checkout() {
  const { items, total, clear, updateQty, removeItem } = useCart();
  const { session, profile } = useCustomerAuth();
  const nav = useNavigate();
  const [methods, setMethods] = useState<PM[]>([]);
  const [copied, setCopied] = useState(false);
  const [shippingOptions, setShippingOptions] = useState<{ id: string; name: string; charge: number; zone: string; zone_id: string | null }[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<string>("");
  const [userPickedShipping, setUserPickedShipping] = useState(false);
  const [dbDistricts, setDbDistricts] = useState<DistrictRow[]>([]);
  const [dbThanas, setDbThanas] = useState<ThanaRow[]>([]);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; id: string } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [agree, setAgree] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [incompleteId, setIncompleteId] = useState<string | null>(null);

  // payment_method: "cod" | "online" | <pm-name when online>
  const [payMode, setPayMode] = useState<"cod" | "online">("cod");
  const [onlineMethod, setOnlineMethod] = useState<string>("");

  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    email: "",
    district: "",
    thana: "",
    address: "",
    notes: "",
    transaction_id: "",
  });

  useEffect(() => {
    supabase
      .from("payment_methods")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        const list = (data as PM[]) || [];
        setMethods(list);
        const def = list.find((m) => m.is_default) || list[0];
        if (def) setOnlineMethod(def.name);
      });

    // Fetch districts & thanas from DB (admin-managed)
    supabase.from("districts" as any).select("id,name").eq("is_active", true).order("sort_order").order("name")
      .then(({ data }) => setDbDistricts((data as any) || []));
    supabase.from("thanas" as any).select("id,district_id,name").eq("is_active", true).order("sort_order").order("name")
      .then(({ data }) => setDbThanas((data as any) || []));
  }, []);

  // Pixel: InitiateCheckout (fires once when checkout page loads with items)
  const initiatedRef = useRef(false);
  useEffect(() => {
    if (initiatedRef.current || items.length === 0) return;
    initiatedRef.current = true;
    trackInitiateCheckout(
      items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
      items.reduce((s, i) => s + i.price * i.quantity, 0)
    );
  }, [items]);
  const autofilledRef = useRef(false);
  useEffect(() => {
    if (autofilledRef.current) return;
    if (!profile && !session?.user) return;
    setForm((f) => ({
      ...f,
      customer_name: f.customer_name || profile?.display_name || "",
      phone: f.phone || profile?.phone || "",
      email: f.email || profile?.email || session?.user?.email || "",
      district: f.district || profile?.district || "",
      thana: f.thana || profile?.thana || "",
      address: f.address || profile?.address || "",
    }));
    if (profile || session?.user) autofilledRef.current = true;
  }, [profile, session]);

  const districtList = useMemo(
    () => (dbDistricts.length ? dbDistricts.map((d) => d.name) : BD_DISTRICTS),
    [dbDistricts]
  );
  const thanasForSelected = useMemo(() => {
    if (!form.district) return [] as string[];
    if (dbDistricts.length) {
      const d = dbDistricts.find((x) => x.name === form.district);
      if (!d) return [];
      return dbThanas.filter((t) => t.district_id === d.id).map((t) => t.name);
    }
    return BD_LOCATIONS[form.district] || [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.district, dbDistricts, dbThanas]);


  const availableShippingIds = (() => {
    const lists = items.map((i) => i.shipping_options || []);
    if (lists.length === 0) return [] as string[];
    if (lists.some((l) => l.length === 0)) return [] as string[];
    return lists.reduce<string[]>((acc, cur, idx) => idx === 0 ? [...cur] : acc.filter((x) => cur.includes(x)), []);
  })();

  useEffect(() => {
    if (availableShippingIds.length === 0) { setShippingOptions([]); setSelectedShipping(""); return; }
    supabase.from("shipping_charges").select("id,name,charge,zone,zone_id").in("id", availableShippingIds).eq("is_active", true).order("sort_order")
      .then(({ data }) => {
        const list = ((data as any[]) || []) as { id: string; name: string; charge: number; zone: string; zone_id: string | null }[];
        setShippingOptions(list);
        if (list.length && !list.find((s) => s.id === selectedShipping)) setSelectedShipping(list[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableShippingIds.join(",")]);

  // Auto-select shipping based on district → custom zone mapping (with legacy Dhaka fallback)
  useEffect(() => {
    if (userPickedShipping) return;
    if (!form.district || shippingOptions.length === 0) return;

    (async () => {
      // Try custom zone matching first
      const district = dbDistricts.find((d) => d.name === form.district);
      let matchedZoneId: string | null = null;
      if (district) {
        const { data } = await supabase
          .from("shipping_zone_districts" as any)
          .select("zone_id")
          .eq("district_id", district.id)
          .limit(1)
          .maybeSingle();
        matchedZoneId = (data as any)?.zone_id || null;
      }

      let match = matchedZoneId
        ? shippingOptions.find((s) => s.zone_id === matchedZoneId)
        : undefined;

      // Legacy fallback: inside_dhaka / outside_dhaka string zones
      if (!match) {
        const isDhaka = form.district.trim().toLowerCase().includes("dhaka") || form.district.includes("ঢাকা");
        const targetZone = isDhaka ? "inside_dhaka" : "outside_dhaka";
        match = shippingOptions.find((s) => !s.zone_id && s.zone === targetZone);
      }

      // Final fallback: "any"
      if (!match) match = shippingOptions.find((s) => !s.zone_id && (s.zone === "any" || !s.zone));

      if (match && match.id !== selectedShipping) {
        setSelectedShipping(match.id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.district, shippingOptions, dbDistricts]);

  const shippingCharge = shippingOptions.find((s) => s.id === selectedShipping)?.charge || 0;
  const discountAmount = appliedCoupon?.discount || 0;
  const grandTotal = Math.max(0, total - discountAmount) + Number(shippingCharge);

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return toast.error("কুপন কোড লিখুন");
    setApplyingCoupon(true);
    try {
      const { data: coupon, error } = await (supabase as any)
        .from("coupons")
        .select("*")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();
      if (error || !coupon) { toast.error("কুপন পাওয়া যায়নি বা ইনঅ্যাকটিভ"); return; }
      const now = new Date();
      if (coupon.starts_at && new Date(coupon.starts_at) > now) { toast.error("কুপনটি এখনো শুরু হয়নি"); return; }
      if (coupon.expires_at && new Date(coupon.expires_at) < now) { toast.error("কুপনটির মেয়াদ শেষ"); return; }
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) { toast.error("কুপন ব্যবহারের সীমা শেষ"); return; }
      if (coupon.min_order_amount && total < coupon.min_order_amount) {
        toast.error(`কমপক্ষে ৳${coupon.min_order_amount} অর্ডার করতে হবে`); return;
      }

      // Determine eligible items based on scope
      let eligibleSubtotal = total;
      if (coupon.scope === "product") {
        const { data: links } = await (supabase as any)
          .from("coupon_products")
          .select("product_id")
          .eq("coupon_id", coupon.id);
        const productIds = ((links as any[]) || []).map((l) => l.product_id);
        const matchingItems = items.filter((i) => productIds.includes(i.id));
        if (matchingItems.length === 0) { toast.error("এই কুপন কার্টের কোন প্রডাক্টে প্রযোজ্য নয়"); return; }
        eligibleSubtotal = matchingItems.reduce((s, i) => s + i.price * i.quantity, 0);
      }

      let discount = coupon.discount_type === "percent"
        ? (eligibleSubtotal * Number(coupon.discount_value)) / 100
        : Number(coupon.discount_value);
      if (coupon.max_discount && discount > coupon.max_discount) discount = coupon.max_discount;
      discount = Math.min(discount, eligibleSubtotal);
      discount = Math.round(discount * 100) / 100;

      setAppliedCoupon({ code: coupon.code, discount, id: coupon.id });
      toast.success(`কুপন প্রয়োগ হয়েছে! ৳${discount} ছাড়`);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
  };

  // Auto-save incomplete order when phone reaches 11 digits
  useEffect(() => {
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 11) return;
    if (items.length === 0) return;

    const handle = setTimeout(async () => {
      const fullAddress = [form.address, form.thana, form.district].filter(Boolean).join(", ");
      const cart_items = items.map((i) => ({
        product_id: i.id,
        product_name: i.name,
        unit_price: i.price,
        quantity: i.quantity,
        image_url: i.image_url || null,
      }));
      const payload: any = {
        phone: digits,
        customer_name: form.customer_name || null,
        email: form.email || null,
        district: form.district || null,
        thana: form.thana || null,
        address: fullAddress || null,
        notes: form.notes || null,
        cart_items,
        subtotal: total,
        shipping_cost: shippingCharge,
        total: grandTotal,
        is_completed: false,
      };

      if (incompleteId) {
        await (supabase as any).from("incomplete_orders").update(payload).eq("id", incompleteId);
      } else {
        const { data: existing } = await (supabase as any)
          .from("incomplete_orders")
          .select("id")
          .eq("phone", digits)
          .eq("is_completed", false)
          .maybeSingle();
        if (existing?.id) {
          await (supabase as any).from("incomplete_orders").update(payload).eq("id", existing.id);
          setIncompleteId(existing.id);
        } else {
          const { data: created } = await (supabase as any)
            .from("incomplete_orders")
            .insert([payload])
            .select("id")
            .single();
          if (created?.id) setIncompleteId(created.id);
        }
      }
    }, 800);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.phone, form.customer_name, form.email, form.district, form.thana, form.address, form.notes, items, total, shippingCharge, grandTotal]);

  if (items.length === 0) {
    return (
      <div className="container-page py-20 text-center">
        <p className="text-muted-foreground">আপনার কার্ট খালি। <Link to="/shop" className="text-primary underline">এখনই কেনাকাটা করুন</Link></p>
      </div>
    );
  }

  const selectedPM = methods.find((m) => m.name === onlineMethod);

  const copyNumber = async () => {
    if (!selectedPM) return;
    await navigator.clipboard.writeText(selectedPM.number);
    setCopied(true);
    toast.success("নাম্বার কপি হয়েছে!");
    setTimeout(() => setCopied(false), 2000);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) { toast.error("Terms-এ সম্মত হন"); return; }
    if (shippingOptions.length > 0 && !selectedShipping) { toast.error("ডেলিভারি অপশন সিলেক্ট করুন"); return; }
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }

    const isOnline = payMode === "online";
    if (isOnline) {
      if (!onlineMethod) { toast.error("পেমেন্ট মেথড সিলেক্ট করুন"); return; }
      if (!form.transaction_id || form.transaction_id.length < 4) { toast.error("ট্রানজেকশন আইডি দিন"); return; }
    }

    setSubmitting(true);
    // Pixel: AddPaymentInfo
    trackAddPaymentInfo(isOnline ? (onlineMethod || "online") : "cod", grandTotal);
    const { customer_name, phone, email, district, thana, address, notes } = parsed.data;
    const fullAddress = [address, thana, district].filter(Boolean).join(", ");
    const cart_items = items.map((i) => ({
      product_id: i.id,
      product_name: i.name,
      unit_price: i.price,
      quantity: i.quantity,
    }));
    const selectedShippingObj = shippingOptions.find((s) => s.id === selectedShipping) || null;
    const noteParts = [
      notes,
      email ? `Email: ${email}` : "",
      selectedShippingObj ? `Shipping: ${selectedShippingObj.name} (৳${selectedShippingObj.charge})` : "",
      appliedCoupon ? `Coupon: ${appliedCoupon.code} (-৳${appliedCoupon.discount})` : "",
    ].filter(Boolean);
    const finalNotes = noteParts.join("\n");

    if (!isOnline) {
      const { data: order, error } = await supabase
        .from("orders")
        .insert([{
          customer_name, phone, address: fullAddress,
          total: grandTotal,
          shipping_cost: shippingCharge,
          payment_method: "cod",
          payment_status: "pending",
          notes: finalNotes || null,
          status: "pending" as any,
          coupon_code: appliedCoupon?.code || null,
          discount_amount: discountAmount,
          user_id: session?.user?.id || null,
        } as any])
        .select("id, invoice_no")
        .single();
      if (error || !order) {
        toast.error("অর্ডার সাবমিট ব্যর্থ হয়েছে");
        setSubmitting(false);
        return;
      }
      await supabase.from("order_items").insert(cart_items.map((c) => ({ ...c, order_id: order.id })));
      // Increment coupon used_count
      if (appliedCoupon?.id) {
        const { data: c } = await (supabase as any).from("coupons").select("used_count").eq("id", appliedCoupon.id).single();
        if (c) await (supabase as any).from("coupons").update({ used_count: (c.used_count || 0) + 1 }).eq("id", appliedCoupon.id);
      }
      // Mark incomplete order as completed
      if (incompleteId) {
        await (supabase as any).from("incomplete_orders")
          .update({ is_completed: true, completed_order_id: order.id })
          .eq("id", incompleteId);
      } else {
        const digits = phone.replace(/\D/g, "");
        if (digits.length >= 11) {
          await (supabase as any).from("incomplete_orders")
            .update({ is_completed: true, completed_order_id: order.id })
            .eq("phone", digits).eq("is_completed", false);
        }
      }
      clear();
      toast.success("অর্ডার সফলভাবে সাবমিট হয়েছে!");
      // Pixel: Purchase
      trackPurchase({
        invoice: order.invoice_no,
        items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
        total: grandTotal,
        shipping: shippingCharge,
        discount: discountAmount,
        paymentMethod: "cod",
      });
      // Notifications: customer email + admin email + customer SMS
      try {
        const { notifyOrderPlaced } = await import("@/lib/email");
        notifyOrderPlaced({
          invoice: order.invoice_no,
          customerName: customer_name,
          customerEmail: email || profile?.email || session?.user?.email || null,
          customerPhone: phone,
          address: fullAddress,
          district,
          thana,
          paymentMethod: "Cash On Delivery",
          items: items.map((i) => ({ name: i.name, qty: i.quantity, price: i.price })),
          subtotal: total,
          shipping: shippingCharge,
          total: grandTotal,
        });
      } catch (_) { /* ignore */ }
      nav(`/order-confirmation/${order.invoice_no}`);
      return;
    }

    const { data: pending, error } = await supabase
      .from("pending_payments")
      .insert([{
        customer_name, phone, address: fullAddress,
        total: grandTotal,
        payment_method: onlineMethod,
        transaction_id: form.transaction_id,
        cart_items,
        notes: finalNotes || null,
        status: "pending",
      }])
      .select("id")
      .single();
    if (error || !pending) {
      toast.error("পেমেন্ট সাবমিট ব্যর্থ হয়েছে");
      setSubmitting(false);
      return;
    }
    // Mark incomplete order as completed (online/pending payment flow)
    if (incompleteId) {
      await (supabase as any).from("incomplete_orders")
        .update({ is_completed: true })
        .eq("id", incompleteId);
    } else {
      const digits = phone.replace(/\D/g, "");
      if (digits.length >= 11) {
        await (supabase as any).from("incomplete_orders")
          .update({ is_completed: true })
          .eq("phone", digits).eq("is_completed", false);
      }
    }
    clear();
    toast.success("পেমেন্ট সাবমিট হয়েছে! অ্যাডমিন ভেরিফাই করবে।");
    // Pixel: Purchase (online/pending payment)
    trackPurchase({
      invoice: `PENDING-${pending.id.slice(0, 8).toUpperCase()}`,
      items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
      total: grandTotal,
      shipping: shippingCharge,
      discount: discountAmount,
      paymentMethod: onlineMethod || "online",
    });
    nav(`/order-confirmation/PENDING-${pending.id.slice(0, 8).toUpperCase()}`);
  };

  return (
    <div className="bg-secondary/40 min-h-[calc(100vh-200px)] py-6">
      <div className="container-page">
        {/* Top login bar */}
        {!session ? (
          <div className="bg-card border rounded-lg px-4 py-3 mb-5 flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm text-muted-foreground">আপনার একাউন্ট আছে? লগইন বা রেজিস্টার করুন</span>
            <div className="flex gap-2">
              <Link to="/login?redirect=/checkout" className="px-4 py-1.5 rounded-md border border-primary text-primary text-sm font-semibold hover:bg-primary/5">Login</Link>
              <Link to="/signup?redirect=/checkout" className="px-4 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover">Register</Link>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-5 flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm text-emerald-800">✓ লগইন করা — ঠিকানা অটো-ফিল হয়েছে। <Link to="/account/address" className="underline font-semibold">ঠিকানা এডিট করুন</Link></span>
            <Link to="/account" className="text-sm font-semibold text-emerald-700 hover:underline">My Account →</Link>
          </div>
        )}

        <form onSubmit={submit} className="grid lg:grid-cols-[1fr_400px] gap-5 items-start">
          {/* LEFT COLUMN */}
          <div className="space-y-5 min-w-0">
            {/* Order review */}
            <Card title="Order review">
              <ul className="divide-y">
                {items.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="h-14 w-14 shrink-0 rounded-md bg-secondary overflow-hidden border">
                      {i.image_url ? <img src={i.image_url} alt={i.name} className="w-full h-full object-cover" /> : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{i.name}</div>
                      <div className="flex items-center gap-3 mt-1.5 text-sm">
                        <span className="text-muted-foreground">Qty:</span>
                        <div className="inline-flex items-center border rounded-md overflow-hidden">
                          <button type="button" onClick={() => updateQty(i.id, i.quantity - 1)}
                            className="px-2 py-1 hover:bg-secondary text-muted-foreground"><Minus className="h-3.5 w-3.5" /></button>
                          <span className="px-3 font-semibold">{i.quantity}</span>
                          <button type="button" onClick={() => updateQty(i.id, i.quantity + 1)}
                            className="px-2 py-1 hover:bg-secondary text-muted-foreground"><Plus className="h-3.5 w-3.5" /></button>
                        </div>
                        <span className="font-semibold">৳{(i.price * i.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeItem(i.id)}
                      aria-label="Remove"
                      className="text-destructive hover:bg-destructive/10 p-2 rounded-md">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Shipping Address */}
            <Card title="Shipping Address">
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  maxLength={100} required placeholder="Your Full Name *" className="form-input" />
                <div className="flex">
                  <span className="inline-flex items-center px-3 border border-r-0 rounded-l-md bg-secondary text-sm text-muted-foreground">88</span>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    maxLength={20} required placeholder="017********" inputMode="tel"
                    className="form-input rounded-l-none" />
                </div>
                <SearchableSelect
                  value={form.district}
                  onChange={(v) => setForm({ ...form, district: v, thana: "" })}
                  options={districtList}
                  placeholder="Select District *"
                />
                <SearchableSelect
                  value={form.thana}
                  onChange={(v) => setForm({ ...form, thana: v })}
                  options={thanasForSelected}
                  placeholder={form.district ? "Select Thana (Optional)" : "আগে জেলা সিলেক্ট করুন"}
                  disabled={!form.district}
                />
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  maxLength={500} required placeholder="ex: House no. / building / street / area"
                  className="form-input sm:col-span-2" />
                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  type="email" maxLength={150} placeholder="Email (Optional)"
                  className="form-input sm:col-span-2" />
              </div>
              {shippingOptions.length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm font-semibold mb-1.5">Delivery Option *</label>
                  <select value={selectedShipping} onChange={(e) => { setSelectedShipping(e.target.value); setUserPickedShipping(true); }} required
                    className="form-input">
                    <option value="">Select Delivery Option</option>
                    {shippingOptions.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} — ৳{s.charge}</option>
                    ))}
                  </select>
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-5">
            {/* Coupon */}
            <div className="bg-card border rounded-lg">
              <button type="button" onClick={() => setCouponOpen(!couponOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium">
                <span>Have any coupon or gift voucher?</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${couponOpen ? "rotate-180" : ""}`} />
              </button>
              {couponOpen && (
                <div className="px-4 pb-3 space-y-2">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                      <div className="text-sm">
                        <span className="font-mono font-bold text-emerald-700">{appliedCoupon.code}</span>
                        <span className="text-emerald-600 ml-2">-৳{appliedCoupon.discount} ছাড়</span>
                      </div>
                      <button type="button" onClick={removeCoupon}
                        className="text-rose-600 hover:bg-rose-50 p-1 rounded">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Enter coupon code" className="form-input flex-1 text-sm font-mono uppercase" />
                      <button type="button" onClick={applyCoupon} disabled={applyingCoupon}
                        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary-hover disabled:opacity-50">
                        {applyingCoupon ? "..." : "Apply"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Totals */}
            <div className="bg-card border rounded-lg p-4 space-y-2">
              <Row label="Sub total" value={`${total.toFixed(2)} BDT`} />
              {appliedCoupon && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Discount ({appliedCoupon.code})</span>
                  <span className="font-medium">-{discountAmount.toFixed(2)} BDT</span>
                </div>
              )}
              <Row label="Delivery cost" value={`${shippingCharge} BDT`} />
              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{grandTotal.toFixed(2)} BDT</span>
              </div>
            </div>

            {/* Payment method */}
            <Card title="Payment method">
              <div className="grid grid-cols-2 gap-3">
                <PayTile
                  active={payMode === "cod"}
                  onClick={() => setPayMode("cod")}
                  icon={PAY_ICONS.cod}
                  label="Cash On Delivery"
                />
                <PayTile
                  active={payMode === "online"}
                  onClick={() => setPayMode("online")}
                  icon={PAY_ICONS.online}
                  label="Online Payment"
                  disabled={methods.length === 0}
                />
              </div>

              {payMode === "online" && methods.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {methods.map((m) => {
                    const active = onlineMethod === m.name;
                    return (
                      <button key={m.id} type="button" onClick={() => setOnlineMethod(m.name)}
                        className={`relative flex items-center gap-2 border-2 rounded-lg px-3 py-2.5 text-left transition-all ${
                          active ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                        }`}>
                        <span className={`w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center uppercase ${METHOD_DOT[m.name] || "bg-slate-500"}`}>
                          {m.name[0]}
                        </span>
                        <span className="font-medium capitalize text-sm">{m.name}</span>
                        {active && (
                          <span className="ml-auto h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {payMode === "online" && selectedPM && (
                <div className="mt-3 border-2 border-dashed border-primary/40 rounded-lg p-3 bg-primary/5 space-y-2">
                  <div className="text-xs text-muted-foreground">
                    <span className="capitalize font-bold text-foreground">{selectedPM.name}</span> ({selectedPM.account_type}) এ মোট <b>৳{grandTotal}</b> পাঠান:
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-background border-2 border-primary rounded-md px-3 py-1.5 font-mono text-base font-bold tracking-wider text-primary">
                      {selectedPM.number}
                    </div>
                    <button type="button" onClick={copyNumber}
                      className="bg-primary hover:bg-primary-hover text-primary-foreground px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 text-xs">
                      {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                    </button>
                  </div>
                  <input value={form.transaction_id}
                    onChange={(e) => setForm({ ...form, transaction_id: e.target.value })}
                    maxLength={50} placeholder="Transaction ID *"
                    className="form-input font-mono text-sm" />
                </div>
              )}
            </Card>

            {/* Special notes */}
            <Card title="Special notes" subtitle="(Optional)">
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3} maxLength={500}
                className="form-input resize-y" />
            </Card>

            {/* Agreement + place order */}
            <div className="space-y-3">
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 accent-primary h-4 w-4" />
                <span className="text-muted-foreground">
                  I have read and agree to the{" "}
                  <a className="text-primary hover:underline">Terms and Conditions</a>,{" "}
                  <a className="text-primary hover:underline">Privacy Policy</a> &{" "}
                  <a className="text-primary hover:underline">Refund and Return Policy</a>
                </span>
              </label>
              <button disabled={submitting}
                className="w-full bg-primary text-primary-foreground py-3.5 rounded-md font-bold tracking-wide hover:bg-primary-hover transition-smooth disabled:opacity-50 uppercase">
                {submitting ? "Placing order..." : "Place Order"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <style>{`
        .form-input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          background: hsl(var(--background));
          font-size: 0.9rem;
          outline: none;
          transition: box-shadow .15s, border-color .15s;
        }
        .form-input:focus {
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 2px hsl(var(--primary) / 0.15);
        }
      `}</style>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border rounded-lg p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b">
        <span className="w-1 h-5 bg-primary rounded-sm" />
        <h3 className="font-semibold text-base">
          {title} {subtitle && <span className="text-xs text-muted-foreground font-normal ml-1">{subtitle}</span>}
        </h3>
      </div>
      {children}
    </section>
  );
}

function PayTile({ active, onClick, icon, label, disabled }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`relative flex items-center gap-3 border-2 rounded-lg px-3 py-3 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        active ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
      }`}>
      {icon}
      <span className="font-medium text-sm">{label}</span>
      {active && (
        <span className="ml-auto h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          <Check className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function SearchableSelect({
  value, onChange, options, placeholder, disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [query, options]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`form-input flex items-center justify-between text-left ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <span className={value ? "" : "text-muted-foreground"}>{value || placeholder}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full bg-popover border rounded-lg shadow-lg overflow-hidden">
          <div className="relative border-b">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-9 py-2.5 text-sm bg-transparent outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded">
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <ul className="max-h-60 overflow-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground text-center">কিছু পাওয়া যায়নি</li>
            ) : (
              filtered.map((opt) => (
                <li key={opt}>
                  <button
                    type="button"
                    onClick={() => { onChange(opt); setOpen(false); setQuery(""); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center justify-between ${
                      value === opt ? "bg-primary/10 text-primary font-medium" : ""
                    }`}
                  >
                    <span>{opt}</span>
                    {value === opt && <Check className="h-4 w-4" />}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
