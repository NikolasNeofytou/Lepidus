-- ============================================================
-- Migration 002: Marketplace schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ── user_profiles ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  text,
  is_operator   boolean NOT NULL DEFAULT false,
  loyalty_points int NOT NULL DEFAULT 0,
  loyalty_tier  text NOT NULL DEFAULT 'bronze',
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-create profile row on new sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name, is_operator)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'display_name',
    COALESCE((NEW.raw_user_meta_data->>'is_operator')::boolean, false)
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── operator_stations ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS operator_stations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  station_id  text NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operator_id, station_id)
);

ALTER TABLE operator_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators manage own links"
  ON operator_stations FOR ALL
  USING (auth.uid() = operator_id)
  WITH CHECK (auth.uid() = operator_id);

-- ── station_features ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS station_features (
  station_id  text NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  feature     text NOT NULL,
  PRIMARY KEY (station_id, feature)
);

ALTER TABLE station_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read features"
  ON station_features FOR SELECT USING (true);

CREATE POLICY "Operators can write features for their stations"
  ON station_features FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM operator_stations
      WHERE operator_id = auth.uid() AND station_id = station_features.station_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM operator_stations
      WHERE operator_id = auth.uid() AND station_id = station_features.station_id
    )
  );

-- ── promotions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id     text NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  operator_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          text NOT NULL,
  description    text,
  badge_text     text,
  fuel_type      text NOT NULL DEFAULT 'all',
  discount_type  text NOT NULL DEFAULT 'other',
  discount_value numeric(8,3),
  is_active      boolean NOT NULL DEFAULT true,
  starts_at      timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active promotions"
  ON promotions FOR SELECT USING (is_active = true OR auth.uid() = operator_id);

CREATE POLICY "Operators manage own promotions"
  ON promotions FOR ALL
  USING (auth.uid() = operator_id)
  WITH CHECK (auth.uid() = operator_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS promotions_updated_at ON promotions;
CREATE TRIGGER promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── price_alerts ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  station_id  text REFERENCES stations(id) ON DELETE CASCADE,
  fuel_type   text NOT NULL DEFAULT 'unleaded95',
  target_price numeric(8,3) NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, station_id, fuel_type)
);

ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alerts"
  ON price_alerts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Views ────────────────────────────────────────────────────
CREATE OR REPLACE VIEW active_promotions AS
SELECT p.*, s.name AS station_name, s.brand AS station_brand, s.district AS station_district
FROM promotions p
JOIN stations s ON s.id = p.station_id
WHERE p.is_active = true
  AND (p.expires_at IS NULL OR p.expires_at > now());

CREATE OR REPLACE VIEW station_feature_list AS
SELECT station_id, array_agg(feature ORDER BY feature) AS features
FROM station_features
GROUP BY station_id;
