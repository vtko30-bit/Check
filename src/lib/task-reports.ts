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
  warning?: string;
}> {
  try {
    const today = new Date().toISOString().split('T')[0];

    let overdueTasks: Pick<Task, 'id' | 'title'>[] = [];
    try {
      const { rows } = await sql`
        SELECT id, title FROM tasks 
        WHERE deadline < ${today} 
        AND status != 'completed' 
        AND (overdue_notified IS FALSE OR overdue_notified IS NULL)
      `;
      overdueTasks = rows as Pick<Task, 'id' | 'title'>[];
    } catch (dbError: unknown) {
      if (dbError instanceof Error && dbError.message?.includes('overdue_notified')) {
        console.warn("[Database] 'overdue_notified' column not found.");
        return { success: true, count: 0, warning: 'DB_OUTDATED' };
      }
      throw dbError;
    }

    if (overdueTasks.length > 0) {
      const { rows: admins } = await sql`SELECT id FROM users WHERE role = 'admin'`;

      for (const task of overdueTasks) {
        for (const admin of admins) {
          await sql`
            INSERT INTO notifications (user_id, message, created_at)
            VALUES (${admin.id}, ${`¡PLAZO VENCIDO! "${task.title}" ha superado su fecha límite.`}, NOW())
          `;
        }
        await sql`UPDATE tasks SET overdue_notified = TRUE WHERE id = ${task.id}`;
      }

      return { success: true, count: overdueTasks.length };
    }

    return { success: true, count: 0 };
  } catch (error) {
    console.error('Error checking overdue tasks:', error);
    return { success: false };
  }
}
