import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, Minus, Plus, Gift, ShoppingBag, ArrowLeft, ArrowRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/integrations/supabase/client";

const FREE_GIFT_THRESHOLD = 5000; // ৳ — admin can wire to settings later

interface RecProduct {
  id: string;
  name: string;
  price: number;
  discount_price: number | null;
  image_url: string | null;
}

export default function CartSidebar() {
  const { items, isOpen, closeCart, updateQty, removeItem, total, addItem } = useCart();
  const navigate = useNavigate();
  const [recs, setRecs] = useState<RecProduct[]>([]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || recs.length) return;
    supabase
      .from("products")
      .select("id,name,price,discount_price,image_url")
      .eq("is_active", true)
      .limit(8)
      .then(({ data }) => setRecs((data as any) || []));
  }, [isOpen, recs.length]);

  const remaining = Math.max(0, FREE_GIFT_THRESHOLD - total);
  const progress = Math.min(100, (total / FREE_GIFT_THRESHOLD) * 100);
  const filteredRecs = recs.filter((r) => !items.some((i) => i.id === r.id));
  const [recsPaused, setRecsPaused] = useState(false);
  const recsScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollRecs = (dir: "l" | "r") => {
    const el = recsScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "l" ? -240 : 240, behavior: "smooth" });
  };

  // Auto-slide recommendations
  useEffect(() => {
    if (!isOpen || recsPaused || filteredRecs.length <= 1) return;
    const id = setInterval(() => {
      const el = recsScrollRef.current;
      if (!el) return;
      const step = 240;
      const maxScroll = el.scrollWidth - el.clientWidth;
      // If near the end, jump back to start; otherwise scroll right
      if (el.scrollLeft + step >= maxScroll - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: step, behavior: "smooth" });
      }
    }, 2500);
    return () => clearInterval(id);
  }, [isOpen, recsPaused, filteredRecs.length]);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={closeCart}
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      {/* Panel */}
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-background z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-display font-bold tracking-wide uppercase">Shopping Cart</h2>
          <button onClick={closeCart} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            Close <X className="h-4 w-4" />
          </button>
        </div>

        {/* Free gift progress */}
        {items.length > 0 && (
          <div className="px-5 pt-4">
            <div className="flex items-start gap-3 bg-secondary/50 rounded-lg p-3">
              <div className="bg-primary/10 text-primary rounded-full p-2 shrink-0">
                <Gift className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  {remaining > 0 ? (
                    <>Add <span className="font-bold text-primary">৳{remaining}</span> more to unlock free gift</>
                  ) : (
                    <span className="font-semibold text-primary">🎉 You unlocked a free gift!</span>
                  )}
                </p>
                <div className="mt-2 h-1.5 bg-background rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-16">
              <ShoppingBag className="h-12 w-12 mb-3 opacity-40" />
              <p className="font-medium">Your cart is empty</p>
              <button onClick={closeCart} className="mt-4 text-primary text-sm font-semibold hover:underline">
                Continue shopping
              </button>
            </div>
          ) : (
            items.map((i) => (
              <div key={i.id} className="flex gap-3 p-3 border rounded-xl bg-card animate-fade-in">
                <img
                  src={i.image_url || "/placeholder.svg"}
                  alt={i.name}
                  className="w-16 h-16 object-cover rounded-lg bg-secondary shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium line-clamp-2">{i.name}</p>
                    <button
                      onClick={() => removeItem(i.id)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center border rounded-md">
                      <button onClick={() => updateQty(i.id, i.quantity - 1)} className="p-1.5 hover:bg-secondary">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{i.quantity}</span>
                      <button onClick={() => updateQty(i.id, i.quantity + 1)} className="p-1.5 hover:bg-secondary">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">× ৳{i.price}</span>{" "}
                      <span className="font-bold text-primary">= ৳{i.price * i.quantity}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recommended - sticky above footer */}
        {items.length > 0 && filteredRecs.length > 0 && (
          <div className="border-t bg-secondary/50 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-display font-bold text-sm">You May Also Like</h3>
                <div className="h-0.5 w-10 bg-primary mt-1 rounded" />
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => scrollRecs("l")}
                  className="h-7 w-7 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity"
                  aria-label="Scroll left"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => scrollRecs("r")}
                  className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-hover transition-colors"
                  aria-label="Scroll right"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div
              id="cart-recs-scroll"
              ref={recsScrollRef}
              onMouseEnter={() => setRecsPaused(true)}
              onMouseLeave={() => setRecsPaused(false)}
              onTouchStart={() => setRecsPaused(true)}
              onTouchEnd={() => { setTimeout(() => setRecsPaused(false), 3000); }}
              className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x scrollbar-thin"
            >
              {filteredRecs.map((r) => {
                const eff = r.discount_price ?? r.price;
                const hasDiscount = r.discount_price && r.discount_price < r.price;
                return (
                  <div
                    key={r.id}
                    className="min-w-[230px] max-w-[230px] bg-card rounded-lg p-2 snap-start flex gap-2 items-center shadow-sm border border-border/50"
                  >
                    <img
                      src={r.image_url || "/placeholder.svg"}
                      alt={r.name}
                      className="w-14 h-14 object-cover rounded-md bg-secondary shrink-0"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                      <p className="text-xs font-semibold line-clamp-2 leading-snug">{r.name}</p>
                      <div className="flex items-center justify-between gap-1.5 mt-1">
                        <div className="flex items-baseline gap-1 min-w-0">
                          <span className="text-sm font-bold text-primary">৳{eff}</span>
                          {hasDiscount && (
                            <span className="text-[10px] text-muted-foreground line-through truncate">৳{r.price}</span>
                          )}
                        </div>
                        <button
                          onClick={() =>
                            addItem(
                              { id: r.id, name: r.name, price: eff, image_url: r.image_url },
                              1,
                              { openSidebar: false }
                            )
                          }
                          className="bg-primary text-primary-foreground text-[11px] font-bold px-2.5 py-1 rounded-full hover:bg-primary-hover flex items-center gap-0.5 active:scale-95 transition-transform shrink-0"
                        >
                          <Plus className="h-3 w-3" /> Add
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t px-5 py-4 bg-card">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold">Total:</span>
            <span className="text-xl font-bold text-primary">৳{total.toLocaleString()}</span>
          </div>
          <button
            disabled={items.length === 0}
            onClick={() => { closeCart(); navigate("/checkout"); }}
            className="w-full bg-primary text-primary-foreground font-bold tracking-wide uppercase py-3.5 rounded-md hover:bg-primary-hover transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Checkout
          </button>
        </div>
      </aside>
    </>
  );
}
