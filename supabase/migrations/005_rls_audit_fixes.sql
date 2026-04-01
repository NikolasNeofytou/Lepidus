-- ============================================================
-- Migration 005: RLS audit fixes
-- Fixes gaps found during comprehensive Row Level Security audit
-- ============================================================

-- 1. stations: Allow anon scraper to INSERT and UPDATE
CREATE POLICY "Anon scraper can insert stations"
  ON stations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anon scraper can update stations"
  ON stations FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 2. price_snapshots: Allow anon scraper to INSERT
CREATE POLICY "Anon scraper can insert price snapshots"
  ON price_snapshots FOR INSERT
  WITH CHECK (true);

-- 3. operator_stations: Add public read access
CREATE POLICY "Anyone can read operator station links"
  ON operator_stations FOR SELECT
  USING (true);

-- 4. promotions: Validate station ownership on write
DROP POLICY IF EXISTS "Operators manage own promotions" ON promotions;

CREATE POLICY "Operators manage own promotions"
  ON promotions FOR ALL
  USING (auth.uid() = operator_id)
  WITH CHECK (
    auth.uid() = operator_id
    AND EXISTS (
      SELECT 1 FROM operator_stations
      WHERE operator_id = auth.uid()
        AND station_id = promotions.station_id
    )
  );

-- 5. station_events: Prevent user_id forgery on INSERT
DROP POLICY IF EXISTS "Anyone can log events" ON station_events;

CREATE POLICY "Anyone can log events"
  ON station_events FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 6. Deduplicate user_profiles policies from migrations 001/002
DROP POLICY IF EXISTS "Users can view their profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can upsert their profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their profile" ON user_profiles;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles' AND policyname = 'Users can read own profile'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users can read own profile"
        ON user_profiles FOR SELECT
        USING (auth.uid() = user_id)
    $pol$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_profiles' AND policyname = 'Users can update own profile'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users can update own profile"
        ON user_profiles FOR UPDATE
        USING (auth.uid() = user_id)
    $pol$;
  END IF;
END;
$$;

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 7. Verify RLS is enabled on every table (idempotent)
ALTER TABLE stations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_snapshots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_features  ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_events    ENABLE ROW LEVEL SECURITY;
