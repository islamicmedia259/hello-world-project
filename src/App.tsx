import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/context/CartContext";
import { CustomerAuthProvider } from "@/context/CustomerAuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import CartSidebar from "@/components/CartSidebar";
import FloatingCart from "@/components/FloatingCart";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useState, useEffect } from "react";
import MobileDrawer from "@/components/MobileDrawer";

import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import PageView from "./pages/PageView";
import LandingPage from "./pages/LandingPage";
import LandingPagesIndex from "./pages/LandingPagesIndex";
import AdminLandingPages from "./pages/admin/AdminLandingPages";
import AdminLandingPageEditor from "./pages/admin/AdminLandingPageEditor";
import NotFound from "./pages/NotFound";
import TrackOrder from "./pages/TrackOrder";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminReports from "./pages/admin/AdminReports";
import AdminFraudCheck from "./pages/admin/AdminFraudCheck";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminProducts from "./pages/admin/AdminProducts";
import { GeneralSetting, SocialMedia, ContactInfo } from "./pages/admin/AdminSiteSettings";
import { CreatePagePage, ShippingChargePage, OrderStatusPage } from "./pages/admin/AdminSiteSettingsExtra";
import AdminHomeReviews from "./pages/admin/AdminHomeReviews";
import AdminLocations from "./pages/admin/AdminLocations";
import AdminShippingZones from "./pages/admin/AdminShippingZones";
import { PaymentGatewayPage, SmsGatewayPage, CourierApiPage } from "./pages/admin/AdminApiIntegration";
import AdminEmailGateway from "./pages/admin/AdminEmailGateway";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminBanners from "./pages/admin/AdminBanners";
import AdminPlaceholder from "./pages/admin/AdminPlaceholder";
import AdminPriceEdit from "./pages/admin/AdminPriceEdit";
import { AdminCategoriesPage, AdminSubcategoriesPage, AdminChildcategoriesPage, AdminBrandsPage, AdminColorsPage, AdminSizesPage, AdminModelsPage } from "./pages/admin/AdminCatalog";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminRoles from "./pages/admin/AdminRoles";
import AdminPermissions from "./pages/admin/AdminPermissions";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminPixelManager from "./pages/admin/AdminPixelManager";
import PixelInjector from "./components/PixelInjector";
import AdminPopups from "./pages/admin/AdminPopups";
import EntryPopup from "./components/EntryPopup";
import AdminManualPayment from "./pages/admin/AdminManualPayment";
import AdminPaymentVerification from "./pages/admin/AdminPaymentVerification";
import AdminIncompleteOrders from "./pages/admin/AdminIncompleteOrders";
import AdminCoupons from "./pages/admin/AdminCoupons";
import ProtectedRoute from "./components/ProtectedRoute";
import AccountLogin from "./pages/account/AccountLogin";
import AccountSignup from "./pages/account/AccountSignup";
import AccountLayout from "./pages/account/AccountLayout";
import AccountDashboard from "./pages/account/AccountDashboard";
import AccountOrders from "./pages/account/AccountOrders";
import AccountOrderDetail from "./pages/account/AccountOrderDetail";
import AccountProfile from "./pages/account/AccountProfile";
import AccountAddress from "./pages/account/AccountAddress";
import AccountMessages from "./pages/account/AccountMessages";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

function PublicLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
      <WhatsAppButton />
      <CartSidebar />
      <FloatingCart />
      <EntryPopup />
      <MobileBottomNav onOpenMenu={() => setDrawerOpen(true)} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

const App = () => {
  const [siteSettings, setSiteSettings] = useState<any>(null);

// 🔥 TEMP TEST (পরে DB থেকে আসবে)
useEffect(() => {
  async function loadSettings() {
    const { data } = await supabase
      .from("site_settings")
      .select("favicon_url")
      .limit(1)
      .maybeSingle();

    if (data) {
      setSiteSettings(data);
    }
  }

  loadSettings();
}, []);

// 🔥 এইটাই আসল favicon logic
useEffect(() => {
  if (siteSettings?.favicon_url) {
    const link = document.getElementById("favicon") as HTMLLinkElement;

    if (link) {
      link.href = siteSettings.favicon_url + "?v=" + Date.now();
    }
  }
}, [siteSettings]);
return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CartProvider>
        <BrowserRouter>
          <CustomerAuthProvider>
          <PixelInjector />
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-confirmation/:invoice" element={<OrderConfirmation />} />
              <Route path="/p/:slug" element={<PageView />} />
              <Route path="/lp" element={<LandingPagesIndex />} />
              <Route path="/lp/:slug" element={<LandingPage />} />
              <Route path="/login" element={<AccountLogin />} />
              <Route path="/signup" element={<AccountSignup />} />
              <Route path="/track" element={<TrackOrder />} />
              <Route path="/account" element={<AccountLayout />}>
                <Route index element={<AccountDashboard />} />
                <Route path="orders" element={<AccountOrders />} />
                <Route path="orders/:invoice" element={<AccountOrderDetail />} />
                <Route path="profile" element={<AccountProfile />} />
                <Route path="address" element={<AccountAddress />} />
                <Route path="messages" element={<AccountMessages />} />
              </Route>
            </Route>
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<ProtectedRoute menuKey="dashboard"><AdminDashboard /></ProtectedRoute>} />
              <Route path="orders" element={<ProtectedRoute menuKey="orders"><AdminOrders /></ProtectedRoute>} />
              <Route path="orders/incomplete" element={<ProtectedRoute menuKey="orders"><AdminIncompleteOrders /></ProtectedRoute>} />
              <Route path="orders/:status" element={<ProtectedRoute menuKey="orders"><AdminOrders /></ProtectedRoute>} />
              <Route path="products" element={<ProtectedRoute menuKey="products"><AdminProducts /></ProtectedRoute>} />
              <Route path="categories" element={<ProtectedRoute menuKey="products"><AdminCategoriesPage /></ProtectedRoute>} />
              <Route path="subcategories" element={<ProtectedRoute menuKey="products"><AdminSubcategoriesPage /></ProtectedRoute>} />
              <Route path="childcategories" element={<ProtectedRoute menuKey="products"><AdminChildcategoriesPage /></ProtectedRoute>} />
              <Route path="brands" element={<ProtectedRoute menuKey="products"><AdminBrandsPage /></ProtectedRoute>} />
              <Route path="colors" element={<ProtectedRoute menuKey="products"><AdminColorsPage /></ProtectedRoute>} />
              <Route path="sizes" element={<ProtectedRoute menuKey="products"><AdminSizesPage /></ProtectedRoute>} />
              <Route path="models" element={<ProtectedRoute menuKey="products"><AdminModelsPage /></ProtectedRoute>} />
              <Route path="price-edit" element={<ProtectedRoute menuKey="products"><AdminPriceEdit /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute menuKey="settings"><GeneralSetting /></ProtectedRoute>} />
              <Route path="settings/social" element={<ProtectedRoute menuKey="settings"><SocialMedia /></ProtectedRoute>} />
              <Route path="settings/contact" element={<ProtectedRoute menuKey="settings"><ContactInfo /></ProtectedRoute>} />
              <Route path="settings/home-reviews" element={<ProtectedRoute menuKey="settings"><AdminHomeReviews /></ProtectedRoute>} />
              <Route path="settings/pages" element={<ProtectedRoute menuKey="settings"><CreatePagePage /></ProtectedRoute>} />
              <Route path="settings/shipping" element={<ProtectedRoute menuKey="settings"><ShippingChargePage /></ProtectedRoute>} />
              <Route path="settings/shipping-zones" element={<ProtectedRoute menuKey="settings"><AdminShippingZones /></ProtectedRoute>} />
              <Route path="settings/order-status" element={<ProtectedRoute menuKey="settings"><OrderStatusPage /></ProtectedRoute>} />
              <Route path="settings/locations" element={<ProtectedRoute menuKey="settings"><AdminLocations /></ProtectedRoute>} />
              <Route path="settings/coupons" element={<ProtectedRoute menuKey="settings"><AdminCoupons /></ProtectedRoute>} />
              <Route path="messages" element={<ProtectedRoute menuKey="messages"><AdminMessages /></ProtectedRoute>} />
              <Route path="banners" element={<ProtectedRoute menuKey="banners"><AdminBanners /></ProtectedRoute>} />
              
              <Route path="banners/popups" element={<ProtectedRoute menuKey="banners"><AdminPopups /></ProtectedRoute>} />
              <Route path="landing" element={<ProtectedRoute menuKey="landing"><AdminLandingPages /></ProtectedRoute>} />
              <Route path="landing/new" element={<ProtectedRoute menuKey="landing"><AdminLandingPageEditor /></ProtectedRoute>} />
              <Route path="landing/:id/edit" element={<ProtectedRoute menuKey="landing"><AdminLandingPageEditor /></ProtectedRoute>} />
              <Route path="users" element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
              <Route path="users/roles" element={<ProtectedRoute adminOnly><AdminRoles /></ProtectedRoute>} />
              <Route path="users/permissions" element={<ProtectedRoute adminOnly><AdminPermissions /></ProtectedRoute>} />
              <Route path="users/customers" element={<ProtectedRoute adminOnly><AdminCustomers /></ProtectedRoute>} />
              <Route path="api" element={<ProtectedRoute menuKey="api"><PaymentGatewayPage /></ProtectedRoute>} />
              <Route path="api/payment" element={<ProtectedRoute menuKey="api"><PaymentGatewayPage /></ProtectedRoute>} />
              <Route path="api/sms" element={<ProtectedRoute menuKey="api"><SmsGatewayPage /></ProtectedRoute>} />
              <Route path="api/email" element={<ProtectedRoute menuKey="api"><AdminEmailGateway /></ProtectedRoute>} />
              <Route path="api/courier" element={<ProtectedRoute menuKey="api"><CourierApiPage /></ProtectedRoute>} />
              <Route path="api/manual-payment" element={<ProtectedRoute menuKey="api"><AdminManualPayment /></ProtectedRoute>} />
              <Route path="api/payment-verification" element={<ProtectedRoute menuKey="api"><AdminPaymentVerification /></ProtectedRoute>} />
              <Route path="pixel" element={<ProtectedRoute menuKey="pixel"><AdminPixelManager /></ProtectedRoute>} />
              <Route path="pixel-manager" element={<ProtectedRoute menuKey="pixel"><AdminPixelManager /></ProtectedRoute>} />
              <Route path="reports" element={<ProtectedRoute menuKey="reports"><AdminReports /></ProtectedRoute>} />
              <Route path="fraud-check" element={<ProtectedRoute menuKey="orders"><AdminFraudCheck /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </CustomerAuthProvider>
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
