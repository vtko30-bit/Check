import { getDatabaseSchemaError } from '@/lib/db-schema';
import { withPgTransaction } from '@/lib/db-transaction';
import { sql } from '@/lib/db';
import { Task } from '@/types';
import { QueryResultRow } from '@/lib/db';

function mapTask(row: QueryResultRow): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || '',
    assignedUserId: (row.assigned_user_id as string) || '',
    deadline: row.deadline ? new Date(row.deadline as string).toISOString().split('T')[0] : '',
    status: row.status as 'pending' | 'in_progress' | 'completed',
    notes: (row.notes as string) || '',
    createdAt: row.created_at
      ? new Date(row.created_at as string).toISOString()
      : new Date().toISOString(),
    subtasks: (row.subtasks as Task['subtasks']) || [],
    frequency: (row.frequency as Task['frequency']) || 'one_time',
    startDate: row.start_date
      ? new Date(row.start_date as string).toISOString().split('T')[0]
      : undefined,
    priority: (row.priority as Task['priority']) || 'normal',
    isArchived: !!row.is_archived,
    isPinned: !!row.is_pinned,
    groupId: (row.group_id as string | null) ?? null,
  };
}

/** Uso interno (cron). No exponer como Server Action. */
export async function fetchAllTasksForReports(): Promise<Task[]> {
  const { rows } = await sql`SELECT * FROM tasks ORDER BY deadline ASC`;
  return rows.map(mapTask);
}

/** Uso interno (cron). No exponer como Server Action. */
export async function runCheckOverdueTasks(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  const schemaError = await getDatabaseSchemaError();
  if (schemaError) {
    return { success: false, error: schemaError };
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    return await withPgTransaction(async (query) => {
      const overdueResult = await query<{ id: string; title: string }>(
        `SELECT id, title FROM tasks
         WHERE deadline < $1
           AND status != 'completed'
           AND (overdue_notified IS FALSE OR overdue_notified IS NULL)`,
        [today]
      );
      const overdueTasks = overdueResult.rows;

      if (overdueTasks.length === 0) {
        return { success: true, count: 0 };
      }

      const adminsResult = await query<{ id: string }>(
        `SELECT id FROM users WHERE role = 'admin'`
      );
      const adminIds = adminsResult.rows.map((row) => row.id);

      for (const task of overdueTasks) {
        const message = `¡PLAZO VENCIDO! "${task.title}" ha superado su fecha límite.`;
        if (adminIds.length > 0) {
          await query(
            `INSERT INTO notifications (user_id, message, created_at)
             SELECT unnest($1::uuid[]), $2, NOW()`,
            [adminIds, message]
          );
        }
        await query(`UPDATE tasks SET overdue_notified = TRUE WHERE id = $1`, [task.id]);
      }

      return { success: true, count: overdueTasks.length };
    });
  } catch (error) {
    console.error('Error checking overdue tasks:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al comprobar tareas vencidas',
    };
  }
}
