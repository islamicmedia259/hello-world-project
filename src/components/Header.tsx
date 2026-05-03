import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Search, User, Truck, Settings, Menu } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import defaultLogo from "@/assets/logo.png";
import MobileDrawer from "@/components/MobileDrawer";
import NotificationBell from "@/components/NotificationBell";

interface SuggestProduct {
  id: string;
  name: string;
  price: number;
  discount_price: number | null;
  image_url: string | null;
}

interface NavCategory {
  id: string;
  name: string;
  slug: string | null;
}

export default function Header() {
  const { count, openCart } = useCart();
  const { session } = useCustomerAuth();
  const [q, setQ] = useState("");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [siteName, setSiteName] = useState<string>("Navigator Series Book");
  const [suggestions, setSuggestions] = useState<SuggestProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navCategories, setNavCategories] = useState<NavCategory[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mobileWrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("logo_url,site_name").limit(1).maybeSingle();
      if (data?.logo_url && data.logo_url.trim()) setLogoUrl(data.logo_url.trim());
      if (data?.site_name) setSiteName(data.site_name);
    })();
    (async () => {
      const { data } = await supabase
        .from("categories")
        .select("id,name,slug,sort_order")
        .eq("is_active", true)
        .order("sort_order")
        .order("name");
      setNavCategories((data as NavCategory[]) || []);
    })();
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length === 0) { setSuggestions([]); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,price,discount_price,image_url")
        .eq("is_active", true)
        .ilike("name", `%${term}%`)
        .limit(8);
      setSuggestions((data as SuggestProduct[]) || []);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || mobileWrapRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    navigate(`/shop?q=${encodeURIComponent(q.trim())}`);
  };

  const goToProduct = (id: string) => {
    setOpen(false);
    setQ("");
    navigate(`/product/${id}`);
  };

  const SuggestList = () => (
    <div className="absolute left-0 right-0 top-full mt-1 bg-popover text-popover-foreground border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50 animate-fade-in">
      {loading && suggestions.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground text-center">Searching...</div>
      ) : suggestions.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground text-center">No products found.</div>
      ) : (
        <ul className="divide-y">
          {suggestions.map((p) => {
            const hasDiscount = p.discount_price && p.discount_price > 0 && p.discount_price < p.price;
            return (
              <li key={p.id}>
                <button type="button" onClick={() => goToProduct(p.id)} className="w-full flex items-center gap-3 p-2.5 hover:bg-secondary transition-smooth text-left">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-12 w-12 rounded object-cover shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded bg-secondary shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-sm">
                      {hasDiscount ? (
                        <>
                          <span className="text-primary font-semibold">৳{p.discount_price}</span>
                          <span className="ml-2 text-muted-foreground line-through text-xs">৳{p.price}</span>
                        </>
                      ) : (
                        <span className="text-primary font-semibold">৳{p.price}</span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={submit} className="w-full p-2.5 text-sm font-medium text-primary hover:bg-secondary transition-smooth text-center">
              View all results for "{q.trim()}"
            </button>
          </li>
        </ul>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
      {/* === DESKTOP / TABLET === */}
      <div className="hidden md:flex container-page py-3 items-center gap-4">
        <Link to="/" className="flex items-center shrink-0">
          <img src={logoUrl || defaultLogo} alt={siteName} onError={(e) => { (e.currentTarget as HTMLImageElement).src = defaultLogo; }} className="h-12 sm:h-14 w-auto object-contain" />
        </Link>

        <div ref={wrapRef} className="flex-1 max-w-2xl relative">
          <form onSubmit={submit} className="flex items-stretch">
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder="Search for books..."
              className="flex-1 px-4 py-2.5 border border-r-0 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-background"
            />
            <button className="px-4 sm:px-5 bg-primary text-primary-foreground rounded-r-lg hover:bg-primary-hover transition-smooth" aria-label="Search">
              <Search className="h-5 w-5" />
            </button>
          </form>
          {open && q.trim().length > 0 && <SuggestList />}
        </div>

        <div className="flex items-center gap-2 sm:gap-4 text-sm">
          <Link to="/track" className="hidden md:flex items-center gap-1.5 hover:text-primary transition-smooth">
            <Truck className="h-5 w-5" /> <span>Track Order</span>
          </Link>
          {session ? (
            <Link to="/account" className="hidden md:flex items-center gap-1.5 hover:text-primary transition-smooth">
              <Settings className="h-5 w-5" /> <span>Account Settings</span>
            </Link>
          ) : (
            <Link to="/login" className="hidden md:flex items-center gap-1.5 hover:text-primary transition-smooth">
              <User className="h-5 w-5" /> <span>Login</span>
            </Link>
          )}
          {session && (
            <NotificationBell
              audience="user"
              userId={session.user.id}
              enabled={true}
              iconClassName="h-6 w-6"
            />
          )}
          <button onClick={openCart} className="relative p-2 rounded-full hover:bg-secondary transition-smooth" aria-label="Cart">
            <ShoppingCart className="h-6 w-6" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center animate-fade-in">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Desktop categories nav */}
      <nav className="hidden md:block bg-primary text-primary-foreground">
        <div className="container-page py-2.5 flex gap-6 text-sm font-medium overflow-x-auto">
          <Link to="/" className="hover:opacity-80">Home</Link>
          {navCategories.map((c) => (
            <Link key={c.id} to={`/shop?cat=${c.slug ?? ""}`} className="hover:opacity-80 whitespace-nowrap">
              {c.name}
            </Link>
          ))}
        </div>
      </nav>

      {/* === MOBILE === */}
      <div className="md:hidden">
        <div className="px-3 py-2.5 flex items-center gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Menu"
            className="p-2 -ml-1 rounded-md hover:bg-secondary"
          >
            <Menu className="h-6 w-6" />
          </button>
          <Link to="/" className="flex-1 flex justify-center items-center">
            <img src={logoUrl || defaultLogo} alt={siteName} onError={(e) => { (e.currentTarget as HTMLImageElement).src = defaultLogo; }} className="h-10 w-auto object-contain" />
          </Link>
          {session && (
            <NotificationBell
              audience="user"
              userId={session.user.id}
              enabled={true}
              iconClassName="h-6 w-6"
            />
          )}
          <button onClick={openCart} className="relative p-2 -mr-1 rounded-md hover:bg-secondary" aria-label="Cart">
            <ShoppingCart className="h-6 w-6" />
            {count > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
        </div>
        <div ref={mobileWrapRef} className="px-3 pb-3 relative">
          <form onSubmit={submit} className="flex items-stretch">
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder="Search Product..."
              className="flex-1 px-3.5 py-2.5 border-2 border-input bg-background rounded-l-lg focus:outline-none focus:border-primary text-sm"
            />
            <button className="px-4 bg-primary text-primary-foreground rounded-r-lg" aria-label="Search">
              <Search className="h-5 w-5" />
            </button>
          </form>
          {open && q.trim().length > 0 && <SuggestList />}
        </div>
      </div>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
