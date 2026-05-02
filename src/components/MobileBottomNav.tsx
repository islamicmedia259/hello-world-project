import { Link, useLocation } from "react-router-dom";
import { Grid3x3, MessageSquare, Home, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

interface Props {
  onOpenMenu: () => void;
}

export default function MobileBottomNav({ onOpenMenu }: Props) {
  const { count, openCart } = useCart();
  const { session } = useCustomerAuth();
  const { pathname } = useLocation();

  // Hide on admin and checkout
  if (pathname.startsWith("/admin") || pathname.startsWith("/checkout")) return null;

  const isActive = (p: string, exact = false) => exact ? pathname === p : pathname.startsWith(p);

  return (
    <>
      {/* Spacer to prevent content overlap on mobile */}
      <div className="h-20 md:hidden" aria-hidden />
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-primary text-primary-foreground border-t border-primary/30 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
        <div className="relative grid grid-cols-5 items-end h-16">
          {/* Category */}
          <button onClick={onOpenMenu} className="flex flex-col items-center justify-center gap-0.5 py-2 active:opacity-70">
            <Grid3x3 className="h-5 w-5" />
            <span className="text-[10px] font-medium">Category</span>
          </button>

          {/* Message */}
          <Link
            to={session ? "/account/messages" : "/login?redirect=/account/messages"}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 active:opacity-70 ${isActive("/account/messages") ? "opacity-100" : "opacity-95"}`}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-[10px] font-medium">Message</span>
          </Link>

          {/* Center Home button */}
          <div className="flex justify-center">
            <Link
              to="/"
              aria-label="Home"
              className="absolute -top-6 left-1/2 -translate-x-1/2 h-14 w-14 rounded-full bg-primary text-primary-foreground border-4 border-background shadow-lg flex flex-col items-center justify-center active:scale-95 transition-transform"
            >
              <Home className="h-5 w-5" />
              <span className="text-[9px] font-semibold leading-none mt-0.5">Home</span>
            </Link>
          </div>

          {/* Cart */}
          <button onClick={openCart} className="relative flex flex-col items-center justify-center gap-0.5 py-2 active:opacity-70">
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-background text-primary text-[9px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                  {count}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Cart</span>
          </button>

          {/* Account / Login */}
          <Link
            to={session ? "/account" : "/login"}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 active:opacity-70 ${isActive("/account") ? "opacity-100" : "opacity-95"}`}
          >
            <User className="h-5 w-5" />
            <span className="text-[10px] font-medium">{session ? "Account" : "Login"}</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
