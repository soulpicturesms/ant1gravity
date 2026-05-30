-- Billiards rooms table
-- Persists multiplayer billiards lobby state so guild members see each other's
-- rooms across serverless invocations (Vercel doesn't share in-memory state).
CREATE TABLE IF NOT EXISTS billiards_rooms (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT 'Mesa Billar',
  mode text NOT NULL DEFAULT '1v1',           -- '1v1' or '2v2'
  bet integer NOT NULL DEFAULT 0,             -- bet amount per player
  max_players integer NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'waiting',     -- waiting | playing | finished
  pot integer NOT NULL DEFAULT 0,
  players jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{ userId, username, team, refunded }]
  winner_name text,
  result_reported boolean NOT NULL DEFAULT false,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billiards_rooms_updated_at ON billiards_rooms(updated_at);
CREATE INDEX IF NOT EXISTS idx_billiards_rooms_status ON billiards_rooms(status);

-- Clean up stale rooms (run periodically — also handled in the backend route)
-- DELETE FROM billiards_rooms WHERE updated_at < now() - interval '2 hours';
