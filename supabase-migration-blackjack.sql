-- Blackjack sessions table
-- Persists in-flight blackjack hands so subsequent actions (hit/stand/double/split)
-- find the session regardless of which Vercel serverless instance handles each request.
-- (In-memory Maps don't survive across serverless invocations.)
CREATE TABLE IF NOT EXISTS blackjack_sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  state jsonb NOT NULL,                         -- { bet, deck, playerCards, dealerCards, isSplit, hands, handBets, activeHandIdx }
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blackjack_sessions_user_id ON blackjack_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_blackjack_sessions_updated_at ON blackjack_sessions(updated_at);

-- Cleanup of abandoned sessions (>30 min idle). Also handled by route helper.
-- DELETE FROM blackjack_sessions WHERE updated_at < now() - interval '30 minutes';
