import { Link, NavLink, Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, ShoppingBag, Package, LogOut, Globe,
  LayoutTemplate, Users, Mail, Settings, Plug, Activity,
  Image as ImageIcon, BarChart3, Menu, X, ChevronDown, ChevronRight,
  FileText, Clock, Cog, Truck, PauseCircle, PackageCheck, CheckCircle2, XCircle, Shield
} from "lucide-react";
import { useState, useEffect } from "react";
import logo from "@/assets/logo.png";
import NotificationBell from "@/components/NotificationBell";

const orderSubmenu = [
  { to: "/admin/orders", label: "All Order", icon: FileText, end: true },
  { to: "/admin/orders/incomplete", label: "Incomplete Orders", icon: Clock },
  { to: "/admin/orders/pending", label: "Pending", icon: FileText },
  { to: "/admin/orders/processing", label: "Processing", icon: Cog },
  { to: "/admin/orders/on_the_way", label: "On The Way", icon: Truck },
  { to: "/admin/orders/on_hold", label: "On Hold", icon: PauseCircle },
  { to: "/admin/orders/in_courier", label: "In Courier", icon: PackageCheck },
  { to: "/admin/orders/completed", label: "Completed", icon: CheckCircle2 },
  { to: "/admin/orders/cancelled", label: "Cancelled", icon: XCircle },
  { to: "/admin/fraud-check", label: "Fraud Check", icon: Shield },
];

const productSubmenu = [
  { to: "/admin/products", label: "Product Manage", icon: FileText, end: true },
  { to: "/admin/categories", label: "Categories", icon: FileText },
  { to: "/admin/subcategories", label: "Subcategories", icon: FileText },
  { to: "/admin/childcategories", label: "Childcategories", icon: FileText },
  { to: "/admin/brands", label: "Brands", icon: FileText },
  { to: "/admin/colors", label: "Colors", icon: FileText },
  { to: "/admin/sizes", label: "Sizes", icon: FileText },
  { to: "/admin/models", label: "Models", icon: FileText },
  { to: "/admin/price-edit", label: "Price Edit", icon: FileText },
];

const PRODUCT_PATHS = ["/admin/products", "/admin/categories", "/admin/subcategories", "/admin/childcategories", "/admin/brands", "/admin/colors", "/admin/sizes", "/admin/models", "/admin/price-edit"];

const usersSubmenu = [
  { to: "/admin/users", label: "User", icon: FileText, end: true },
  { to: "/admin/users/roles", label: "Roles", icon: FileText },
  { to: "/admin/users/permissions", label: "Permissions", icon: FileText },
  { to: "/admin/users/customers", label: "Customers", icon: FileText },
];
const USERS_PATHS = ["/admin/users", "/admin/users/roles", "/admin/users/permissions", "/admin/users/customers"];

const settingsSubmenu = [
  { to: "/admin/settings", label: "General Setting", icon: FileText, end: true },
  { to: "/admin/settings/social", label: "Social Media", icon: FileText },
  { to: "/admin/settings/contact", label: "Contact", icon: FileText },
  { to: "/admin/settings/home-reviews", label: "Home Reviews", icon: FileText },
  { to: "/admin/settings/pages", label: "Create Page", icon: FileText },
  { to: "/admin/settings/shipping", label: "Shipping Charge", icon: FileText },
  { to: "/admin/settings/shipping-zones", label: "Shipping Zones", icon: FileText },
  { to: "/admin/settings/locations", label: "Districts & Thanas", icon: FileText },
  { to: "/admin/settings/order-status", label: "Order Status", icon: FileText },
  { to: "/admin/settings/coupons", label: "Coupons", icon: FileText },
];
const SETTINGS_PATHS = ["/admin/settings", "/admin/settings/social", "/admin/settings/contact", "/admin/settings/home-reviews", "/admin/settings/pages", "/admin/settings/shipping", "/admin/settings/shipping-zones", "/admin/settings/locations", "/admin/settings/order-status", "/admin/settings/coupons"];

const apiSubmenu = [
  { to: "/admin/api/payment", label: "Payment Gateway", icon: FileText },
  { to: "/admin/api/manual-payment", label: "Manual Payment", icon: FileText },
  { to: "/admin/api/payment-verification", label: "Payment Verification", icon: FileText },
  { to: "/admin/api/sms", label: "SMS Gateway", icon: FileText },
  { to: "/admin/api/email", label: "Email Gateway", icon: FileText },
  { to: "/admin/api/courier", label: "Courier API", icon: FileText },
];

const bannerSubmenu = [
  { to: "/admin/banners", label: "Banner & Ads", icon: FileText, end: true },
  { to: "/admin/banners/popups", label: "Popups", icon: FileText },
];
const BANNER_PATHS = ["/admin/banners", "/admin/banners/popups"];

const menu = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, menuKey: "dashboard" },
  { label: "Orders", icon: ShoppingBag, children: orderSubmenu, key: "orders", menuKey: "orders" },
  { label: "Products", icon: Package, children: productSubmenu, key: "products", menuKey: "products" },
  { to: "/admin/landing", label: "Landing Page", icon: LayoutTemplate, menuKey: "landing" },
  { label: "Users", icon: Users, children: usersSubmenu, key: "users", menuKey: "users", adminOnly: true },
  { to: "/admin/messages", label: "Contact Messages", icon: Mail, menuKey: "messages" },
  { label: "Site Setting", icon: Settings, children: settingsSubmenu, key: "settings", menuKey: "settings" },
  { label: "API Integration", icon: Plug, children: apiSubmenu, key: "api", menuKey: "api" },
  { to: "/admin/pixel", label: "Pixel & Tag Manager", icon: Activity, menuKey: "pixel" },
  { label: "Banner & Ads", icon: ImageIcon, children: bannerSubmenu, key: "banners", menuKey: "banners" },
  { to: "/admin/reports", label: "Reports", icon: BarChart3, menuKey: "reports" },
];

export default function AdminLayout() {
  const { session, isAdmin, hasPanelAccess, loading } = useAuth();
  const { can, loading: permLoading } = usePermissions();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isOrders = pathname.startsWith("/admin/orders") || pathname.startsWith("/admin/fraud-check");
  const isProducts = PRODUCT_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isUsers = pathname.startsWith("/admin/users");
  const isSettings = pathname.startsWith("/admin/settings");
  const isApi = pathname.startsWith("/admin/api");
  const isBanners = BANNER_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ orders: isOrders, products: isProducts, users: isUsers, settings: isSettings, api: isApi, banners: isBanners });

  useEffect(() => {
    setOpenGroups((g) => ({ ...g, orders: g.orders || isOrders, products: g.products || isProducts, users: g.users || isUsers, settings: g.settings || isSettings, api: g.api || isApi, banners: g.banners || isBanners }));
  }, [pathname, isOrders, isProducts, isUsers, isSettings, isApi, isBanners]);

  if (loading || permLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0b1020] text-slate-300">Loading...</div>;
  if (!session) return <Navigate to="/admin" replace />;
  if (!hasPanelAccess) return <Navigate to="/admin" replace />;

  // Filter menu by permissions
  const visibleMenu = menu.filter((m: any) => {
    if (m.adminOnly && !isAdmin) return false;
    return can(m.menuKey);
  });

  const logout = async () => { await supabase.auth.signOut(); nav("/admin"); };

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center justify-between gap-3 px-4 py-3 mx-2 my-0.5 rounded-lg text-sm transition-all ${
      isActive
        ? "bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400"
        : "text-slate-400 hover:bg-white/5 hover:text-slate-100 border-l-2 border-transparent"
    }`;

  const subLinkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 pl-12 pr-4 py-2.5 mx-2 my-0.5 rounded-lg text-sm ${
      isActive ? "text-cyan-400 bg-cyan-500/5" : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
    }`;

  const sidebarContent = (mobile = false) => (
    <aside className={`w-64 bg-[#0b1020] shrink-0 flex flex-col ${mobile ? "h-full" : "h-screen sticky top-0"} border-r border-slate-800`}>
      <div className="px-5 py-4 flex items-center justify-center gap-2 border-b border-slate-800 relative">
        <img src={logo} alt="Logo" className="h-12 w-auto object-contain" />
        {mobile && (
          <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1 hover:bg-white/10 rounded">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="py-3 flex-1 overflow-y-auto">
        {visibleMenu.map((m: any) => {
          if (m.children) {
            const isOpen = openGroups[m.key];
            const isActive = m.key === "orders" ? isOrders : m.key === "products" ? isProducts : m.key === "users" ? isUsers : m.key === "settings" ? isSettings : m.key === "api" ? isApi : isBanners;
            return (
              <div key={m.label}>
                <button
                  onClick={() => setOpenGroups({ ...openGroups, [m.key]: !isOpen })}
                  className={`group w-full flex items-center justify-between gap-3 px-4 py-3 mx-2 my-0.5 rounded-lg text-sm border-l-2 ${
                    isActive ? "bg-cyan-500/10 text-cyan-400 border-cyan-400" : "text-slate-400 hover:bg-white/5 hover:text-slate-100 border-transparent"
                  }`}
                >
                  <span className="flex items-center gap-3"><m.icon className="h-4 w-4" /> {m.label}</span>
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {isOpen && m.children.map((c: any) => (
                  <NavLink key={c.to} to={c.to} end={c.end} className={subLinkCls} onClick={() => setMobileOpen(false)}>
                    <c.icon className="h-3.5 w-3.5" /> {c.label}
                  </NavLink>
                ))}
              </div>
            );
          }
          return (
            <NavLink key={m.to} to={m.to} end className={linkCls} onClick={() => setMobileOpen(false)}>
              <span className="flex items-center gap-3"><m.icon className="h-4 w-4" /> {m.label}</span>
              <span className="text-slate-600 group-hover:text-slate-400">›</span>
            </NavLink>
          );
        })}
        <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-4 py-3 mx-2 my-0.5 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-slate-100">
          <Globe className="h-4 w-4" /> Visit Site
        </Link>
      </nav>
      <button onClick={logout} className="flex items-center gap-3 px-5 py-3 text-sm text-slate-400 hover:bg-white/5 hover:text-slate-100 border-t border-slate-800">
        <LogOut className="h-4 w-4" /> Sign Out
      </button>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-slate-100">
      <div className="hidden md:block">{sidebarContent(false)}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full max-w-[85%]">{sidebarContent(true)}</div>
        </div>
      )}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile top header */}
        <header className="md:hidden bg-white border-b px-3 py-3 flex items-center gap-3 sticky top-0 z-40">
          <button onClick={() => setMobileOpen(true)} className="text-slate-700 p-1 -ml-1 hover:bg-slate-100 rounded" aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-semibold flex-1 truncate">Admin Panel</span>
          {session?.user && (
            <NotificationBell audience="admin" userId={session.user.id} enabled={true} iconClassName="h-5 w-5" />
          )}
          <Link to="/" className="text-xs text-slate-500 hover:text-slate-700">View Site</Link>
        </header>
        {/* Desktop top header */}
        <header className="hidden md:flex bg-white border-b px-4 py-2.5 items-center gap-3 sticky top-0 z-30">
          <span className="text-sm text-slate-500">Admin Panel</span>
          <div className="flex-1" />
          {session?.user && (
            <NotificationBell audience="admin" userId={session.user.id} enabled={true} iconClassName="h-5 w-5" />
          )}
          <Link to="/" className="text-xs text-slate-500 hover:text-slate-700 ml-1">View Site</Link>
        </header>
        <div className="flex-1 p-3 sm:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
