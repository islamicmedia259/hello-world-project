--
-- PostgreSQL database dump
--

\restrict v5oGjIZxQf0NvvYbcIEBsdwcVyhaXHR65Yxd831Cmx9IsE8uKf2uA3gG5Gu6bBH

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user',
    'staff'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

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


--
-- Name: assign_first_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_first_admin() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: get_user_menu_keys(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_menu_keys(_user_id uuid) RETURNS TABLE(menu_key text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT DISTINCT p.menu_key
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON rp.role = ur.role
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = _user_id AND p.menu_key IS NOT NULL
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;


--
-- Name: notify_on_contact_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_contact_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.notifications (audience, user_id, type, title, message, link, meta)
  VALUES ('admin', NULL, 'new_contact',
          'নতুন কনট্যাক্ট মেসেজ',
          NEW.name || ' — ' || COALESCE(NEW.subject, LEFT(NEW.message, 60)),
          '/admin/contact-messages',
          jsonb_build_object('contact_id', NEW.id));
  RETURN NEW;
END;$$;


--
-- Name: notify_on_customer_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_customer_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.sender = 'customer' THEN
    INSERT INTO public.notifications (audience, user_id, type, title, message, link, meta)
    VALUES ('admin', NULL, 'new_message',
            'নতুন সাপোর্ট মেসেজ',
            LEFT(NEW.body, 80),
            '/admin/messages',
            jsonb_build_object('customer_id', NEW.customer_id, 'message_id', NEW.id));
  ELSIF NEW.sender = 'admin' THEN
    INSERT INTO public.notifications (audience, user_id, type, title, message, link, meta)
    VALUES ('user', NEW.customer_id, 'support_reply',
            'সাপোর্ট থেকে রিপ্লাই',
            LEFT(NEW.body, 80),
            '/account/messages',
            jsonb_build_object('message_id', NEW.id));
  END IF;
  RETURN NEW;
END;$$;


--
-- Name: notify_on_new_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_new_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.notifications (audience, user_id, type, title, message, link, meta)
  VALUES ('admin', NULL, 'new_order',
          'নতুন অর্ডার',
          COALESCE(NEW.customer_name,'Customer') || ' — ৳' || NEW.total::text || ' (Invoice ' || NEW.invoice_no || ')',
          '/admin/orders',
          jsonb_build_object('order_id', NEW.id, 'invoice_no', NEW.invoice_no));

  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (audience, user_id, type, title, message, link, meta)
    VALUES ('user', NEW.user_id, 'order_status',
            'অর্ডার প্লেস হয়েছে',
            'Invoice ' || NEW.invoice_no || ' — স্ট্যাটাস: ' || NEW.status,
            '/account/orders',
            jsonb_build_object('order_id', NEW.id, 'invoice_no', NEW.invoice_no, 'status', NEW.status));
  END IF;
  RETURN NEW;
END;$$;


--
-- Name: notify_on_order_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_order_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (audience, user_id, type, title, message, link, meta)
    VALUES ('user', NEW.user_id, 'order_status',
            'অর্ডার আপডেট',
            'Invoice ' || NEW.invoice_no || ' — নতুন স্ট্যাটাস: ' || NEW.status,
            '/account/orders',
            jsonb_build_object('order_id', NEW.id, 'invoice_no', NEW.invoice_no, 'status', NEW.status));
  END IF;
  RETURN NEW;
END;$$;


--
-- Name: notify_on_pending_payment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_pending_payment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.notifications (audience, user_id, type, title, message, link, meta)
  VALUES ('admin', NULL, 'new_pending_payment',
          'নতুন pending পেমেন্ট',
          NEW.customer_name || ' — ৳' || NEW.total::text || ' via ' || NEW.payment_method,
          '/admin/pending-payments',
          jsonb_build_object('pending_id', NEW.id));
  RETURN NEW;
END;$$;


--
-- Name: notify_on_pending_payment_review(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_on_pending_payment_review() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  target_user UUID;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved','rejected') THEN
    SELECT user_id INTO target_user
    FROM public.profiles
    WHERE regexp_replace(COALESCE(phone,''),'\D','','g') = regexp_replace(NEW.phone,'\D','','g')
    LIMIT 1;

    IF target_user IS NOT NULL THEN
      INSERT INTO public.notifications (audience, user_id, type, title, message, link, meta)
      VALUES ('user', target_user, 'payment_review',
              CASE WHEN NEW.status = 'approved' THEN 'পেমেন্ট অ্যাপ্রুভড' ELSE 'পেমেন্ট রিজেক্টেড' END,
              '৳' || NEW.total::text || ' via ' || NEW.payment_method ||
                CASE WHEN NEW.status = 'rejected' AND NEW.rejection_reason IS NOT NULL
                     THEN ' — ' || NEW.rejection_reason ELSE '' END,
              '/account/orders',
              jsonb_build_object('pending_id', NEW.id, 'status', NEW.status));
    END IF;
  END IF;
  RETURN NEW;
END;$$;


--
-- Name: track_order(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_order(_invoice text, _phone text) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  o record;
  items jsonb;
BEGIN
  SELECT id, invoice_no, customer_name, phone, address, status, total, subtotal_calc, shipping_cost, discount_amount, payment_method, payment_status, created_at, notes
  INTO o
  FROM (
    SELECT *, (total - shipping_cost + COALESCE(discount_amount,0)) AS subtotal_calc
    FROM public.orders
    WHERE invoice_no = _invoice
      AND regexp_replace(phone, '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g')
    LIMIT 1
  ) sub;

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


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: upsert_customer_on_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_customer_on_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.customers (phone, name, address, total_orders, total_spent)
  VALUES (NEW.phone, NEW.customer_name, NEW.address, 1, NEW.total)
  ON CONFLICT (phone) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    total_orders = public.customers.total_orders + 1,
    total_spent = public.customers.total_spent + NEW.total,
    updated_at = now();
  RETURN NEW;
END; $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_password_otps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_password_otps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    code_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: banner_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banner_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    slide_direction text DEFAULT 'left'::text NOT NULL,
    slide_speed_seconds integer DEFAULT 5 NOT NULL
);


--
-- Name: banners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    subtitle text,
    image_url text NOT NULL,
    link_url text,
    "position" text DEFAULT 'hero'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    category_id uuid
);


--
-- Name: brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    image_url text,
    is_top boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    show_on_home boolean DEFAULT false NOT NULL
);


--
-- Name: childcategories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.childcategories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subcategory_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: colors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.colors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    hex_code text DEFAULT '#000000'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contact_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    subject text,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coupon_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupon_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coupon_id uuid NOT NULL,
    product_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text,
    discount_type text DEFAULT 'percent'::text NOT NULL,
    discount_value numeric DEFAULT 0 NOT NULL,
    scope text DEFAULT 'global'::text NOT NULL,
    min_order_amount numeric DEFAULT 0 NOT NULL,
    max_discount numeric,
    usage_limit integer,
    used_count integer DEFAULT 0 NOT NULL,
    starts_at timestamp with time zone,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: courier_shipments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courier_shipments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    provider text NOT NULL,
    consignment_id text,
    tracking_code text,
    status text DEFAULT 'pending'::text NOT NULL,
    raw_response jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    sender text NOT NULL,
    body text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT customer_messages_sender_check CHECK ((sender = ANY (ARRAY['customer'::text, 'admin'::text])))
);

ALTER TABLE ONLY public.customer_messages REPLICA IDENTITY FULL;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    name text,
    email text,
    address text,
    total_orders integer DEFAULT 0 NOT NULL,
    total_spent numeric DEFAULT 0 NOT NULL,
    is_blocked boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: districts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.districts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient text NOT NULL,
    subject text,
    status text DEFAULT 'sent'::text NOT NULL,
    error_message text,
    message_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: incomplete_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incomplete_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    customer_name text,
    email text,
    district text,
    thana text,
    address text,
    notes text,
    cart_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    subtotal numeric DEFAULT 0 NOT NULL,
    shipping_cost numeric DEFAULT 0 NOT NULL,
    total numeric DEFAULT 0 NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    completed_order_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: landing_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.landing_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    meta_description text,
    product_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    order_mode text DEFAULT 'inline'::text NOT NULL,
    hero_headline text,
    hero_subheadline text,
    hero_cta_label text DEFAULT 'অর্ডার করুন'::text,
    hero_image_url text,
    hero_video_url text,
    hero_bg_color text DEFAULT '#ffffff'::text,
    hero_text_color text DEFAULT '#0f172a'::text,
    show_product_section boolean DEFAULT true NOT NULL,
    product_section_title text DEFAULT 'প্রোডাক্ট'::text,
    custom_price numeric,
    custom_discount_price numeric,
    show_features boolean DEFAULT true NOT NULL,
    features_title text DEFAULT 'কেন আমরা সেরা?'::text,
    features jsonb DEFAULT '[]'::jsonb NOT NULL,
    show_countdown boolean DEFAULT false NOT NULL,
    countdown_title text DEFAULT 'লিমিটেড অফার!'::text,
    countdown_end_at timestamp with time zone,
    show_reviews boolean DEFAULT true NOT NULL,
    reviews_title text DEFAULT 'কাস্টমার রিভিউ'::text,
    reviews jsonb DEFAULT '[]'::jsonb NOT NULL,
    show_gallery boolean DEFAULT false NOT NULL,
    gallery_title text DEFAULT 'গ্যালারি'::text,
    gallery jsonb DEFAULT '[]'::jsonb NOT NULL,
    show_faq boolean DEFAULT true NOT NULL,
    faq_title text DEFAULT 'প্রশ্নোত্তর'::text,
    faqs jsonb DEFAULT '[]'::jsonb NOT NULL,
    final_cta_title text DEFAULT 'এখনই অর্ডার করুন!'::text,
    final_cta_subtitle text,
    primary_color text DEFAULT '#dc2626'::text,
    view_count integer DEFAULT 0 NOT NULL,
    order_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    show_banners boolean DEFAULT true NOT NULL,
    banners_title text DEFAULT 'অফার ব্যানার'::text,
    banners jsonb DEFAULT '[]'::jsonb NOT NULL,
    description text
);


--
-- Name: models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.models (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: newsletter_subscribers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.newsletter_subscribers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    source text DEFAULT 'popup'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    audience text DEFAULT 'user'::text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text,
    link text,
    meta jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_audience_check CHECK ((audience = ANY (ARRAY['user'::text, 'admin'::text])))
);

ALTER TABLE ONLY public.notifications REPLICA IDENTITY FULL;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    product_name text NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    quantity integer NOT NULL,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);

ALTER TABLE ONLY public.order_items REPLICA IDENTITY FULL;


--
-- Name: order_statuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_statuses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    color text DEFAULT '#94a3b8'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_no text DEFAULT (to_char(now(), 'YYMMDD'::text) || lpad((floor((random() * (100000)::double precision)))::text, 5, '0'::text)) NOT NULL,
    customer_name text NOT NULL,
    phone text NOT NULL,
    address text NOT NULL,
    total numeric(10,2) NOT NULL,
    status public.order_status DEFAULT 'pending'::public.order_status NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    assigned_to uuid,
    shipping_cost numeric DEFAULT 0 NOT NULL,
    discount numeric DEFAULT 0 NOT NULL,
    payment_method text,
    transaction_id text,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    coupon_code text,
    discount_amount numeric DEFAULT 0 NOT NULL,
    user_id uuid
);

ALTER TABLE ONLY public.orders REPLICA IDENTITY FULL;


--
-- Name: pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    content text,
    meta_description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    column_group text DEFAULT 'information'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    number text NOT NULL,
    account_type text DEFAULT 'personal'::text NOT NULL,
    instructions text,
    is_active boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pending_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_name text NOT NULL,
    phone text NOT NULL,
    address text NOT NULL,
    notes text,
    total numeric NOT NULL,
    payment_method text NOT NULL,
    transaction_id text NOT NULL,
    cart_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    rejection_reason text,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    created_order_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    menu_key text
);


--
-- Name: pixels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pixels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    platform text DEFAULT 'custom'::text NOT NULL,
    pixel_id text,
    script_code text NOT NULL,
    placement text DEFAULT 'head'::text NOT NULL,
    page_target text DEFAULT 'all'::text NOT NULL,
    custom_url text,
    device_target text DEFAULT 'all'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    fire_count integer DEFAULT 0 NOT NULL,
    last_fired_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: popups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.popups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    style text DEFAULT 'image_link'::text NOT NULL,
    title text,
    subtitle text,
    description text,
    image_url text,
    link_url text,
    cta_label text,
    cta_url text,
    promo_code text,
    bg_color text DEFAULT '#ffffff'::text,
    text_color text DEFAULT '#0f172a'::text,
    delay_seconds integer DEFAULT 3 NOT NULL,
    frequency_hours integer DEFAULT 24 NOT NULL,
    start_at timestamp with time zone,
    end_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    old_price numeric NOT NULL,
    new_price numeric NOT NULL,
    old_discount numeric,
    new_discount numeric,
    changed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_colors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_colors (
    product_id uuid NOT NULL,
    color_id uuid NOT NULL
);


--
-- Name: product_models; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_models (
    product_id uuid NOT NULL,
    model_id uuid NOT NULL
);


--
-- Name: product_shipping_charges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_shipping_charges (
    product_id uuid NOT NULL,
    shipping_charge_id uuid NOT NULL
);


--
-- Name: product_sizes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_sizes (
    product_id uuid NOT NULL,
    size_id uuid NOT NULL
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    color_id uuid,
    size_id uuid,
    model_id uuid,
    price numeric,
    discount_price numeric,
    image_url text,
    stock integer DEFAULT 0 NOT NULL,
    sku text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    discount_price numeric(10,2),
    image_url text,
    category_id uuid,
    stock integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    subcategory_id uuid,
    childcategory_id uuid,
    brand_id uuid,
    sku text,
    short_description text,
    is_hot_deal boolean DEFAULT false NOT NULL,
    is_top_feature boolean DEFAULT false NOT NULL,
    is_deal boolean DEFAULT false NOT NULL,
    gallery jsonb DEFAULT '[]'::jsonb NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    video_url text,
    video_type text DEFAULT 'none'::text,
    demo_url text,
    demo_type text DEFAULT 'none'::text,
    review_images text[] DEFAULT '{}'::text[] NOT NULL,
    review_slide_speed integer DEFAULT 3000 NOT NULL,
    gallery_video_url text,
    CONSTRAINT products_discount_price_check CHECK (((discount_price IS NULL) OR (discount_price >= (0)::numeric))),
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric))
);

ALTER TABLE ONLY public.products REPLICA IDENTITY FULL;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    display_name text,
    email text,
    avatar_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    phone text,
    address text,
    district text,
    thana text
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role public.app_role NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shipping_charges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_charges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    charge numeric DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    zone text DEFAULT 'any'::text NOT NULL,
    zone_id uuid
);


--
-- Name: shipping_zone_districts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_zone_districts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zone_id uuid NOT NULL,
    district_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shipping_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    site_name text DEFAULT 'Navigator Series Book'::text NOT NULL,
    logo_url text,
    favicon_url text,
    contact_email text,
    contact_phone text,
    whatsapp_number text,
    address text,
    facebook_url text,
    youtube_url text,
    instagram_url text,
    footer_text text,
    meta_description text,
    fb_pixel_id text,
    gtm_id text,
    google_analytics_id text,
    api_keys jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    white_logo_url text,
    dark_logo_url text,
    messenger_url text,
    play_store_url text,
    app_store_url text,
    home_reviews_enabled boolean DEFAULT false NOT NULL,
    home_reviews_title text DEFAULT 'What Our Students Say'::text,
    home_reviews_subtitle text DEFAULT 'Real experiences from our learners'::text,
    home_reviews_speed_ms integer DEFAULT 3500 NOT NULL,
    home_reviews jsonb DEFAULT '[]'::jsonb NOT NULL
);

ALTER TABLE ONLY public.site_settings REPLICA IDENTITY FULL;


--
-- Name: sizes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sizes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: social_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    icon_key text DEFAULT 'facebook'::text NOT NULL,
    url text NOT NULL,
    color text DEFAULT '#000000'::text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subcategories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subcategories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: thanas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thanas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    district_id uuid NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_password_otps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_password_otps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    code_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: variant_shipping_charges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.variant_shipping_charges (
    variant_id uuid NOT NULL,
    shipping_charge_id uuid NOT NULL
);


--
-- Data for Name: admin_password_otps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_password_otps (id, email, code_hash, expires_at, used, attempts, created_at) FROM stdin;
\.


--
-- Data for Name: banner_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.banner_categories (id, name, slug, description, is_active, sort_order, created_at, updated_at, slide_direction, slide_speed_seconds) FROM stdin;
\.


--
-- Data for Name: banners; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.banners (id, title, subtitle, image_url, link_url, "position", sort_order, is_active, created_at, category_id) FROM stdin;
\.


--
-- Data for Name: brands; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.brands (id, name, slug, logo_url, created_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, slug, created_at, image_url, is_top, sort_order, show_on_home) FROM stdin;
\.


--
-- Data for Name: childcategories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.childcategories (id, subcategory_id, name, slug, created_at) FROM stdin;
\.


--
-- Data for Name: colors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.colors (id, name, hex_code, created_at) FROM stdin;
\.


--
-- Data for Name: contact_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contact_messages (id, name, email, phone, subject, message, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: coupon_products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.coupon_products (id, coupon_id, product_id, created_at) FROM stdin;
\.


--
-- Data for Name: coupons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.coupons (id, code, description, discount_type, discount_value, scope, min_order_amount, max_discount, usage_limit, used_count, starts_at, expires_at, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: courier_shipments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.courier_shipments (id, order_id, provider, consignment_id, tracking_code, status, raw_response, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customer_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_messages (id, customer_id, sender, body, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customers (id, phone, name, email, address, total_orders, total_spent, is_blocked, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: districts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.districts (id, name, sort_order, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: email_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_logs (id, recipient, subject, status, error_message, message_id, created_at) FROM stdin;
\.


--
-- Data for Name: incomplete_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.incomplete_orders (id, phone, customer_name, email, district, thana, address, notes, cart_items, subtotal, shipping_cost, total, is_completed, completed_order_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: landing_pages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.landing_pages (id, slug, title, meta_description, product_id, is_active, order_mode, hero_headline, hero_subheadline, hero_cta_label, hero_image_url, hero_video_url, hero_bg_color, hero_text_color, show_product_section, product_section_title, custom_price, custom_discount_price, show_features, features_title, features, show_countdown, countdown_title, countdown_end_at, show_reviews, reviews_title, reviews, show_gallery, gallery_title, gallery, show_faq, faq_title, faqs, final_cta_title, final_cta_subtitle, primary_color, view_count, order_count, created_at, updated_at, show_banners, banners_title, banners, description) FROM stdin;
\.


--
-- Data for Name: models; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.models (id, name, slug, created_at) FROM stdin;
\.


--
-- Data for Name: newsletter_subscribers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.newsletter_subscribers (id, email, source, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, audience, type, title, message, link, meta, is_read, read_at, created_at) FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, product_id, product_name, unit_price, quantity) FROM stdin;
\.


--
-- Data for Name: order_statuses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_statuses (id, key, label, color, sort_order, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, invoice_no, customer_name, phone, address, total, status, notes, created_at, assigned_to, shipping_cost, discount, payment_method, transaction_id, payment_status, coupon_code, discount_amount, user_id) FROM stdin;
\.


--
-- Data for Name: pages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pages (id, title, slug, content, meta_description, is_active, created_at, updated_at, column_group, sort_order) FROM stdin;
\.


--
-- Data for Name: payment_methods; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_methods (id, name, number, account_type, instructions, is_active, is_default, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: pending_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pending_payments (id, customer_name, phone, address, notes, total, payment_method, transaction_id, cart_items, status, rejection_reason, reviewed_at, reviewed_by, created_order_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.permissions (id, key, label, description, created_at, menu_key) FROM stdin;
\.


--
-- Data for Name: pixels; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pixels (id, name, platform, pixel_id, script_code, placement, page_target, custom_url, device_target, is_active, sort_order, fire_count, last_fired_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: popups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.popups (id, name, style, title, subtitle, description, image_url, link_url, cta_label, cta_url, promo_code, bg_color, text_color, delay_seconds, frequency_hours, start_at, end_at, is_active, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: price_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.price_history (id, product_id, old_price, new_price, old_discount, new_discount, changed_by, created_at) FROM stdin;
\.


--
-- Data for Name: product_colors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_colors (product_id, color_id) FROM stdin;
\.


--
-- Data for Name: product_models; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_models (product_id, model_id) FROM stdin;
\.


--
-- Data for Name: product_shipping_charges; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_shipping_charges (product_id, shipping_charge_id) FROM stdin;
\.


--
-- Data for Name: product_sizes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_sizes (product_id, size_id) FROM stdin;
\.


--
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_variants (id, product_id, color_id, size_id, model_id, price, discount_price, image_url, stock, sku, sort_order, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, name, description, price, discount_price, image_url, category_id, stock, is_active, created_at, updated_at, subcategory_id, childcategory_id, brand_id, sku, short_description, is_hot_deal, is_top_feature, is_deal, gallery, tags, video_url, video_type, demo_url, demo_type, review_images, review_slide_speed, gallery_video_url) FROM stdin;
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profiles (id, user_id, display_name, email, avatar_url, is_active, created_at, updated_at, phone, address, district, thana) FROM stdin;
6f9cf86b-430f-45e8-8985-0f4730ad1786	21458434-54f7-4ec9-b2dd-ba572bb03496	monayem.599535	monayem.599535@gmail.com	\N	t	2026-05-02 04:21:37.469634+00	2026-05-02 04:21:37.469634+00	\N	\N	\N	\N
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_permissions (id, role, permission_id, created_at) FROM stdin;
\.


--
-- Data for Name: shipping_charges; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shipping_charges (id, name, charge, is_active, sort_order, created_at, zone, zone_id) FROM stdin;
\.


--
-- Data for Name: shipping_zone_districts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shipping_zone_districts (id, zone_id, district_id, created_at) FROM stdin;
\.


--
-- Data for Name: shipping_zones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shipping_zones (id, name, description, is_active, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: site_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.site_settings (id, site_name, logo_url, favicon_url, contact_email, contact_phone, whatsapp_number, address, facebook_url, youtube_url, instagram_url, footer_text, meta_description, fb_pixel_id, gtm_id, google_analytics_id, api_keys, updated_at, white_logo_url, dark_logo_url, messenger_url, play_store_url, app_store_url, home_reviews_enabled, home_reviews_title, home_reviews_subtitle, home_reviews_speed_ms, home_reviews) FROM stdin;
ef57d6aa-7d19-4ac5-8059-c4b49fe82015	Navigator Series Book	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	2026-05-02 04:18:08.823261+00	\N	\N	\N	\N	\N	f	What Our Students Say	Real experiences from our learners	3500	[]
\.


--
-- Data for Name: sizes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sizes (id, name, sort_order, created_at) FROM stdin;
\.


--
-- Data for Name: social_links; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.social_links (id, name, icon_key, url, color, sort_order, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: subcategories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subcategories (id, category_id, name, slug, created_at) FROM stdin;
\.


--
-- Data for Name: thanas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.thanas (id, district_id, name, sort_order, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_password_otps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_password_otps (id, email, code_hash, expires_at, used, attempts, created_at) FROM stdin;
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_roles (id, user_id, role, created_at) FROM stdin;
32b60f25-1762-41b5-a50f-ffc06d3b0267	21458434-54f7-4ec9-b2dd-ba572bb03496	admin	2026-05-02 04:21:37.469634+00
\.


--
-- Data for Name: variant_shipping_charges; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.variant_shipping_charges (variant_id, shipping_charge_id) FROM stdin;
\.


--
-- Name: admin_password_otps admin_password_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_password_otps
    ADD CONSTRAINT admin_password_otps_pkey PRIMARY KEY (id);


--
-- Name: banner_categories banner_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banner_categories
    ADD CONSTRAINT banner_categories_pkey PRIMARY KEY (id);


--
-- Name: banner_categories banner_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banner_categories
    ADD CONSTRAINT banner_categories_slug_key UNIQUE (slug);


--
-- Name: banners banners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_pkey PRIMARY KEY (id);


--
-- Name: brands brands_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_name_key UNIQUE (name);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: brands brands_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_slug_key UNIQUE (slug);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: childcategories childcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.childcategories
    ADD CONSTRAINT childcategories_pkey PRIMARY KEY (id);


--
-- Name: childcategories childcategories_subcategory_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.childcategories
    ADD CONSTRAINT childcategories_subcategory_id_slug_key UNIQUE (subcategory_id, slug);


--
-- Name: colors colors_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colors
    ADD CONSTRAINT colors_name_key UNIQUE (name);


--
-- Name: colors colors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colors
    ADD CONSTRAINT colors_pkey PRIMARY KEY (id);


--
-- Name: contact_messages contact_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);


--
-- Name: coupon_products coupon_products_coupon_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_products
    ADD CONSTRAINT coupon_products_coupon_id_product_id_key UNIQUE (coupon_id, product_id);


--
-- Name: coupon_products coupon_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_products
    ADD CONSTRAINT coupon_products_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: courier_shipments courier_shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_shipments
    ADD CONSTRAINT courier_shipments_pkey PRIMARY KEY (id);


--
-- Name: customer_messages customer_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_messages
    ADD CONSTRAINT customer_messages_pkey PRIMARY KEY (id);


--
-- Name: customers customers_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_phone_key UNIQUE (phone);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: districts districts_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_name_key UNIQUE (name);


--
-- Name: districts districts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: incomplete_orders incomplete_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incomplete_orders
    ADD CONSTRAINT incomplete_orders_pkey PRIMARY KEY (id);


--
-- Name: landing_pages landing_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.landing_pages
    ADD CONSTRAINT landing_pages_pkey PRIMARY KEY (id);


--
-- Name: landing_pages landing_pages_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.landing_pages
    ADD CONSTRAINT landing_pages_slug_key UNIQUE (slug);


--
-- Name: models models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.models
    ADD CONSTRAINT models_pkey PRIMARY KEY (id);


--
-- Name: newsletter_subscribers newsletter_subscribers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_email_key UNIQUE (email);


--
-- Name: newsletter_subscribers newsletter_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_statuses order_statuses_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_statuses
    ADD CONSTRAINT order_statuses_key_key UNIQUE (key);


--
-- Name: order_statuses order_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_statuses
    ADD CONSTRAINT order_statuses_pkey PRIMARY KEY (id);


--
-- Name: orders orders_invoice_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_invoice_no_key UNIQUE (invoice_no);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- Name: pages pages_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_slug_key UNIQUE (slug);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- Name: pending_payments pending_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_payments
    ADD CONSTRAINT pending_payments_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_key_key UNIQUE (key);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: pixels pixels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pixels
    ADD CONSTRAINT pixels_pkey PRIMARY KEY (id);


--
-- Name: popups popups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.popups
    ADD CONSTRAINT popups_pkey PRIMARY KEY (id);


--
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);


--
-- Name: product_colors product_colors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_colors
    ADD CONSTRAINT product_colors_pkey PRIMARY KEY (product_id, color_id);


--
-- Name: product_models product_models_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_models
    ADD CONSTRAINT product_models_pkey PRIMARY KEY (product_id, model_id);


--
-- Name: product_shipping_charges product_shipping_charges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_shipping_charges
    ADD CONSTRAINT product_shipping_charges_pkey PRIMARY KEY (product_id, shipping_charge_id);


--
-- Name: product_sizes product_sizes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_sizes
    ADD CONSTRAINT product_sizes_pkey PRIMARY KEY (product_id, size_id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: profiles profiles_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_permission_id_key UNIQUE (role, permission_id);


--
-- Name: shipping_charges shipping_charges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_charges
    ADD CONSTRAINT shipping_charges_pkey PRIMARY KEY (id);


--
-- Name: shipping_zone_districts shipping_zone_districts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_zone_districts
    ADD CONSTRAINT shipping_zone_districts_pkey PRIMARY KEY (id);


--
-- Name: shipping_zone_districts shipping_zone_districts_zone_id_district_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_zone_districts
    ADD CONSTRAINT shipping_zone_districts_zone_id_district_id_key UNIQUE (zone_id, district_id);


--
-- Name: shipping_zones shipping_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_zones
    ADD CONSTRAINT shipping_zones_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: sizes sizes_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sizes
    ADD CONSTRAINT sizes_name_key UNIQUE (name);


--
-- Name: sizes sizes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sizes
    ADD CONSTRAINT sizes_pkey PRIMARY KEY (id);


--
-- Name: social_links social_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_links
    ADD CONSTRAINT social_links_pkey PRIMARY KEY (id);


--
-- Name: subcategories subcategories_category_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_category_id_slug_key UNIQUE (category_id, slug);


--
-- Name: subcategories subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_pkey PRIMARY KEY (id);


--
-- Name: thanas thanas_district_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thanas
    ADD CONSTRAINT thanas_district_id_name_key UNIQUE (district_id, name);


--
-- Name: thanas thanas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thanas
    ADD CONSTRAINT thanas_pkey PRIMARY KEY (id);


--
-- Name: user_password_otps user_password_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_password_otps
    ADD CONSTRAINT user_password_otps_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: variant_shipping_charges variant_shipping_charges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_shipping_charges
    ADD CONSTRAINT variant_shipping_charges_pkey PRIMARY KEY (variant_id, shipping_charge_id);


--
-- Name: idx_admin_password_otps_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_password_otps_email ON public.admin_password_otps USING btree (email);


--
-- Name: idx_admin_password_otps_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_password_otps_expires ON public.admin_password_otps USING btree (expires_at);


--
-- Name: idx_coupon_products_coupon; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupon_products_coupon ON public.coupon_products USING btree (coupon_id);


--
-- Name: idx_coupon_products_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupon_products_product ON public.coupon_products USING btree (product_id);


--
-- Name: idx_coupons_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupons_code ON public.coupons USING btree (code);


--
-- Name: idx_customer_messages_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_messages_customer ON public.customer_messages USING btree (customer_id, created_at);


--
-- Name: idx_email_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_created_at ON public.email_logs USING btree (created_at DESC);


--
-- Name: idx_landing_pages_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_landing_pages_active ON public.landing_pages USING btree (is_active);


--
-- Name: idx_landing_pages_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_landing_pages_slug ON public.landing_pages USING btree (slug);


--
-- Name: idx_notifications_audience; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_audience ON public.notifications USING btree (audience, created_at DESC);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, created_at DESC) WHERE (user_id IS NOT NULL);


--
-- Name: idx_orders_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_phone ON public.orders USING btree (phone);


--
-- Name: idx_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_user_id ON public.orders USING btree (user_id);


--
-- Name: idx_pages_column_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pages_column_group ON public.pages USING btree (column_group, sort_order);


--
-- Name: idx_pending_payments_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pending_payments_created ON public.pending_payments USING btree (created_at DESC);


--
-- Name: idx_pending_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pending_payments_status ON public.pending_payments USING btree (status);


--
-- Name: idx_pixels_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pixels_active ON public.pixels USING btree (is_active, placement);


--
-- Name: idx_pixels_unique_pixel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_pixels_unique_pixel_id ON public.pixels USING btree (platform, pixel_id) WHERE ((pixel_id IS NOT NULL) AND (pixel_id <> ''::text));


--
-- Name: idx_pv_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pv_product ON public.product_variants USING btree (product_id);


--
-- Name: idx_shipping_charges_zone_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shipping_charges_zone_id ON public.shipping_charges USING btree (zone_id);


--
-- Name: idx_szd_district; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_szd_district ON public.shipping_zone_districts USING btree (district_id);


--
-- Name: idx_szd_zone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_szd_zone ON public.shipping_zone_districts USING btree (zone_id);


--
-- Name: idx_thanas_district; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_thanas_district ON public.thanas USING btree (district_id);


--
-- Name: idx_user_password_otps_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_password_otps_email ON public.user_password_otps USING btree (email);


--
-- Name: idx_user_password_otps_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_password_otps_expires ON public.user_password_otps USING btree (expires_at);


--
-- Name: incomplete_orders_phone_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX incomplete_orders_phone_active_idx ON public.incomplete_orders USING btree (phone) WHERE (is_completed = false);


--
-- Name: uq_pv_combo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_pv_combo ON public.product_variants USING btree (product_id, COALESCE(color_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(size_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(model_id, '00000000-0000-0000-0000-000000000000'::uuid));


--
-- Name: contact_messages trg_notify_contact_message; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_contact_message AFTER INSERT ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION public.notify_on_contact_message();


--
-- Name: customer_messages trg_notify_customer_message; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_customer_message AFTER INSERT ON public.customer_messages FOR EACH ROW EXECUTE FUNCTION public.notify_on_customer_message();


--
-- Name: orders trg_notify_new_order; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_new_order AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_order();


--
-- Name: orders trg_notify_order_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_order_status AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_on_order_status_change();


--
-- Name: pending_payments trg_notify_pending_payment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_pending_payment AFTER INSERT ON public.pending_payments FOR EACH ROW EXECUTE FUNCTION public.notify_on_pending_payment();


--
-- Name: pending_payments trg_notify_pending_payment_review; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_pending_payment_review AFTER UPDATE ON public.pending_payments FOR EACH ROW EXECUTE FUNCTION public.notify_on_pending_payment_review();


--
-- Name: social_links trg_social_links_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_social_links_updated_at BEFORE UPDATE ON public.social_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: banner_categories update_banner_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_banner_categories_updated_at BEFORE UPDATE ON public.banner_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: coupons update_coupons_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customers update_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: districts update_districts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_districts_updated_at BEFORE UPDATE ON public.districts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: incomplete_orders update_incomplete_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_incomplete_orders_updated_at BEFORE UPDATE ON public.incomplete_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: landing_pages update_landing_pages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_landing_pages_updated_at BEFORE UPDATE ON public.landing_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pages update_pages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_methods update_payment_methods_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pending_payments update_pending_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pending_payments_updated_at BEFORE UPDATE ON public.pending_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pixels update_pixels_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pixels_updated_at BEFORE UPDATE ON public.pixels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: popups update_popups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_popups_updated_at BEFORE UPDATE ON public.popups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_variants update_product_variants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shipping_zones update_shipping_zones_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shipping_zones_updated_at BEFORE UPDATE ON public.shipping_zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: thanas update_thanas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_thanas_updated_at BEFORE UPDATE ON public.thanas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders upsert_customer_after_order; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER upsert_customer_after_order AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.upsert_customer_on_order();


--
-- Name: childcategories childcategories_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.childcategories
    ADD CONSTRAINT childcategories_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE CASCADE;


--
-- Name: coupon_products coupon_products_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_products
    ADD CONSTRAINT coupon_products_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE;


--
-- Name: coupon_products coupon_products_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_products
    ADD CONSTRAINT coupon_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: courier_shipments courier_shipments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courier_shipments
    ADD CONSTRAINT courier_shipments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: price_history price_history_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_colors product_colors_color_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_colors
    ADD CONSTRAINT product_colors_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(id) ON DELETE CASCADE;


--
-- Name: product_colors product_colors_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_colors
    ADD CONSTRAINT product_colors_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_models product_models_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_models
    ADD CONSTRAINT product_models_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.models(id) ON DELETE CASCADE;


--
-- Name: product_models product_models_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_models
    ADD CONSTRAINT product_models_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_shipping_charges product_shipping_charges_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_shipping_charges
    ADD CONSTRAINT product_shipping_charges_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_shipping_charges product_shipping_charges_shipping_charge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_shipping_charges
    ADD CONSTRAINT product_shipping_charges_shipping_charge_id_fkey FOREIGN KEY (shipping_charge_id) REFERENCES public.shipping_charges(id) ON DELETE CASCADE;


--
-- Name: product_sizes product_sizes_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_sizes
    ADD CONSTRAINT product_sizes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_sizes product_sizes_size_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_sizes
    ADD CONSTRAINT product_sizes_size_id_fkey FOREIGN KEY (size_id) REFERENCES public.sizes(id) ON DELETE CASCADE;


--
-- Name: product_variants product_variants_color_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_color_id_fkey FOREIGN KEY (color_id) REFERENCES public.colors(id) ON DELETE SET NULL;


--
-- Name: product_variants product_variants_model_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_model_id_fkey FOREIGN KEY (model_id) REFERENCES public.models(id) ON DELETE SET NULL;


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_variants product_variants_size_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_size_id_fkey FOREIGN KEY (size_id) REFERENCES public.sizes(id) ON DELETE SET NULL;


--
-- Name: products products_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: products products_childcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_childcategory_id_fkey FOREIGN KEY (childcategory_id) REFERENCES public.childcategories(id) ON DELETE SET NULL;


--
-- Name: products products_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE SET NULL;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: shipping_charges shipping_charges_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_charges
    ADD CONSTRAINT shipping_charges_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.shipping_zones(id) ON DELETE SET NULL;


--
-- Name: shipping_zone_districts shipping_zone_districts_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_zone_districts
    ADD CONSTRAINT shipping_zone_districts_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id) ON DELETE CASCADE;


--
-- Name: shipping_zone_districts shipping_zone_districts_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_zone_districts
    ADD CONSTRAINT shipping_zone_districts_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.shipping_zones(id) ON DELETE CASCADE;


--
-- Name: subcategories subcategories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: thanas thanas_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thanas
    ADD CONSTRAINT thanas_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: variant_shipping_charges variant_shipping_charges_shipping_charge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_shipping_charges
    ADD CONSTRAINT variant_shipping_charges_shipping_charge_id_fkey FOREIGN KEY (shipping_charge_id) REFERENCES public.shipping_charges(id) ON DELETE CASCADE;


--
-- Name: variant_shipping_charges variant_shipping_charges_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_shipping_charges
    ADD CONSTRAINT variant_shipping_charges_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: customers Admins and staff read customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and staff read customers" ON public.customers FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: incomplete_orders Admins and staff read incomplete orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and staff read incomplete orders" ON public.incomplete_orders FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: pending_payments Admins and staff read pending payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and staff read pending payments" ON public.pending_payments FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: pending_payments Admins and staff update pending payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and staff update pending payments" ON public.pending_payments FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: email_logs Admins can view email logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view email logs" ON public.email_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notifications Admins delete admin notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete admin notifications" ON public.notifications FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: incomplete_orders Admins delete incomplete orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete incomplete orders" ON public.incomplete_orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: contact_messages Admins delete messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete messages" ON public.contact_messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: customer_messages Admins delete messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete messages" ON public.customer_messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: orders Admins delete orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: pending_payments Admins delete pending payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete pending payments" ON public.pending_payments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins delete profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: courier_shipments Admins delete shipments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete shipments" ON public.courier_shipments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: social_links Admins delete social links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete social links" ON public.social_links FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: newsletter_subscribers Admins delete subscribers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete subscribers" ON public.newsletter_subscribers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: customer_messages Admins insert messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins insert messages" ON public.customer_messages FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (sender = 'admin'::text)));


--
-- Name: notifications Admins insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: price_history Admins insert price history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins insert price history" ON public.price_history FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins insert profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: site_settings Admins insert site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins insert site settings" ON public.site_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: social_links Admins insert social links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins insert social links" ON public.social_links FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: banner_categories Admins manage banner_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage banner_categories" ON public.banner_categories TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: banners Admins manage banners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage banners" ON public.banners TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: brands Admins manage brands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage brands" ON public.brands TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: categories Admins manage categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage categories" ON public.categories TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: childcategories Admins manage childcategories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage childcategories" ON public.childcategories TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: colors Admins manage colors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage colors" ON public.colors TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: coupon_products Admins manage coupon_products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage coupon_products" ON public.coupon_products USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: coupons Admins manage coupons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage coupons" ON public.coupons USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: customers Admins manage customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage customers" ON public.customers TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: districts Admins manage districts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage districts" ON public.districts USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: landing_pages Admins manage landing pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage landing pages" ON public.landing_pages TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: models Admins manage models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage models" ON public.models TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: order_statuses Admins manage order_statuses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage order_statuses" ON public.order_statuses TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: pages Admins manage pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage pages" ON public.pages TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: payment_methods Admins manage payment_methods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage payment_methods" ON public.payment_methods TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: permissions Admins manage permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage permissions" ON public.permissions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: pixels Admins manage pixels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage pixels" ON public.pixels TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: popups Admins manage popups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage popups" ON public.popups TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_colors Admins manage product_colors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage product_colors" ON public.product_colors TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_models Admins manage product_models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage product_models" ON public.product_models TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_shipping_charges Admins manage product_shipping_charges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage product_shipping_charges" ON public.product_shipping_charges TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_sizes Admins manage product_sizes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage product_sizes" ON public.product_sizes TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_variants Admins manage product_variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage product_variants" ON public.product_variants TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: products Admins manage products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage products" ON public.products TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: role_permissions Admins manage role_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage role_permissions" ON public.role_permissions TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: shipping_zones Admins manage shipping zones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage shipping zones" ON public.shipping_zones TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: shipping_charges Admins manage shipping_charges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage shipping_charges" ON public.shipping_charges TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sizes Admins manage sizes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage sizes" ON public.sizes TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: subcategories Admins manage subcategories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage subcategories" ON public.subcategories TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: thanas Admins manage thanas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage thanas" ON public.thanas USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins manage user_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage user_roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: variant_shipping_charges Admins manage variant_shipping_charges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage variant_shipping_charges" ON public.variant_shipping_charges TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: shipping_zone_districts Admins manage zone districts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage zone districts" ON public.shipping_zone_districts TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notifications Admins read admin notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read admin notifications" ON public.notifications FOR SELECT TO authenticated USING (((audience = 'admin'::text) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))));


--
-- Name: customer_messages Admins read all messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all messages" ON public.customer_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins read all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: contact_messages Admins read messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read messages" ON public.contact_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: order_items Admins read order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: orders Admins read orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: price_history Admins read price history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read price history" ON public.price_history FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: newsletter_subscribers Admins read subscribers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read subscribers" ON public.newsletter_subscribers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notifications Admins update admin notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update admin notifications" ON public.notifications FOR UPDATE TO authenticated USING (((audience = 'admin'::text) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)))) WITH CHECK (((audience = 'admin'::text) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role))));


--
-- Name: profiles Admins update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: contact_messages Admins update messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update messages" ON public.contact_messages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: customer_messages Admins update messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update messages" ON public.customer_messages FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: orders Admins update orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: site_settings Admins update site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update site settings" ON public.site_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: social_links Admins update social links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update social links" ON public.social_links FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: incomplete_orders Anyone can create incomplete orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create incomplete orders" ON public.incomplete_orders FOR INSERT WITH CHECK (true);


--
-- Name: order_items Anyone can insert order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);


--
-- Name: orders Anyone can place orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can place orders" ON public.orders FOR INSERT WITH CHECK (true);


--
-- Name: contact_messages Anyone can submit messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit messages" ON public.contact_messages FOR INSERT WITH CHECK (true);


--
-- Name: pending_payments Anyone can submit pending payment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can submit pending payment" ON public.pending_payments FOR INSERT WITH CHECK (true);


--
-- Name: newsletter_subscribers Anyone can subscribe; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);


--
-- Name: incomplete_orders Anyone can update incomplete orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update incomplete orders" ON public.incomplete_orders FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: districts Anyone can view active districts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active districts" ON public.districts FOR SELECT USING ((is_active = true));


--
-- Name: shipping_zones Anyone can view active shipping zones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active shipping zones" ON public.shipping_zones FOR SELECT USING (true);


--
-- Name: thanas Anyone can view active thanas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active thanas" ON public.thanas FOR SELECT USING ((is_active = true));


--
-- Name: shipping_zone_districts Anyone can view zone-district mapping; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view zone-district mapping" ON public.shipping_zone_districts FOR SELECT USING (true);


--
-- Name: banners Anyone reads active banners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads active banners" ON public.banners FOR SELECT USING (true);


--
-- Name: landing_pages Anyone reads active landing pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads active landing pages" ON public.landing_pages FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: payment_methods Anyone reads active payment_methods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads active payment_methods" ON public.payment_methods FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: pixels Anyone reads active pixels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads active pixels" ON public.pixels FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: popups Anyone reads active popups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads active popups" ON public.popups FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: products Anyone reads active products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads active products" ON public.products FOR SELECT USING (true);


--
-- Name: social_links Anyone reads active social links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads active social links" ON public.social_links FOR SELECT USING (((is_active = true) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: banner_categories Anyone reads banner_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads banner_categories" ON public.banner_categories FOR SELECT USING (true);


--
-- Name: brands Anyone reads brands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads brands" ON public.brands FOR SELECT USING (true);


--
-- Name: categories Anyone reads categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads categories" ON public.categories FOR SELECT USING (true);


--
-- Name: childcategories Anyone reads childcategories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads childcategories" ON public.childcategories FOR SELECT USING (true);


--
-- Name: colors Anyone reads colors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads colors" ON public.colors FOR SELECT USING (true);


--
-- Name: models Anyone reads models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads models" ON public.models FOR SELECT USING (true);


--
-- Name: order_statuses Anyone reads order_statuses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads order_statuses" ON public.order_statuses FOR SELECT USING (true);


--
-- Name: pages Anyone reads pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads pages" ON public.pages FOR SELECT USING (true);


--
-- Name: product_colors Anyone reads product_colors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads product_colors" ON public.product_colors FOR SELECT USING (true);


--
-- Name: product_models Anyone reads product_models; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads product_models" ON public.product_models FOR SELECT USING (true);


--
-- Name: product_shipping_charges Anyone reads product_shipping_charges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads product_shipping_charges" ON public.product_shipping_charges FOR SELECT USING (true);


--
-- Name: product_sizes Anyone reads product_sizes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads product_sizes" ON public.product_sizes FOR SELECT USING (true);


--
-- Name: product_variants Anyone reads product_variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads product_variants" ON public.product_variants FOR SELECT USING (true);


--
-- Name: shipping_charges Anyone reads shipping_charges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads shipping_charges" ON public.shipping_charges FOR SELECT USING (true);


--
-- Name: site_settings Anyone reads site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads site settings" ON public.site_settings FOR SELECT USING (true);


--
-- Name: sizes Anyone reads sizes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads sizes" ON public.sizes FOR SELECT USING (true);


--
-- Name: subcategories Anyone reads subcategories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads subcategories" ON public.subcategories FOR SELECT USING (true);


--
-- Name: variant_shipping_charges Anyone reads variant_shipping_charges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone reads variant_shipping_charges" ON public.variant_shipping_charges FOR SELECT USING (true);


--
-- Name: permissions Authenticated read permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read permissions" ON public.permissions FOR SELECT TO authenticated USING (true);


--
-- Name: role_permissions Authenticated read role_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);


--
-- Name: customer_messages Customers mark own read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers mark own read" ON public.customer_messages FOR UPDATE TO authenticated USING ((customer_id = auth.uid())) WITH CHECK ((customer_id = auth.uid()));


--
-- Name: customer_messages Customers read own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers read own messages" ON public.customer_messages FOR SELECT TO authenticated USING ((customer_id = auth.uid()));


--
-- Name: customer_messages Customers send own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers send own messages" ON public.customer_messages FOR INSERT TO authenticated WITH CHECK (((customer_id = auth.uid()) AND (sender = 'customer'::text)));


--
-- Name: order_items Customers view own order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers view own order items" ON public.order_items FOR SELECT TO authenticated USING ((order_id IN ( SELECT orders.id
   FROM public.orders
  WHERE ((orders.user_id = auth.uid()) OR (orders.phone IN ( SELECT profiles.phone
           FROM public.profiles
          WHERE ((profiles.user_id = auth.uid()) AND (profiles.phone IS NOT NULL))))))));


--
-- Name: orders Customers view own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Customers view own orders" ON public.orders FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (phone IN ( SELECT profiles.phone
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.phone IS NOT NULL))))));


--
-- Name: coupons Public read active coupons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read active coupons" ON public.coupons FOR SELECT USING ((is_active = true));


--
-- Name: coupon_products Public read coupon_products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read coupon_products" ON public.coupon_products FOR SELECT USING (true);


--
-- Name: courier_shipments Staff and admins insert shipments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff and admins insert shipments" ON public.courier_shipments FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: courier_shipments Staff and admins read shipments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff and admins read shipments" ON public.courier_shipments FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: courier_shipments Staff and admins update shipments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff and admins update shipments" ON public.courier_shipments FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'staff'::public.app_role)));


--
-- Name: order_items Staff read order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff read order items" ON public.order_items FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'staff'::public.app_role));


--
-- Name: orders Staff read orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff read orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'staff'::public.app_role));


--
-- Name: orders Staff update orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'staff'::public.app_role));


--
-- Name: notifications Users delete own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (((audience = 'user'::text) AND (user_id = auth.uid())));


--
-- Name: notifications Users read own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (((audience = 'user'::text) AND (user_id = auth.uid())));


--
-- Name: profiles Users see own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users see own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_roles Users see own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: notifications Users update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (((audience = 'user'::text) AND (user_id = auth.uid()))) WITH CHECK (((audience = 'user'::text) AND (user_id = auth.uid())));


--
-- Name: profiles Users update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: admin_password_otps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_password_otps ENABLE ROW LEVEL SECURITY;

--
-- Name: banner_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.banner_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: banners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

--
-- Name: brands; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: childcategories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.childcategories ENABLE ROW LEVEL SECURITY;

--
-- Name: colors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: coupon_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coupon_products ENABLE ROW LEVEL SECURITY;

--
-- Name: coupons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

--
-- Name: courier_shipments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.courier_shipments ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: districts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;

--
-- Name: email_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: incomplete_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.incomplete_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: landing_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: models; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

--
-- Name: newsletter_subscribers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: order_statuses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_statuses ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_methods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

--
-- Name: pending_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pending_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: pixels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pixels ENABLE ROW LEVEL SECURITY;

--
-- Name: popups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.popups ENABLE ROW LEVEL SECURITY;

--
-- Name: price_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

--
-- Name: product_colors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;

--
-- Name: product_models; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_models ENABLE ROW LEVEL SECURITY;

--
-- Name: product_shipping_charges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_shipping_charges ENABLE ROW LEVEL SECURITY;

--
-- Name: product_sizes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;

--
-- Name: product_variants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: role_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: shipping_charges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipping_charges ENABLE ROW LEVEL SECURITY;

--
-- Name: shipping_zone_districts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipping_zone_districts ENABLE ROW LEVEL SECURITY;

--
-- Name: shipping_zones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;

--
-- Name: site_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: sizes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sizes ENABLE ROW LEVEL SECURITY;

--
-- Name: social_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

--
-- Name: subcategories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

--
-- Name: thanas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.thanas ENABLE ROW LEVEL SECURITY;

--
-- Name: user_password_otps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_password_otps ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: variant_shipping_charges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.variant_shipping_charges ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict v5oGjIZxQf0NvvYbcIEBsdwcVyhaXHR65Yxd831Cmx9IsE8uKf2uA3gG5Gu6bBH

