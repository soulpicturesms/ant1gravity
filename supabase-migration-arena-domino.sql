-- Tablas usadas por routes/marble.js, routes/arena.js y routes/domino.js

create table if not exists marble_sessions (
  id           text primary key default gen_random_uuid()::text,
  status       text default 'waiting',
  game_type    text default 'marble',
  seed         text,
  started_at   timestamptz,
  winner_name  text,
  winner_color text,
  created_at   timestamptz default now()
);

create table if not exists marble_participants (
  id          text primary key default gen_random_uuid()::text,
  session_id  text references marble_sessions(id) on delete cascade,
  name        text not null,
  color       text,
  created_at  timestamptz default now()
);

create table if not exists domino_rooms (
  id          text primary key default gen_random_uuid()::text,
  name        text,
  state       jsonb,
  full_state  jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
