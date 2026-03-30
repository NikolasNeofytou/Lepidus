-- Lepidus: Cyprus Gas Station Finder
-- Initial database schema

CREATE TABLE stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  address TEXT NOT NULL,
  district TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE price_snapshots (
  id BIGSERIAL PRIMARY KEY,
  station_id TEXT NOT NULL REFERENCES stations(id),
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('unleaded95', 'unleaded98', 'diesel', 'kerosene', 'lpg')),
  price DECIMAL(6, 3) NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_price_snapshots_station_fuel ON price_snapshots(station_id, fuel_type);
CREATE INDEX idx_price_snapshots_fetched ON price_snapshots(fetched_at DESC);

-- View for latest prices per station per fuel type
CREATE VIEW latest_prices AS
SELECT DISTINCT ON (station_id, fuel_type)
  station_id,
  fuel_type,
  price,
  fetched_at
FROM price_snapshots
ORDER BY station_id, fuel_type, fetched_at DESC;

-- User favorites (optional, for authenticated users)
CREATE TABLE user_favorites (
  user_id UUID NOT NULL,
  station_id TEXT NOT NULL REFERENCES stations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, station_id)
);

-- User car profiles
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY,
  car_name TEXT,
  consumption_l_per_100km DECIMAL(4, 1),
  preferred_fuel TEXT CHECK (preferred_fuel IN ('unleaded95', 'unleaded98', 'diesel', 'kerosene', 'lpg')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Public read access to stations and prices
CREATE POLICY "Stations are viewable by everyone"
  ON stations FOR SELECT USING (true);

CREATE POLICY "Prices are viewable by everyone"
  ON price_snapshots FOR SELECT USING (true);

-- Users can manage their own favorites
CREATE POLICY "Users can view their favorites"
  ON user_favorites FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their favorites"
  ON user_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their favorites"
  ON user_favorites FOR DELETE USING (auth.uid() = user_id);

-- Users can manage their own profile
CREATE POLICY "Users can view their profile"
  ON user_profiles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their profile"
  ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their profile"
  ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
