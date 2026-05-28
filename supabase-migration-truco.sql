-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/fdbxddkoofjzuguqrotm/sql

CREATE TABLE IF NOT EXISTS truco_rooms (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL DEFAULT 'Truco',
  state      jsonb NOT NULL DEFAULT '{}',
  full_state jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_truco_rooms_updated ON truco_rooms(updated_at DESC);
