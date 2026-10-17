/*
# Restaurant & Café Smart QR Platform — Full Schema

## Overview
This migration creates the complete database schema for a single-restaurant premium QR platform.
It supports: digital menu management, customer feedback, Wi-Fi settings, analytics, and admin authentication.

## Tables Created
1. **restaurant_settings** — Single row with restaurant name, description, contact info, hours, social links, Google review URL, cover image, logo
2. **menu_categories** — Menu categories (Coffee, Tea, etc.) with order, icon, and multilingual translations
3. **menu_products** — Products belonging to categories, with price, image, availability, featured, bestseller, ingredients, allergens, dietary labels
4. **guest_feedback** — Private customer feedback (rating, comment, name, status)
5. **wifi_settings** — Single row with SSID, password, security type, hidden flag, enabled flag
6. **analytics_events** — Page views and button clicks for dashboard stats
7. **qr_code_settings** — QR code customization (foreground/background colors, logo)

## Security
- **restaurant_settings**: Public read (anon+authenticated), admin write (authenticated only)
- **menu_categories**: Public read, admin write
- **menu_products**: Public read, admin write
- **guest_feedback**: Public insert (customers submit), admin read/update/delete
- **wifi_settings**: Public read, admin write
- **analytics_events**: Public insert (tracking), admin read only
- **qr_code_settings**: Public read, admin write

All admin write operations require authentication. Customer-facing reads are open to anon.
*/

-- ============================================================
-- 1. Restaurant Settings (single-row)
-- ============================================================
CREATE TABLE IF NOT EXISTS restaurant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Maison Or',
  name_fr text DEFAULT 'Maison Or',
  name_ar text DEFAULT 'ميزون أور',
  description text DEFAULT 'A premium restaurant & café offering an exquisite blend of traditional and contemporary cuisine.',
  address text DEFAULT '123 Boulevard Mohammed V, Casablanca, Morocco',
  phone text DEFAULT '+212 5 22 00 00 00',
  whatsapp text DEFAULT '212522000000',
  google_review_url text DEFAULT 'https://g.page/r/restaurant/review',
  maps_url text DEFAULT 'https://maps.google.com',
  cover_image text,
  logo text,
  default_locale text NOT NULL DEFAULT 'en',
  currency text NOT NULL DEFAULT 'DH',
  opening_hours jsonb DEFAULT '[
    {"day": "Monday — Thursday", "time": "08:00 — 23:00"},
    {"day": "Friday — Saturday", "time": "08:00 — 01:00"},
    {"day": "Sunday", "time": "09:00 — 22:00"}
  ]'::jsonb,
  social_links jsonb DEFAULT '{"instagram":"https://instagram.com","facebook":"https://facebook.com","twitter":"https://twitter.com"}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_restaurant_settings" ON restaurant_settings;
CREATE POLICY "public_read_restaurant_settings" ON restaurant_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_restaurant_settings" ON restaurant_settings;
CREATE POLICY "admin_insert_restaurant_settings" ON restaurant_settings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_restaurant_settings" ON restaurant_settings;
CREATE POLICY "admin_update_restaurant_settings" ON restaurant_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_restaurant_settings" ON restaurant_settings;
CREATE POLICY "admin_delete_restaurant_settings" ON restaurant_settings FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- 2. Menu Categories
-- ============================================================
CREATE TABLE IF NOT EXISTS menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_fr text,
  name_ar text,
  icon text NOT NULL DEFAULT 'Coffee',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_menu_categories" ON menu_categories;
CREATE POLICY "public_read_menu_categories" ON menu_categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_menu_categories" ON menu_categories;
CREATE POLICY "admin_insert_menu_categories" ON menu_categories FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_menu_categories" ON menu_categories;
CREATE POLICY "admin_update_menu_categories" ON menu_categories FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_menu_categories" ON menu_categories;
CREATE POLICY "admin_delete_menu_categories" ON menu_categories FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- 3. Menu Products
-- ============================================================
CREATE TABLE IF NOT EXISTS menu_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES menu_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_fr text,
  name_ar text,
  description text DEFAULT '',
  description_fr text,
  description_ar text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  image text,
  available boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  bestseller boolean NOT NULL DEFAULT false,
  ingredients jsonb DEFAULT '[]'::jsonb,
  allergens jsonb DEFAULT '[]'::jsonb,
  dietary jsonb DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE menu_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_menu_products" ON menu_products;
CREATE POLICY "public_read_menu_products" ON menu_products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_menu_products" ON menu_products;
CREATE POLICY "admin_insert_menu_products" ON menu_products FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_menu_products" ON menu_products;
CREATE POLICY "admin_update_menu_products" ON menu_products FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_menu_products" ON menu_products;
CREATE POLICY "admin_delete_menu_products" ON menu_products FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- 4. Guest Feedback
-- ============================================================
CREATE TABLE IF NOT EXISTS guest_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  customer_name text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE guest_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_guest_feedback" ON guest_feedback;
CREATE POLICY "public_insert_guest_feedback" ON guest_feedback FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_read_guest_feedback" ON guest_feedback;
CREATE POLICY "admin_read_guest_feedback" ON guest_feedback FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_guest_feedback" ON guest_feedback;
CREATE POLICY "admin_update_guest_feedback" ON guest_feedback FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_guest_feedback" ON guest_feedback;
CREATE POLICY "admin_delete_guest_feedback" ON guest_feedback FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- 5. Wi-Fi Settings (single-row)
-- ============================================================
CREATE TABLE IF NOT EXISTS wifi_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ssid text NOT NULL DEFAULT 'MaisonOr_Guest',
  password text NOT NULL DEFAULT 'Welcome2024!',
  security text NOT NULL DEFAULT 'WPA' CHECK (security IN ('WPA', 'WEP', 'nopass')),
  hidden boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wifi_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_wifi_settings" ON wifi_settings;
CREATE POLICY "public_read_wifi_settings" ON wifi_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_wifi_settings" ON wifi_settings;
CREATE POLICY "admin_insert_wifi_settings" ON wifi_settings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_wifi_settings" ON wifi_settings;
CREATE POLICY "admin_update_wifi_settings" ON wifi_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_wifi_settings" ON wifi_settings;
CREATE POLICY "admin_delete_wifi_settings" ON wifi_settings FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- 6. Analytics Events
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('page_view', 'button_click')),
  page text NOT NULL CHECK (page IN ('home', 'menu', 'feedback', 'wifi')),
  action text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_analytics_events" ON analytics_events;
CREATE POLICY "public_insert_analytics_events" ON analytics_events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_read_analytics_events" ON analytics_events;
CREATE POLICY "admin_read_analytics_events" ON analytics_events FOR SELECT
  TO authenticated USING (true);

-- ============================================================
-- 7. QR Code Settings (single-row)
-- ============================================================
CREATE TABLE IF NOT EXISTS qr_code_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  foreground_color text NOT NULL DEFAULT '171717',
  background_color text NOT NULL DEFAULT 'F5F0E8',
  include_logo boolean NOT NULL DEFAULT false,
  logo_url text,
  error_correction text NOT NULL DEFAULT 'M' CHECK (error_correction IN ('L', 'M', 'Q', 'H')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE qr_code_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_qr_code_settings" ON qr_code_settings;
CREATE POLICY "public_read_qr_code_settings" ON qr_code_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_qr_code_settings" ON qr_code_settings;
CREATE POLICY "admin_insert_qr_code_settings" ON qr_code_settings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_qr_code_settings" ON qr_code_settings;
CREATE POLICY "admin_update_qr_code_settings" ON qr_code_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_qr_code_settings" ON qr_code_settings;
CREATE POLICY "admin_delete_qr_code_settings" ON qr_code_settings FOR DELETE
  TO authenticated USING (true);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_menu_products_category_id ON menu_products(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_products_available ON menu_products(available);
CREATE INDEX IF NOT EXISTS idx_menu_categories_sort_order ON menu_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_guest_feedback_created_at ON guest_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_page ON analytics_events(page);

-- ============================================================
-- Seed Data
-- ============================================================

-- Restaurant settings (single row)
INSERT INTO restaurant_settings (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Wi-Fi settings (single row)
INSERT INTO wifi_settings (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- QR code settings (single row)
INSERT INTO qr_code_settings (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Seed categories
INSERT INTO menu_categories (id, name, name_fr, name_ar, icon, sort_order) VALUES
  (gen_random_uuid(), 'Coffee', 'Café', 'قهوة', 'Coffee', 0),
  (gen_random_uuid(), 'Tea', 'Thé', 'شاي', 'Leaf', 1),
  (gen_random_uuid(), 'Fresh Juices', 'Jus Frais', 'عصائر طازجة', 'CupSoda', 2),
  (gen_random_uuid(), 'Mocktails', 'Mocktails', 'موكتيل', 'Wine', 3),
  (gen_random_uuid(), 'Breakfast', 'Petit-déjeuner', 'فطور', 'Croissant', 4),
  (gen_random_uuid(), 'Starters', 'Entrées', 'المقبلات', 'Salad', 5),
  (gen_random_uuid(), 'Main Courses', 'Plats Principaux', 'الأطباق الرئيسية', 'UtensilsCrossed', 6),
  (gen_random_uuid(), 'Burgers', 'Burgers', 'برغر', 'Beef', 7),
  (gen_random_uuid(), 'Pizza', 'Pizza', 'بيتزا', 'Pizza', 8),
  (gen_random_uuid(), 'Desserts', 'Desserts', 'الحلويات', 'CakeSlice', 9)
ON CONFLICT DO NOTHING;
