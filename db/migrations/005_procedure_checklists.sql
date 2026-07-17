-- 005_procedure_checklists.sql
-- Procedimientos (checklist) con pasos asignados a una persona

ALTER TABLE task_groups ADD COLUMN IF NOT EXISTS kind VARCHAR(50) DEFAULT 'folder';

-- folder = carpeta/proyecto (Kanban); procedure = checklist operativo
UPDATE task_groups SET kind = 'folder' WHERE kind IS NULL;

CREATE TABLE IF NOT EXISTS procedure_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES task_groups(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  assigned_user_id UUID NOT NULL REFERENCES users(id),
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  completed_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_procedure_steps_group_id ON procedure_steps(group_id);
CREATE INDEX IF NOT EXISTS idx_procedure_steps_group_order ON procedure_steps(group_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_procedure_steps_assigned ON procedure_steps(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_task_groups_kind ON task_groups(kind);
