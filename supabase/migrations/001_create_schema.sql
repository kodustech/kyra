-- ─── Enum: field_type ────────────────────────────────────────────────────────

CREATE TYPE field_type AS ENUM (
  'text', 'number', 'email', 'phone', 'date', 'select', 'boolean', 'url', 'textarea'
);

-- ─── Table: databases ───────────────────────────────────────────────────────

CREATE TABLE databases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Table: fields ──────────────────────────────────────────────────────────

CREATE TABLE fields (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id uuid NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  name        text NOT NULL,
  type        field_type NOT NULL DEFAULT 'text',
  required    boolean NOT NULL DEFAULT false,
  mask        text,
  options     jsonb,
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fields_database_id ON fields(database_id);
CREATE INDEX idx_fields_position ON fields(database_id, position);

-- ─── Table: records ─────────────────────────────────────────────────────────

CREATE TABLE records (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id uuid NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  data        jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_records_database_id ON records(database_id);

-- ─── Trigger: auto-update updated_at ────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_databases_updated_at
  BEFORE UPDATE ON databases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_fields_updated_at
  BEFORE UPDATE ON fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_records_updated_at
  BEFORE UPDATE ON records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS (basic: allow all for now, tighten with auth later) ────────────────

ALTER TABLE databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on databases" ON databases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on fields" ON fields FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on records" ON records FOR ALL USING (true) WITH CHECK (true);
