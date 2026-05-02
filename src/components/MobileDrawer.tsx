import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { X, User } from "lucide-react";
import { useCustomerAuth } from "@/context/CustomerAuthContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Cat { id: string; name: string; slug: string; image_url: string | null; }

export default function MobileDrawer({ open, onClose }: Props) {
  const [cats, setCats] = useState<Cat[]>([]);
  const [mounted, setMounted] = useState(false);
  const { session, profile } = useCustomerAuth();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    (async () => {
      const { data: cs } = await supabase
        .from("categories").select("id,name,slug,image_url").order("sort_order").order("name");
      setCats((cs as Cat[]) || []);
    })();
  }, []);

  // Lock body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity md:hidden ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 left-0 bottom-0 w-[85%] max-w-sm bg-background z-[61] shadow-2xl flex flex-col transition-transform md:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header: account banner */}
        <div className="p-3 bg-background flex items-start gap-2 border-b">
          {session ? (
            <Link
              to="/account"
              onClick={onClose}
              className="flex-1 flex items-center gap-3 bg-primary text-primary-foreground rounded-xl p-3 min-w-0"
            >
              <div className="h-11 w-11 rounded-full bg-white/90 text-primary flex items-center justify-center shrink-0 overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-6 w-6" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate">
                  {profile?.display_name || "Hello!"}
                </div>
                <div className="text-xs opacity-90 truncate">
                  {session.user.email}
                </div>
              </div>
            </Link>
          ) : (
            <Link
              to="/login"
              onClick={onClose}
              className="flex-1 flex items-center gap-3 bg-primary text-primary-foreground rounded-xl p-3"
            >
              <div className="h-11 w-11 rounded-full bg-white/90 text-primary flex items-center justify-center shrink-0">
                <User className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-base leading-tight">Hello there!</div>
                <div className="text-sm opacity-90">Sign in / Sign up</div>
              </div>
            </Link>
          )}
          <button onClick={onClose} aria-label="Close" className="p-2 -mr-1 -mt-1 rounded-full hover:bg-secondary shrink-0 text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Categories only */}
        <div className="px-4 py-3 border-b bg-secondary/30">
          <div className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Categories</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-1">
          {cats.length === 0 ? (
            <div className="px-4 py-3 text-xs text-muted-foreground">No categories</div>
          ) : (
            cats.map((c) => (
              <Link
                key={c.id}
                to={`/shop?cat=${encodeURIComponent(c.slug)}`}
                onClick={onClose}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-secondary text-left border-b border-border/40"
              >
                {c.image_url ? (
                  <img src={c.image_url} alt={c.name} className="h-8 w-8 rounded object-cover shrink-0" />
                ) : (
                  <div className="h-8 w-8 rounded bg-secondary shrink-0" />
                )}
                <span className="truncate">{c.name}</span>
              </Link>
            ))
          )}
        </nav>
      </aside>
    </>,
    document.body
  );
}
