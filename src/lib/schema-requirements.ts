/** Columnas mínimas requeridas por migraciones 001/002. */
export const REQUIRED_SCHEMA: ReadonlyArray<{ table: string; column: string }> = [
  { table: 'users', column: 'password' },
  { table: 'users', column: 'is_active' },
  { table: 'users', column: 'can_view_all_tasks' },
  { table: 'tasks', column: 'overdue_notified' },
  { table: 'tasks', column: 'group_id' },
  { table: 'tasks', column: 'start_date' },
  { table: 'task_groups', column: 'supervisor_user_id' },
  { table: 'task_groups', column: 'list_type' },
  { table: 'task_groups', column: 'due_date' },
  { table: 'task_groups', column: 'kind' },
  { table: 'task_groups', column: 'is_template' },
  { table: 'task_groups', column: 'template_id' },
  { table: 'task_groups', column: 'require_strict_order' },
  { table: 'procedure_steps', column: 'assigned_user_id' },
  { table: 'procedure_steps', column: 'is_completed' },
  { table: 'procedure_step_assignees', column: 'user_id' },
];

export const REQUIRED_TABLES = [
  'users',
  'tasks',
  'task_groups',
  'notifications',
  'password_reset_tokens',
  'settings',
  'procedure_steps',
  'procedure_step_assignees',
] as const;

export const SCHEMA_OUTDATED_MESSAGE =
  'La base de datos necesita actualizarse. Ejecuta npm run db:migrate o contacta al administrador.';

export function formatMissingSchema(missingTables: string[], missingColumns: string[]): string {
  const parts: string[] = [];
  if (missingTables.length > 0) {
    parts.push(`tablas: ${missingTables.join(', ')}`);
  }
  if (missingColumns.length > 0) {
    parts.push(`columnas: ${missingColumns.join(', ')}`);
  }
  if (parts.length === 0) return SCHEMA_OUTDATED_MESSAGE;
  return `${SCHEMA_OUTDATED_MESSAGE} Faltan ${parts.join('; ')}.`;
}
