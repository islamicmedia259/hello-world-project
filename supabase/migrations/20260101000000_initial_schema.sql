-- Consolidated idempotent schema (auto-generated from live DB).
-- Safe to run on empty or existing database.

SET check_function_bodies = off;









DO $idem$ BEGIN
CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user',
    'staff',
    'moderator',
    'customer'
);
EXCEPTION WHEN duplicate_object THEN NULL; END $idem$;



DO $idem$ BEGIN
CREATE TYPE public.order_status AS ENUM (
    'pending',
    'confirmed',
    'shipped',
    'delivered',
    'cancelled',
    'incomplete',
    'processing',
    'on_the_way',
    'on_hold',
    'in_courier',
    'completed'
);
EXCEPTION WHEN duplicate_object THEN NULL; END $idem$;



CREATE OR REPLACE FUNCTION public.admin_exists() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') $$;



CREATE OR REPLACE FUNCTION public.assign_default_customer_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'customer')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;



CREATE OR REPLACE FUNCTION public.current_user_is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$ SELECT public.has_role(auth.uid(), 'admin'::public.app_role) $$;



CREATE OR REPLACE FUNCTION public.get_user_menu_keys(_user_id uuid) RETURNS TABLE(menu_key text)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$ SELECT DISTINCT p.menu_key FROM public.user_roles ur JOIN public.role_permissions rp ON rp.role = ur.role JOIN public.permissions p ON p.id = rp.permission_id WHERE ur.user_id = _user_id AND p.menu_key IS NOT NULL $$;



CREATE OR REPLACE FUNCTION public.guard_user_role_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  caller uuid := auth.uid();
  is_admin boolean;
BEGIN
  IF caller IS NULL THEN
    RETURN NEW;
  END IF;

  is_admin := public.has_role(caller, 'admin'::public.app_role);

  IF NEW.role IN ('admin'::public.app_role, 'moderator'::public.app_role, 'staff'::public.app_role)
     AND NOT is_admin THEN
    RAISE EXCEPTION 'Only an admin can assign role %', NEW.role;
  END IF;

  RETURN NEW;
END;
$$;



CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;



CREATE OR REPLACE FUNCTION public.promote_first_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$ BEGIN IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN public.has_role(auth.uid(), 'admin'::public.app_role); END IF; IF auth.uid() IS NULL THEN RETURN false; END IF; INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin') ON CONFLICT (user_id, role) DO NOTHING; RETURN true; END; $$;



CREATE OR REPLACE FUNCTION public.track_order(_invoice text, _phone text DEFAULT NULL::text) RETURNS TABLE(id uuid, invoice_no text, customer_name text, phone text, status public.order_status, total numeric, created_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT o.id, o.invoice_no, o.customer_name, o.phone, o.status, o.total, o.created_at
  FROM public.orders o
  WHERE o.invoice_no = _invoice
    AND (_phone IS NULL OR o.phone = _phone)
  LIMIT 1
$$;



CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;





CREATE TABLE IF NOT EXISTS public.admin_password_otps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    code_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.banner_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    slide_direction text DEFAULT 'left'::text,
    slide_speed_seconds integer DEFAULT 5
);



CREATE TABLE IF NOT EXISTS public.banners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text,
    subtitle text,
    image_url text NOT NULL,
    link_url text,
    banner_category_id uuid,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category_id uuid
);



CREATE TABLE IF NOT EXISTS public.brands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text,
    logo_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text,
    description text,
    image_url text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_top boolean DEFAULT false,
    show_on_home boolean DEFAULT true
);



CREATE TABLE IF NOT EXISTS public.childcategories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subcategory_id uuid,
    name text NOT NULL,
    slug text,
    image_url text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.colors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.contact_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    subject text,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.coupon_products (
    coupon_id uuid NOT NULL,
    product_id uuid NOT NULL
);



CREATE TABLE IF NOT EXISTS public.coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    type text DEFAULT 'fixed'::text,
    value numeric DEFAULT 0 NOT NULL,
    min_order_amount numeric DEFAULT 0,
    max_discount numeric,
    usage_limit integer,
    used_count integer DEFAULT 0,
    starts_at timestamp with time zone,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.courier_shipments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    courier text NOT NULL,
    tracking_id text,
    status text,
    payload jsonb DEFAULT '{}'::jsonb,
    response jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.customer_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    sender text NOT NULL,
    body text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    district text,
    thana text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    total_spent numeric DEFAULT 0,
    is_blocked boolean DEFAULT false,
    total_orders integer DEFAULT 0 NOT NULL,
    notes text
);



CREATE TABLE IF NOT EXISTS public.districts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    division text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0
);



CREATE TABLE IF NOT EXISTS public.email_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient text NOT NULL,
    subject text,
    status text,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.home_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    rating integer DEFAULT 5,
    comment text,
    image_url text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.incomplete_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_items jsonb DEFAULT '[]'::jsonb,
    customer_info jsonb DEFAULT '{}'::jsonb,
    total numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.landing_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    content jsonb DEFAULT '{}'::jsonb,
    is_published boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.manual_payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    account_number text,
    instructions text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source text
);



CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    audience text DEFAULT 'admin'::text NOT NULL,
    user_id uuid,
    type text,
    title text NOT NULL,
    message text,
    link text,
    meta jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    product_name text NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    total numeric GENERATED ALWAYS AS ((unit_price * (quantity)::numeric)) STORED,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.order_statuses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    color text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    key text,
    label text,
    is_active boolean DEFAULT true NOT NULL
);



CREATE TABLE IF NOT EXISTS public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_no text DEFAULT ('INV-'::text || upper(substr((gen_random_uuid())::text, 1, 8))),
    customer_id uuid,
    customer_name text,
    email text,
    phone text,
    address text,
    district text,
    thana text,
    subtotal numeric DEFAULT 0,
    shipping_charge numeric DEFAULT 0,
    discount numeric DEFAULT 0,
    total numeric DEFAULT 0 NOT NULL,
    status public.order_status DEFAULT 'pending'::public.order_status,
    payment_method text,
    payment_status text DEFAULT 'pending'::text,
    transaction_id text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    assigned_to uuid,
    shipping_cost numeric DEFAULT 0 NOT NULL
);



CREATE TABLE IF NOT EXISTS public.pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    content text,
    is_published boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true,
    column_group text DEFAULT 'information'::text,
    sort_order integer DEFAULT 0,
    meta_description text
);



CREATE TABLE IF NOT EXISTS public.payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'manual'::text,
    instructions text,
    account_number text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    number text,
    account_type text,
    is_default boolean DEFAULT false
);



CREATE TABLE IF NOT EXISTS public.pending_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_name text,
    phone text,
    address text,
    total numeric DEFAULT 0,
    payment_method text,
    transaction_id text,
    cart_items jsonb DEFAULT '[]'::jsonb,
    notes text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    created_order_id uuid,
    rejection_reason text
);



CREATE TABLE IF NOT EXISTS public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    menu_key text,
    label text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    key text
);



CREATE TABLE IF NOT EXISTS public.pixels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    provider text NOT NULL,
    pixel_id text,
    script text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    platform text,
    script_code text,
    placement text DEFAULT 'head'::text,
    page_target text DEFAULT 'all'::text,
    custom_url text,
    device_target text DEFAULT 'all'::text,
    fire_count integer DEFAULT 0 NOT NULL
);



CREATE TABLE IF NOT EXISTS public.popups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text,
    content text,
    image_url text,
    link_url text,
    trigger_type text DEFAULT 'on_load'::text,
    delay_seconds integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text DEFAULT 'Popup'::text,
    style text DEFAULT 'promo'::text,
    subtitle text,
    description text,
    cta_label text,
    cta_url text,
    promo_code text,
    bg_color text,
    text_color text,
    frequency_hours integer DEFAULT 24,
    start_at timestamp with time zone,
    end_at timestamp with time zone,
    sort_order integer DEFAULT 0
);



CREATE TABLE IF NOT EXISTS public.price_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    old_price numeric,
    new_price numeric,
    changed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    old_discount numeric,
    new_discount numeric
);



CREATE TABLE IF NOT EXISTS public.product_colors (
    product_id uuid NOT NULL,
    color_id uuid NOT NULL
);



CREATE TABLE IF NOT EXISTS public.product_models (
    product_id uuid NOT NULL,
    model_id uuid NOT NULL
);



CREATE TABLE IF NOT EXISTS public.product_shipping_charges (
    product_id uuid NOT NULL,
    shipping_charge_id uuid NOT NULL
);



CREATE TABLE IF NOT EXISTS public.product_sizes (
    product_id uuid NOT NULL,
    size_id uuid NOT NULL
);



CREATE TABLE IF NOT EXISTS public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    color_id uuid,
    size_id uuid,
    model_id uuid,
    sku text,
    price numeric,
    stock_quantity integer DEFAULT 0,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text,
    description text,
    short_description text,
    price numeric DEFAULT 0 NOT NULL,
    sale_price numeric,
    compare_at_price numeric,
    cost_price numeric,
    sku text,
    stock_quantity integer DEFAULT 0,
    image_url text,
    images text[],
    gallery_urls text[],
    category_id uuid,
    subcategory_id uuid,
    childcategory_id uuid,
    brand_id uuid,
    is_active boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    weight numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    discount_price numeric,
    is_top_feature boolean DEFAULT false,
    is_hot_deal boolean DEFAULT false,
    is_top_selling boolean DEFAULT false
);



CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text,
    display_name text,
    avatar_url text,
    phone text,
    address text,
    city text,
    postal_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true,
    district text,
    thana text
);



CREATE TABLE IF NOT EXISTS public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role public.app_role NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.shipping_charges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    charge numeric DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    zone text,
    zone_id uuid
);



CREATE TABLE IF NOT EXISTS public.shipping_zone_districts (
    shipping_zone_id uuid NOT NULL,
    district_id uuid NOT NULL
);



CREATE TABLE IF NOT EXISTS public.shipping_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    charge numeric DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.site_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_name text DEFAULT 'Navigator Series Book'::text,
    logo_url text,
    favicon_url text,
    hero_title text,
    hero_subtitle text,
    contact_email text,
    contact_phone text,
    whatsapp_number text,
    address text,
    currency text DEFAULT 'BDT'::text,
    home_reviews_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    dark_logo_url text,
    white_logo_url text,
    footer_text text,
    play_store_url text,
    app_store_url text,
    api_keys jsonb DEFAULT '{}'::jsonb
);



CREATE TABLE IF NOT EXISTS public.sizes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.social_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    platform text,
    url text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sort_order integer DEFAULT 0,
    name text,
    icon_key text,
    color text
);



CREATE TABLE IF NOT EXISTS public.subcategories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid,
    name text NOT NULL,
    slug text,
    image_url text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.thanas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    district_id uuid,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0
);



CREATE TABLE IF NOT EXISTS public.user_password_otps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    code_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE IF NOT EXISTS public.variant_shipping_charges (
    variant_id uuid NOT NULL,
    shipping_charge_id uuid NOT NULL
);



DO $idem$ BEGIN
ALTER TABLE ONLY public.admin_password_otps
    ADD CONSTRAINT admin_password_otps_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.banner_categories
    ADD CONSTRAINT banner_categories_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.banner_categories
    ADD CONSTRAINT banner_categories_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.childcategories
    ADD CONSTRAINT childcategories_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.childcategories
    ADD CONSTRAINT childcategories_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.colors
    ADD CONSTRAINT colors_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.coupon_products
    ADD CONSTRAINT coupon_products_pkey PRIMARY KEY (coupon_id, product_id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.courier_shipments
    ADD CONSTRAINT courier_shipments_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.customer_messages
    ADD CONSTRAINT customer_messages_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.home_reviews
    ADD CONSTRAINT home_reviews_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.incomplete_orders
    ADD CONSTRAINT incomplete_orders_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.landing_pages
    ADD CONSTRAINT landing_pages_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.landing_pages
    ADD CONSTRAINT landing_pages_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.manual_payment_methods
    ADD CONSTRAINT manual_payment_methods_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.models
    ADD CONSTRAINT models_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_email_key UNIQUE (email);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.order_statuses
    ADD CONSTRAINT order_statuses_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_invoice_no_key UNIQUE (invoice_no);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.pending_payments
    ADD CONSTRAINT pending_payments_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_menu_key_key UNIQUE (menu_key);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.pixels
    ADD CONSTRAINT pixels_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.popups
    ADD CONSTRAINT popups_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.product_colors
    ADD CONSTRAINT product_colors_pkey PRIMARY KEY (product_id, color_id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.product_models
    ADD CONSTRAINT product_models_pkey PRIMARY KEY (product_id, model_id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.product_shipping_charges
    ADD CONSTRAINT product_shipping_charges_pkey PRIMARY KEY (product_id, shipping_charge_id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.product_sizes
    ADD CONSTRAINT product_sizes_pkey PRIMARY KEY (product_id, size_id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_permission_id_key UNIQUE (role, permission_id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.shipping_charges
    ADD CONSTRAINT shipping_charges_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.shipping_zone_districts
    ADD CONSTRAINT shipping_zone_districts_pkey PRIMARY KEY (shipping_zone_id, district_id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.shipping_zones
    ADD CONSTRAINT shipping_zones_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.sizes
    ADD CONSTRAINT sizes_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.social_links
    ADD CONSTRAINT social_links_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.thanas
    ADD CONSTRAINT thanas_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.user_password_otps
    ADD CONSTRAINT user_password_otps_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.variant_shipping_charges
    ADD CONSTRAINT variant_shipping_charges_pkey PRIMARY KEY (variant_id, shipping_charge_id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
CREATE UNIQUE INDEX IF NOT EXISTS permissions_key_unique ON public.permissions USING btree (key) WHERE (key IS NOT NULL);



CREATE OR REPLACE TRIGGER trg_guard_user_role_changes BEFORE INSERT OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.guard_user_role_changes();



CREATE OR REPLACE TRIGGER trg_profiles_default_role AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.assign_default_customer_role();



DO $idem$ BEGIN
ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_banner_category_id_fkey FOREIGN KEY (banner_category_id) REFERENCES public.banner_categories(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.childcategories
    ADD CONSTRAINT childcategories_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.coupon_products
    ADD CONSTRAINT coupon_products_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.coupon_products
    ADD CONSTRAINT coupon_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.courier_shipments
    ADD CONSTRAINT courier_shipments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.product_colors
    ADD CONSTRAINT product_colors_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.product_colors
    ADD CONSTRAINT product_colors_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.product_models
    ADD CONSTRAINT product_models_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.models(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.product_models
    ADD CONSTRAINT product_models_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.product_shipping_charges
    ADD CONSTRAINT product_shipping_charges_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.product_shipping_charges
    ADD CONSTRAINT product_shipping_charges_shipping_charge_id_fkey FOREIGN KEY (shipping_charge_id) REFERENCES public.shipping_charges(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.product_sizes
    ADD CONSTRAINT product_sizes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.product_sizes
    ADD CONSTRAINT product_sizes_size_id_fkey FOREIGN KEY (size_id) REFERENCES public.sizes(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.models(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_size_id_fkey FOREIGN KEY (size_id) REFERENCES public.sizes(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_childcategory_id_fkey FOREIGN KEY (childcategory_id) REFERENCES public.childcategories(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.shipping_zone_districts
    ADD CONSTRAINT shipping_zone_districts_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.shipping_zone_districts
    ADD CONSTRAINT shipping_zone_districts_shipping_zone_id_fkey FOREIGN KEY (shipping_zone_id) REFERENCES public.shipping_zones(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.thanas
    ADD CONSTRAINT thanas_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.variant_shipping_charges
    ADD CONSTRAINT variant_shipping_charges_shipping_charge_id_fkey FOREIGN KEY (shipping_charge_id) REFERENCES public.shipping_charges(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE ONLY public.variant_shipping_charges
    ADD CONSTRAINT variant_shipping_charges_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DROP POLICY IF EXISTS "Admins manage permissions" ON public.permissions;
CREATE POLICY "Admins manage permissions" ON public.permissions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));



DROP POLICY IF EXISTS "Admins manage role permissions" ON public.role_permissions;
CREATE POLICY "Admins manage role permissions" ON public.role_permissions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));



DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));



DROP POLICY IF EXISTS "Anyone creates contact messages" ON public.contact_messages;
CREATE POLICY "Anyone creates contact messages" ON public.contact_messages FOR INSERT WITH CHECK (true);



DROP POLICY IF EXISTS "Anyone creates customers" ON public.customers;
CREATE POLICY "Anyone creates customers" ON public.customers FOR INSERT WITH CHECK (true);



DROP POLICY IF EXISTS "Anyone creates order items" ON public.order_items;
CREATE POLICY "Anyone creates order items" ON public.order_items FOR INSERT WITH CHECK (true);



DROP POLICY IF EXISTS "Anyone creates orders" ON public.orders;
CREATE POLICY "Anyone creates orders" ON public.orders FOR INSERT WITH CHECK (true);



DROP POLICY IF EXISTS "Anyone creates pending payments" ON public.pending_payments;
CREATE POLICY "Anyone creates pending payments" ON public.pending_payments FOR INSERT WITH CHECK (true);



DROP POLICY IF EXISTS "Anyone creates subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Anyone creates subscribers" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);



DROP POLICY IF EXISTS "Anyone reads banner categories" ON public.banner_categories;
CREATE POLICY "Anyone reads banner categories" ON public.banner_categories FOR SELECT USING ((is_active = true));



DROP POLICY IF EXISTS "Anyone reads banners" ON public.banners;
CREATE POLICY "Anyone reads banners" ON public.banners FOR SELECT USING ((is_active = true));



DROP POLICY IF EXISTS "Anyone reads colors" ON public.colors;
CREATE POLICY "Anyone reads colors" ON public.colors FOR SELECT USING (true);



DROP POLICY IF EXISTS "Anyone reads districts" ON public.districts;
CREATE POLICY "Anyone reads districts" ON public.districts FOR SELECT USING (true);



DROP POLICY IF EXISTS "Anyone reads home reviews" ON public.home_reviews;
CREATE POLICY "Anyone reads home reviews" ON public.home_reviews FOR SELECT USING ((is_active = true));



DROP POLICY IF EXISTS "Anyone reads models" ON public.models;
CREATE POLICY "Anyone reads models" ON public.models FOR SELECT USING (true);



DROP POLICY IF EXISTS "Anyone reads pages" ON public.pages;
CREATE POLICY "Anyone reads pages" ON public.pages FOR SELECT USING ((is_published = true));



DROP POLICY IF EXISTS "Anyone reads payment methods" ON public.payment_methods;
CREATE POLICY "Anyone reads payment methods" ON public.payment_methods FOR SELECT USING ((is_active = true));



DROP POLICY IF EXISTS "Anyone reads popups" ON public.popups;
CREATE POLICY "Anyone reads popups" ON public.popups FOR SELECT USING ((is_active = true));



DROP POLICY IF EXISTS "Anyone reads product models" ON public.product_models;
CREATE POLICY "Anyone reads product models" ON public.product_models FOR SELECT USING (true);



DROP POLICY IF EXISTS "Anyone reads product options" ON public.product_colors;
CREATE POLICY "Anyone reads product options" ON public.product_colors FOR SELECT USING (true);



DROP POLICY IF EXISTS "Anyone reads product shipping" ON public.product_shipping_charges;
CREATE POLICY "Anyone reads product shipping" ON public.product_shipping_charges FOR SELECT USING (true);



DROP POLICY IF EXISTS "Anyone reads product sizes" ON public.product_sizes;
CREATE POLICY "Anyone reads product sizes" ON public.product_sizes FOR SELECT USING (true);



DROP POLICY IF EXISTS "Anyone reads products" ON public.products;
CREATE POLICY "Anyone reads products" ON public.products FOR SELECT USING ((is_active = true));



DROP POLICY IF EXISTS "Anyone reads public brands" ON public.brands;
CREATE POLICY "Anyone reads public brands" ON public.brands FOR SELECT USING ((is_active = true));



DROP POLICY IF EXISTS "Anyone reads public catalog" ON public.categories;
CREATE POLICY "Anyone reads public catalog" ON public.categories FOR SELECT USING ((is_active = true));



DROP POLICY IF EXISTS "Anyone reads public childcategories" ON public.childcategories;
CREATE POLICY "Anyone reads public childcategories" ON public.childcategories FOR SELECT USING ((is_active = true));



DROP POLICY IF EXISTS "Anyone reads public settings" ON public.site_settings;
CREATE POLICY "Anyone reads public settings" ON public.site_settings FOR SELECT USING (true);



DROP POLICY IF EXISTS "Anyone reads public subcategories" ON public.subcategories;
CREATE POLICY "Anyone reads public subcategories" ON public.subcategories FOR SELECT USING ((is_active = true));



DROP POLICY IF EXISTS "Anyone reads shipping" ON public.shipping_charges;
CREATE POLICY "Anyone reads shipping" ON public.shipping_charges FOR SELECT USING ((is_active = true));



DROP POLICY IF EXISTS "Anyone reads shipping zones" ON public.shipping_zones;
CREATE POLICY "Anyone reads shipping zones" ON public.shipping_zones FOR SELECT USING ((is_active = true));



DROP POLICY IF EXISTS "Anyone reads sizes" ON public.sizes;
CREATE POLICY "Anyone reads sizes" ON public.sizes FOR SELECT USING (true);



DROP POLICY IF EXISTS "Anyone reads social links" ON public.social_links;
CREATE POLICY "Anyone reads social links" ON public.social_links FOR SELECT USING ((is_active = true));



DROP POLICY IF EXISTS "Anyone reads thanas" ON public.thanas;
CREATE POLICY "Anyone reads thanas" ON public.thanas FOR SELECT USING (true);



DROP POLICY IF EXISTS "Anyone reads variant shipping" ON public.variant_shipping_charges;
CREATE POLICY "Anyone reads variant shipping" ON public.variant_shipping_charges FOR SELECT USING (true);



DROP POLICY IF EXISTS "Anyone reads variants" ON public.product_variants;
CREATE POLICY "Anyone reads variants" ON public.product_variants FOR SELECT USING (true);



DROP POLICY IF EXISTS "Anyone reads zone districts" ON public.shipping_zone_districts;
CREATE POLICY "Anyone reads zone districts" ON public.shipping_zone_districts FOR SELECT USING (true);



DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));



DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));



DROP POLICY IF EXISTS "Users see own roles" ON public.user_roles;
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));



DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'::public.app_role)));



DO $idem$ BEGIN
ALTER TABLE public.admin_password_otps ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.banner_categories ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.childcategories ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.coupon_products ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.courier_shipments ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.customer_messages ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.home_reviews ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.incomplete_orders ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.manual_payment_methods ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.order_statuses ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.pixels ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.popups ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.product_models ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.product_shipping_charges ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.shipping_charges ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.shipping_zone_districts ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.sizes ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.thanas ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.user_password_otps ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
DO $idem$ BEGIN
ALTER TABLE public.variant_shipping_charges ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN invalid_table_definition THEN NULL; WHEN duplicate_column THEN NULL; WHEN undefined_column THEN NULL; WHEN undefined_table THEN NULL; END $idem$;
