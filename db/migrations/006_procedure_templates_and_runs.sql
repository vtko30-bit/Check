-- 006_procedure_templates_and_runs.sql
-- Plantillas reutilizables y ejecuciones diarias de procedimientos

ALTER TABLE task_groups ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE task_groups ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES task_groups(id) ON DELETE SET NULL;
ALTER TABLE task_groups ADD COLUMN IF NOT EXISTS run_date DATE;
ALTER TABLE task_groups ADD COLUMN IF NOT EXISTS run_status VARCHAR(50) DEFAULT 'open';

-- Procedimientos existentes pasan a ser plantillas (definición)
UPDATE task_groups
SET is_template = TRUE
WHERE kind = 'procedure'
  AND template_id IS NULL
  AND (is_template IS NULL OR is_template = FALSE);

-- En plantillas los pasos son definición: sin estado completado
UPDATE procedure_steps ps
SET is_completed = FALSE,
    completed_at = NULL,
    completed_by = NULL
FROM task_groups g
WHERE ps.group_id = g.id
  AND g.is_template IS TRUE;

CREATE INDEX IF NOT EXISTS idx_task_groups_template_id ON task_groups(template_id);
CREATE INDEX IF NOT EXISTS idx_task_groups_is_template ON task_groups(is_template);
CREATE INDEX IF NOT EXISTS idx_task_groups_run_date ON task_groups(run_date);
