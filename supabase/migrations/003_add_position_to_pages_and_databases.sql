-- Add position column to pages for sidebar ordering
ALTER TABLE pages ADD COLUMN position integer NOT NULL DEFAULT 0;
CREATE INDEX idx_pages_position ON pages(position);

-- Add position column to databases for sidebar ordering
ALTER TABLE databases ADD COLUMN position integer NOT NULL DEFAULT 0;
CREATE INDEX idx_databases_position ON databases(position);
