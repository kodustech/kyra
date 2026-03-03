-- ─── Enum: block_view_type ───────────────────────────────────────────────────

CREATE TYPE block_view_type AS ENUM ('form', 'table');

-- ─── Table: pages ───────────────────────────────────────────────────────────

CREATE TABLE pages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  published   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_pages_slug ON pages(slug);

-- ─── Table: blocks ──────────────────────────────────────────────────────────

CREATE TABLE blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id     uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  database_id uuid NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  view_type   block_view_type NOT NULL DEFAULT 'form',
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_blocks_page_id ON blocks(page_id);
CREATE INDEX idx_blocks_database_id ON blocks(database_id);
CREATE INDEX idx_blocks_position ON blocks(page_id, position);

-- ─── Triggers: auto-update updated_at ───────────────────────────────────────

CREATE TRIGGER trg_pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_blocks_updated_at
  BEFORE UPDATE ON blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS (basic: allow all for now, tighten with auth later) ────────────────

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on pages" ON pages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on blocks" ON blocks FOR ALL USING (true) WITH CHECK (true);
