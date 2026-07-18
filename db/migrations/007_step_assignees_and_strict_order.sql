-- 007_step_assignees_and_strict_order.sql
-- Varios responsables por paso + orden estricto opcional

ALTER TABLE task_groups ADD COLUMN IF NOT EXISTS require_strict_order BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS procedure_step_assignees (
  step_id UUID NOT NULL REFERENCES procedure_steps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (step_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_procedure_step_assignees_user
  ON procedure_step_assignees(user_id);

-- Migrar responsables actuales al modelo multi-asignado
INSERT INTO procedure_step_assignees (step_id, user_id)
SELECT id, assigned_user_id
FROM procedure_steps
WHERE assigned_user_id IS NOT NULL
ON CONFLICT DO NOTHING;
