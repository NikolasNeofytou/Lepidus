-- Remove public write access to stations and price_snapshots.
-- The scraper now uses the service_role key which bypasses RLS,
-- so these open INSERT/UPDATE policies are no longer needed.
-- This closes the rate-limiting vulnerability where a bad actor
-- could spam junk data via the anon key.

DROP POLICY IF EXISTS "Anon scraper can insert stations" ON stations;
DROP POLICY IF EXISTS "Anon scraper can update stations" ON stations;
DROP POLICY IF EXISTS "Anon scraper can insert price snapshots" ON price_snapshots;
