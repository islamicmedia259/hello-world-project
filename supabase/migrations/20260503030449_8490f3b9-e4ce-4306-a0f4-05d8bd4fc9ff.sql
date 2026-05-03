ALTER TABLE public.permissions ALTER COLUMN menu_key DROP NOT NULL;
ALTER TABLE public.social_links ALTER COLUMN platform DROP NOT NULL;
ALTER TABLE public.order_statuses ALTER COLUMN name DROP NOT NULL;