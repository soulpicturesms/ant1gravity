-- =============================================
-- ANT1GRAVITY Guild Portal — Supabase Schema
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =============================================

create extension if not exists "pgcrypto";

-- ── USERS ──────────────────────────────────
create table if not exists users (
  id          text primary key default gen_random_uuid()::text,
  username    text unique not null,
  password    text not null,
  role        text default 'member' check (role in ('member','officer','admin')),
  avatar_url  text,
  coins       integer default 0,
  pvp_fame    bigint default 0,
  pvp_kills   integer default 0,
  cta_attendance integer default 0,
  total_activities integer default 0,
  created_at  timestamptz default now()
);

-- ── NEWS ───────────────────────────────────
create table if not exists news (
  id          text primary key default gen_random_uuid()::text,
  title       text not null,
  content     text not null,
  image_url   text,
  author_id   text references users(id) on delete set null,
  author_name text,
  pinned      boolean default false,
  category    text default 'general',
  created_at  timestamptz default now()
);

-- ── ACTIVITIES ─────────────────────────────
create table if not exists activities (
  id           text primary key default gen_random_uuid()::text,
  name         text not null,
  type         text not null,
  date         timestamptz not null,
  description  text,
  created_by   text references users(id) on delete set null,
  creator_name text,
  created_at   timestamptz default now()
);

-- ── ATTENDANCE ─────────────────────────────
create table if not exists attendance (
  id          text primary key default gen_random_uuid()::text,
  user_id     text references users(id) on delete cascade,
  activity_id text references activities(id) on delete cascade,
  present     boolean default true,
  unique(user_id, activity_id)
);

-- ── BUILDS ─────────────────────────────────
create table if not exists builds (
  id          text primary key default gen_random_uuid()::text,
  title       text not null,
  category    text not null,
  description text,
  items       text,
  image_url   text,
  author_id   text references users(id) on delete set null,
  author_name text,
  featured    boolean default false,
  created_at  timestamptz default now()
);

-- ── EQUIPMENT PRESETS ──────────────────────
create table if not exists equipment_presets (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  slot       text not null,
  coin_value integer not null,
  tier       text default 'T8',
  created_at timestamptz default now()
);

-- ── DEATH REPORTS ──────────────────────────
create table if not exists death_reports (
  id             text primary key default gen_random_uuid()::text,
  user_id        text references users(id) on delete cascade,
  username       text,
  avatar_url     text,
  screenshot_url text not null,
  description    text,
  status         text default 'pending' check (status in ('pending','approved','rejected')),
  coins_awarded  integer default 0,
  admin_notes    text,
  items_lost     text,
  reviewed_by    text,
  reviewed_at    timestamptz,
  claimed        boolean default false,
  created_at     timestamptz default now()
);

-- ── COIN TRANSACTIONS ──────────────────────
create table if not exists coin_transactions (
  id         text primary key default gen_random_uuid()::text,
  user_id    text references users(id) on delete cascade,
  username   text,
  amount     integer not null,
  type       text not null,
  reason     text,
  admin_id   text,
  report_id  text,
  created_at timestamptz default now()
);

-- ── BLACKLIST ──────────────────────────────
create table if not exists blacklist (
  id           text primary key default gen_random_uuid()::text,
  username     text not null,
  reason       text,
  added_by     text references users(id) on delete set null,
  added_by_name text,
  created_at   timestamptz default now()
);

-- ── CREDIT REQUESTS ────────────────────────
create table if not exists credit_requests (
  id           text primary key default gen_random_uuid()::text,
  user_id      text references users(id) on delete cascade,
  username     text,
  coins        integer not null,
  status       text default 'pending' check (status in ('pending','completed','rejected')),
  admin_notes  text,
  processed_at timestamptz,
  processed_by text,
  created_at   timestamptz default now()
);

-- ── RANKINGS CACHE ─────────────────────────
create table if not exists rankings_cache (
  type       text primary key,
  data       jsonb default '[]',
  total      integer default 0,
  updated_at timestamptz default now()
);

-- ── GIVEAWAYS ──────────────────────────────
create table if not exists giveaways (
  id              text primary key default gen_random_uuid()::text,
  title           text not null,
  prizes          jsonb not null default '[]',
  duration        integer not null,
  status          text default 'waiting' check (status in ('waiting','active','finished','cancelled','closed')),
  participants    jsonb default '[]',
  winners         jsonb default '[]',
  created_by      text references users(id) on delete set null,
  created_by_name text,
  started_at      timestamptz,
  ends_at         timestamptz,
  created_at      timestamptz default now()
);

-- ── MEDIA ──────────────────────────────────
create table if not exists media (
  id          text primary key default gen_random_uuid()::text,
  key         text not null,
  url         text not null,
  caption     text default '',
  "order"     integer default 0,
  uploaded_at timestamptz default now()
);

-- ── DISABLE RLS (usamos JWT propio) ────────
alter table users disable row level security;
alter table news disable row level security;
alter table activities disable row level security;
alter table attendance disable row level security;
alter table builds disable row level security;
alter table equipment_presets disable row level security;
alter table death_reports disable row level security;
alter table coin_transactions disable row level security;
alter table blacklist disable row level security;
alter table credit_requests disable row level security;
alter table rankings_cache disable row level security;
alter table giveaways disable row level security;
alter table media disable row level security;

-- ── SEED: PRESETS DE EQUIPO ────────────────
insert into equipment_presets (name, slot, coin_value, tier) values
  ('Cultist Cowl','head',600,'T8'),('Specter Hood','head',500,'T8'),
  ('Scholar Cowl','head',300,'T8'),('Mage Cowl','head',250,'T7'),
  ('Cultist Robe','chest',800,'T8'),('Specter Jacket','chest',700,'T8'),
  ('Royal Robe','chest',900,'T8'),('Cleric Robe','chest',400,'T8'),
  ('Cultist Sandals','feet',500,'T8'),('Specter Shoes','feet',450,'T8'),
  ('Scholar Sandals','feet',250,'T8'),('Graveguard Boots','feet',350,'T8'),
  ('Great Nature Staff','main_hand',1200,'T8'),('Hallowfall','main_hand',2000,'T8'),
  ('Bedrock Mace','main_hand',800,'T8'),('Blazing Staff','main_hand',900,'T8'),
  ('Occult Staff','main_hand',1100,'T8'),('Bow of Badon','main_hand',1500,'T8'),
  ('Shield of Badon','off_hand',800,'T8'),('Tome of Spells','off_hand',300,'T8'),
  ('Mistcaller','off_hand',200,'T8'),('Muisak','off_hand',350,'T8'),
  ('Lymhurst Cape','cape',150,'T8'),('Thetford Cape','cape',150,'T8'),
  ('Bridgewatch Cape','cape',150,'T8'),
  ('Direwolf','mount',500,'T8'),('Swiftclaw','mount',300,'T7'),('Armored Horse','mount',100,'T5'),
  ('Roast Pork','food',80,'T8'),('Pork Omelette','food',60,'T7'),
  ('Major Resistance Potion','potion',50,'T7'),('Invisibility Potion','potion',70,'T7')
on conflict do nothing;

-- ── SEED: NOTICIA BIENVENIDA ───────────────
insert into news (title, content, category, pinned, author_name)
values (
  'Bienvenidos a ANT1GRAVITY',
  '¡Este es el portal oficial del gremio ANT1GRAVITY en Albion Online! Aquí encontrarán toda la información sobre actividades, builds, rankings y el sistema de reequipo. ¡Que comience la batalla!',
  'announcement', true, 'Sistema'
) on conflict do nothing;

-- ── MIGRATION v2: ALBION CHARACTER + DEATH-BASED REEQUIP ──────────────────
-- Ejecutar en Supabase SQL Editor:

ALTER TABLE users ADD COLUMN IF NOT EXISTS albion_character TEXT;

CREATE TABLE IF NOT EXISTS reequip_requests (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username       TEXT,
  albion_character TEXT,
  event_id       BIGINT      UNIQUE NOT NULL,
  death_event    JSONB       NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending',
  selected_items JSONB,
  silver_total   BIGINT      DEFAULT 0,
  coins_awarded  INTEGER     DEFAULT 0,
  admin_id       TEXT        REFERENCES users(id),
  admin_notes    TEXT,
  reviewed_at    TIMESTAMPTZ,
  claimed        BOOLEAN     DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reequip_requests_user_idx    ON reequip_requests(user_id);
CREATE INDEX IF NOT EXISTS reequip_requests_status_idx  ON reequip_requests(status);
CREATE INDEX IF NOT EXISTS reequip_requests_event_idx   ON reequip_requests(event_id);

-- ── STORAGE BUCKETS ────────────────────────
-- Crear manualmente en: Supabase Dashboard > Storage > New bucket (marcar como Public)
-- Buckets necesarios: avatars, builds, screenshots, media
