-- Add slug column (nullable first so we can backfill)
ALTER TABLE "fields" ADD COLUMN "slug" text;

-- Backfill slugs from existing field names
-- Converts name to lowercase, replaces non-alphanumeric with hyphens, trims hyphens
UPDATE "fields" SET "slug" = regexp_replace(
  regexp_replace(
    lower("name"),
    '[^a-z0-9]+', '-', 'g'
  ),
  '^-+|-+$', '', 'g'
);

-- Handle empty slugs (e.g. names with only special chars)
UPDATE "fields" SET "slug" = 'field' WHERE "slug" = '' OR "slug" IS NULL;

-- Deduplicate slugs within each database by appending -N suffix
WITH dupes AS (
  SELECT id, database_id, slug,
    ROW_NUMBER() OVER (PARTITION BY database_id, slug ORDER BY position, created_at) AS rn
  FROM fields
)
UPDATE fields SET slug = fields.slug || '-' || dupes.rn
FROM dupes
WHERE fields.id = dupes.id AND dupes.rn > 1;

-- Now make it NOT NULL
ALTER TABLE "fields" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_fields_database_slug" ON "fields" USING btree ("database_id","slug");
