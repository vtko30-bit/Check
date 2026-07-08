-- 003_overdue_and_groups_indexes.sql
-- Índices para cron de vencidas y consultas de listas

CREATE INDEX IF NOT EXISTS idx_tasks_overdue_check
  ON tasks (deadline, status)
  WHERE overdue_notified IS NOT TRUE OR overdue_notified IS NULL;

CREATE INDEX IF NOT EXISTS idx_task_groups_created_at ON task_groups (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_groups_name_lower ON task_groups (LOWER(name));
