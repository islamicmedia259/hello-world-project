import { ShoppingBag } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useCart } from "@/context/CartContext";

export default function FloatingCart() {
  const { count, total, openCart } = useCart();
  const { pathname } = useLocation();
  // Hide on checkout page
  if (pathname.startsWith("/checkout")) return null;
  if (count === 0) return null;
  return (
    <button
      onClick={openCart}
      aria-label="Open cart"
      className="fixed right-2 sm:right-5 top-1/2 -translate-y-1/2 z-30 bg-primary text-primary-foreground rounded-xl md:rounded-2xl shadow-2xl px-2 py-2 md:px-3 md:py-3 flex flex-col items-center gap-0.5 md:gap-1 hover:scale-105 transition-transform animate-fade-in"
    >
      <ShoppingBag className="h-4 w-4 md:h-6 md:w-6" />
      <span className="text-[10px] md:text-xs font-bold leading-none">{count} Items</span>
      <span className="text-[9px] md:text-[11px] font-bold leading-none bg-background/20 rounded px-1 md:px-1.5 py-0.5">
        ৳{total.toLocaleString()}
      </span>
    </button>
  );
}
