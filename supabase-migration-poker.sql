-- Poker rooms table
CREATE TABLE IF NOT EXISTS poker_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Mesa ANT1',
  buy_in integer NOT NULL DEFAULT 100,
  max_players integer NOT NULL DEFAULT 6,
  state jsonb NOT NULL DEFAULT '{}',
  full_state jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- Enable Realtime (optional, not required for polling approach)
-- ALTER PUBLICATION supabase_realtime ADD TABLE poker_rooms;

-- Clean up stale rooms older than 2 hours (run periodically)
-- DELETE FROM poker_rooms WHERE updated_at < now() - interval '2 hours';
