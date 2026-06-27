-- 001_initial_schema.sql
-- Esquema base de Check (idempotente)

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  password VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  can_view_all_tasks BOOLEAN DEFAULT FALSE
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_view_all_tasks BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(20),
  supervisor_user_id UUID REFERENCES users(id),
  list_type VARCHAR(50) DEFAULT 'one_time',
  due_date DATE,
  created_by UUID REFERENCES users(id),
  last_completed_at TIMESTAMP,
  last_completed_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE task_groups ADD COLUMN IF NOT EXISTS supervisor_user_id UUID REFERENCES users(id);
ALTER TABLE task_groups ADD COLUMN IF NOT EXISTS list_type VARCHAR(50) DEFAULT 'one_time';
ALTER TABLE task_groups ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE task_groups ADD COLUMN IF NOT EXISTS last_completed_at TIMESTAMP;
ALTER TABLE task_groups ADD COLUMN IF NOT EXISTS last_completed_by UUID REFERENCES users(id);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_user_id UUID REFERENCES users(id),
  deadline DATE,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  subtasks JSONB DEFAULT '[]',
  frequency VARCHAR(50) DEFAULT 'one_time',
  priority VARCHAR(20) DEFAULT 'normal',
  is_archived BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  group_id UUID REFERENCES task_groups(id),
  start_date DATE,
  overdue_notified BOOLEAN DEFAULT FALSE
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS frequency VARCHAR(50) DEFAULT 'one_time';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS overdue_notified BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES task_groups(id);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
);
