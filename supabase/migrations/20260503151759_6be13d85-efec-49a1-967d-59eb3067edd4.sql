
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'categories','subcategories','childcategories','brands','products',
    'colors','sizes','models',
    'product_variants','product_colors','product_sizes','product_models',
    'product_shipping_charges','variant_shipping_charges',
    'banners','banner_categories','home_reviews','popups','pages','landing_pages',
    'coupons','coupon_products','pixels','notifications','newsletter_subscribers',
    'email_logs','price_history',
    'orders','order_items','order_statuses','customers','customer_messages',
    'contact_messages','pending_payments','incomplete_orders','courier_shipments',
    'shipping_charges','shipping_zones','shipping_zone_districts','districts','thanas',
    'site_settings','social_links','payment_methods','manual_payment_methods'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins full access" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Admins full access" ON public.%I
        FOR ALL TO authenticated
        USING (public.has_role(auth.uid(), ''admin''::public.app_role))
        WITH CHECK (public.has_role(auth.uid(), ''admin''::public.app_role))',
      t
    );
  END LOOP;
END $$;
