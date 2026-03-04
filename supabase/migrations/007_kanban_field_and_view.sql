-- Novo tipo de field: kanban_status
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'kanban_status';

-- Novo tipo de view: kanban
ALTER TYPE block_view_type ADD VALUE IF NOT EXISTS 'kanban';

-- Coluna settings (JSONB) para configurações do field kanban_status
-- Armazena: { options: [{ id, label, color, icon }] }
ALTER TABLE fields ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT NULL;

-- Propriedade highlight nos fields (quais campos aparecem nos cards do kanban)
ALTER TABLE fields ADD COLUMN IF NOT EXISTS highlight boolean NOT NULL DEFAULT false;

-- Atualizar constraint dos blocks para permitir kanban (precisa database_id, como form/table)
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_richtext_check;
ALTER TABLE blocks ADD CONSTRAINT blocks_type_check CHECK (
  (view_type = 'richtext' AND database_id IS NULL) OR
  (view_type != 'richtext' AND database_id IS NOT NULL)
);

-- Recarregar schema do PostgREST
NOTIFY pgrst, 'reload schema';
