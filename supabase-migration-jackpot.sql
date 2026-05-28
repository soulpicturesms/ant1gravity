-- Migration: Casino Jackpot
-- Ejecutar en Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS casino_jackpot (
  id text PRIMARY KEY DEFAULT 'global',
  amount integer NOT NULL DEFAULT 50000
);

-- Insertar el registro inicial del jackpot si no existe
INSERT INTO casino_jackpot (id, amount)
VALUES ('global', 50000)
ON CONFLICT (id) DO NOTHING;
