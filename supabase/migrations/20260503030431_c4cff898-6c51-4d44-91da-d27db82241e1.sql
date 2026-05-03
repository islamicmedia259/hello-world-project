ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS thana text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_orders integer NOT NULL DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_cost numeric NOT NULL DEFAULT 0;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shipping_charge') THEN
    EXECUTE 'UPDATE public.orders SET shipping_cost = COALESCE(shipping_charge, 0) WHERE shipping_cost = 0 AND shipping_charge IS NOT NULL';
  END IF;
END $$;

ALTER TABLE public.pending_payments ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.pending_payments ADD COLUMN IF NOT EXISTS reviewed_by uuid;
ALTER TABLE public.pending_payments ADD COLUMN IF NOT EXISTS created_order_id uuid;
ALTER TABLE public.pending_payments ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS key text;
UPDATE public.permissions SET key = COALESCE(key, menu_key) WHERE key IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS permissions_key_unique ON public.permissions(key) WHERE key IS NOT NULL;

ALTER TABLE public.pixels ADD COLUMN IF NOT EXISTS fire_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.price_history ADD COLUMN IF NOT EXISTS old_discount numeric;
ALTER TABLE public.price_history ADD COLUMN IF NOT EXISTS new_discount numeric;

ALTER TABLE public.social_links ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.social_links ADD COLUMN IF NOT EXISTS icon_key text;
ALTER TABLE public.social_links ADD COLUMN IF NOT EXISTS color text;

ALTER TABLE public.shipping_charges ADD COLUMN IF NOT EXISTS charge numeric NOT NULL DEFAULT 0;
ALTER TABLE public.shipping_charges ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.shipping_charges ADD COLUMN IF NOT EXISTS zone text;
ALTER TABLE public.shipping_charges ADD COLUMN IF NOT EXISTS zone_id uuid;

ALTER TABLE public.order_statuses ADD COLUMN IF NOT EXISTS key text;
ALTER TABLE public.order_statuses ADD COLUMN IF NOT EXISTS label text;
ALTER TABLE public.order_statuses ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
DO $do$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_statuses' AND column_name='name') THEN
    EXECUTE 'UPDATE public.order_statuses SET label = COALESCE(label, name), key = COALESCE(key, lower(replace(name,'' '',''_''))) WHERE label IS NULL OR key IS NULL';
  END IF;
END $do$;