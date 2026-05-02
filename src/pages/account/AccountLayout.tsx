import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useCustomerAuth } from "@/context/CustomerAuthContext";
import { Loader2, User, ShoppingBag, MapPin, LogOut, Settings, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function AccountLayout() {
  const { session, profile, loading, signOut } = useCustomerAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !session) nav("/login?redirect=/account");
  }, [loading, session, nav]);

  if (loading || !session) {
    return (
      <div className="container-page py-20 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    toast.success("লগ আউট হয়েছে");
    nav("/");
  };

  const initials = (profile?.display_name || session.user.email || "U")
    .split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  const links = [
    { to: "/account", label: "ড্যাশবোর্ড", icon: Settings, end: true },
    { to: "/account/orders", label: "আমার অর্ডার", icon: ShoppingBag },
    { to: "/account/messages", label: "সাপোর্ট মেসেজ", icon: MessageSquare },
    { to: "/account/profile", label: "প্রোফাইল", icon: User },
    { to: "/account/address", label: "ঠিকানা", icon: MapPin },
  ];

  return (
    <div className="bg-secondary/40 min-h-[calc(100vh-200px)] py-4 sm:py-6">
      <div className="container-page">
        {/* Mobile profile + horizontal scroll tabs */}
        <div className="lg:hidden mb-4">
          <div className="bg-card border rounded-xl p-3 flex items-center gap-3 mb-3">
            <div className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0 overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate text-sm">{profile?.display_name || "Customer"}</div>
              <div className="text-xs text-muted-foreground truncate">{session.user.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-destructive hover:bg-destructive/10"
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-lg text-[11px] font-semibold border text-center transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:border-primary/40"
                  }`
                }
              >
                <l.icon className="h-4 w-4" />
                <span className="truncate max-w-full">{l.label}</span>
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-lg text-[11px] font-semibold border border-destructive/30 bg-card text-destructive hover:bg-destructive/10 text-center"
            >
              <LogOut className="h-4 w-4" />
              <span>লগ আউট</span>
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-5 items-start">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block bg-card border rounded-xl p-4 sticky top-24">
            <div className="flex items-center gap-3 pb-4 border-b">
              <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold overflow-hidden shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="font-semibold truncate text-sm">{profile?.display_name || "Customer"}</div>
                <div className="text-xs text-muted-foreground truncate">{session.user.email}</div>
              </div>
            </div>
            <nav className="mt-3 space-y-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-secondary"
                    }`
                  }
                >
                  <l.icon className="h-4 w-4" />
                  {l.label}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" /> লগ আউট
              </button>
            </nav>
          </aside>

          <main className="min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
