-- Migration 003: Station analytics events
CREATE TABLE IF NOT EXISTS station_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id  text NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  event_type  text NOT NULL CHECK (event_type IN ('view', 'favorite', 'directions')),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE station_events ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anonymous) can insert events
CREATE POLICY "Anyone can log events"
  ON station_events FOR INSERT WITH CHECK (true);

-- Operators can read events for their stations
CREATE POLICY "Operators can read events for their stations"
  ON station_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM operator_stations
      WHERE operator_id = auth.uid() AND station_id = station_events.station_id
    )
  );

-- Convenience view for operators
CREATE OR REPLACE VIEW station_event_counts AS
SELECT
  station_id,
  event_type,
  COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')  AS last_7d,
  COUNT(*) FILTER (WHERE created_at > now() - interval '30 days') AS last_30d,
  COUNT(*) AS total
FROM station_events
GROUP BY station_id, event_type;
