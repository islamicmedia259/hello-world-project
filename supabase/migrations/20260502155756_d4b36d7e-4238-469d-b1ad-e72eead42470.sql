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

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_cost numeric NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes text;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shipping_charge') THEN
    EXECUTE 'UPDATE public.orders SET shipping_cost = COALESCE(shipping_cost, shipping_charge, 0) WHERE shipping_cost = 0';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'discount') THEN
    EXECUTE 'UPDATE public.orders SET discount_amount = COALESCE(discount_amount, discount, 0) WHERE discount_amount = 0';
  END IF;
END $$;

-- PostgreSQL cannot change a function return type with CREATE OR REPLACE.
-- Drop first so this migration works whether track_order currently returns jsonb or a table.
DROP FUNCTION IF EXISTS public.track_order(text, text);

CREATE FUNCTION public.track_order(_invoice text, _phone text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o record;
  items jsonb;
BEGIN
  SELECT id, invoice_no, customer_name, phone, address, status, total, shipping_cost, discount_amount, payment_method, payment_status, created_at, notes
  INTO o
  FROM public.orders
  WHERE invoice_no = _invoice
    AND (_phone IS NULL OR regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g'))
  LIMIT 1;

  IF o IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'product_name', oi.product_name,
    'unit_price', oi.unit_price,
    'quantity', oi.quantity
  )), '[]'::jsonb)
  INTO items
  FROM public.order_items oi
  WHERE oi.order_id = o.id;

  RETURN jsonb_build_object(
    'invoice_no', o.invoice_no,
    'customer_name', o.customer_name,
    'phone', o.phone,
    'address', o.address,
    'status', o.status,
    'total', o.total,
    'shipping_cost', o.shipping_cost,
    'discount_amount', o.discount_amount,
    'payment_method', o.payment_method,
    'payment_status', o.payment_status,
    'created_at', o.created_at,
    'notes', o.notes,
    'items', items
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_order(text, text) TO anon, authenticated;