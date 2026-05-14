CREATE TABLE IF NOT EXISTS build_contents (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL,
  description  TEXT,
  shared_items JSONB DEFAULT '{}',
  author_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS build_variants (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id    UUID REFERENCES build_contents(id) ON DELETE CASCADE,
  role          TEXT NOT NULL,
  sort_order    INTEGER DEFAULT 0,
  equipment     JSONB DEFAULT '{}',
  equipment_alt JSONB,
  has_alt       BOOLEAN DEFAULT false,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_build_variants_content ON build_variants(content_id);
CREATE INDEX IF NOT EXISTS idx_build_contents_category ON build_contents(category);
