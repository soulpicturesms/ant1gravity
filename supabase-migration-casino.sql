-- Migration: Casino, Apuestas y Tokens
-- Ejecutar en Supabase SQL Editor

-- Eventos de apuestas (ej: Argentina vs Peru)
CREATE TABLE IF NOT EXISTS bet_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  description      text,
  options          jsonb NOT NULL,          -- [{id, label}]
  status           text DEFAULT 'open',     -- open | locked | resolved | cancelled
  winning_option_id text,
  created_by       text REFERENCES users(id),
  created_at       timestamptz DEFAULT now(),
  locked_at        timestamptz,
  resolved_at      timestamptz
);

-- Entradas de apuestas de usuarios
CREATE TABLE IF NOT EXISTS bet_entries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid REFERENCES bet_events(id) ON DELETE CASCADE,
  user_id    text REFERENCES users(id),
  username   text NOT NULL,
  option_id  text NOT NULL,
  amount     integer NOT NULL CHECK (amount > 0),
  payout     integer,
  won        boolean,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_bet_entries_event ON bet_entries(event_id);
CREATE INDEX IF NOT EXISTS idx_bet_entries_user  ON bet_entries(user_id);

-- Agregar tipos de transacción al historial (ya existe la tabla, solo anotamos)
-- Los nuevos tipos son: 'transfer', 'bet', 'bet_win', 'bet_refund', 'casino'
