-- Make database_id nullable (richtext blocks have no database)
ALTER TABLE blocks ALTER COLUMN database_id DROP NOT NULL;

-- Add content column for richtext blocks
ALTER TABLE blocks ADD COLUMN content text;

-- Add CHECK constraints:
-- richtext blocks must NOT have database_id and MAY have content
-- form/table blocks MUST have database_id and must NOT have content
ALTER TABLE blocks ADD CONSTRAINT blocks_richtext_check CHECK (
  (view_type = 'richtext' AND database_id IS NULL) OR
  (view_type != 'richtext' AND database_id IS NOT NULL)
);
