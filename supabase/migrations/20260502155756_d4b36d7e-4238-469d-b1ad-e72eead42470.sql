ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS name text DEFAULT 'Popup';
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS style text DEFAULT 'promo';
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS subtitle text;
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS cta_label text;
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS cta_url text;
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS promo_code text;
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS bg_color text;
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS text_color text;
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS frequency_hours integer DEFAULT 24;
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS start_at timestamptz;
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS end_at timestamptz;
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

ALTER TABLE public.newsletter_subscribers ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.social_links ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS column_group text DEFAULT 'information';
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS meta_description text;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_price numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_top_feature boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_hot_deal boolean DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_top_selling boolean DEFAULT false;

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_top boolean DEFAULT false;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS show_on_home boolean DEFAULT true;

ALTER TABLE public.banner_categories ADD COLUMN IF NOT EXISTS slide_direction text DEFAULT 'left';
ALTER TABLE public.banner_categories ADD COLUMN IF NOT EXISTS slide_speed_seconds integer DEFAULT 5;
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS category_id uuid;
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS banner_category_id uuid;
UPDATE public.banners SET category_id = COALESCE(category_id, banner_category_id) WHERE category_id IS NULL AND banner_category_id IS NOT NULL;

ALTER TABLE public.pixels ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE public.pixels ADD COLUMN IF NOT EXISTS script_code text;
ALTER TABLE public.pixels ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE public.pixels ADD COLUMN IF NOT EXISTS script text;
ALTER TABLE public.pixels ADD COLUMN IF NOT EXISTS placement text DEFAULT 'head';
ALTER TABLE public.pixels ADD COLUMN IF NOT EXISTS page_target text DEFAULT 'all';
ALTER TABLE public.pixels ADD COLUMN IF NOT EXISTS custom_url text;
ALTER TABLE public.pixels ADD COLUMN IF NOT EXISTS device_target text DEFAULT 'all';
UPDATE public.pixels SET platform = COALESCE(platform, provider), script_code = COALESCE(script_code, script) WHERE platform IS NULL OR script_code IS NULL;

ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS number text;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS account_type text;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

ALTER TABLE public.districts ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.districts ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE public.thanas ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.thanas ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_to uuid;

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_spent numeric DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS dark_logo_url text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS white_logo_url text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS footer_text text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS play_store_url text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS app_store_url text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS api_keys jsonb DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.track_order(_invoice text, _phone text DEFAULT NULL)
RETURNS TABLE(id uuid, invoice_no text, customer_name text, phone text, status public.order_status, total numeric, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT o.id, o.invoice_no, o.customer_name, o.phone, o.status, o.total, o.created_at
  FROM public.orders o
  WHERE o.invoice_no = _invoice
    AND (_phone IS NULL OR o.phone = _phone)
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.track_order(text, text) TO anon, authenticated;