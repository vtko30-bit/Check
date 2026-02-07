'use server';

import { revalidatePath } from 'next/cache';
import { sql, QueryResultRow } from '@/lib/db';
import { Task, SubTask } from '@/types';
import { auth } from '@/auth';
import { z } from 'zod';

const taskFormSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio').max(255),
  description: z.string().max(2000).optional().default(''),
  assignedUserId: z.string().optional().nullable(),
  deadline: z.string().optional(),
  notes: z.string().optional().default(''),
  frequency: z.enum(['one_time', 'daily', 'weekly', 'weekly_0', 'weekly_1', 'weekly_2', 'weekly_3', 'weekly_4', 'weekly_5', 'weekly_6', 'monday', 'monthly', 'date_range']).default('one_time'),
  startDate: z.string().optional(),
  priority: z.enum(['normal', 'urgent']).default('normal'),
});

// --- OWNERSHIP HELPER ---
async function canModifyTask(taskId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: 'No autenticado' };
  const user = session.user as { id: string; role: string };
  const isAdmin = user.role === 'admin';
  if (isAdmin) return { ok: true };
  const { rows } = await sql`SELECT assigned_user_id FROM tasks WHERE id = ${taskId}`;
  if (!rows?.length) return { ok: false, error: 'Tarea no encontrada' };
  const assigned = rows[0]?.assigned_user_id;
  if (assigned !== user.id) return { ok: false, error: 'No tienes permiso para modificar esta tarea' };
  return { ok: true };
}

// --- MAPPER HELPER ---
function mapTask(row: QueryResultRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    assignedUserId: row.assigned_user_id || '',
    deadline: row.deadline ? new Date(row.deadline).toISOString().split('T')[0] : '',
    status: row.status as 'pending' | 'in_progress' | 'completed',
    notes: row.notes || '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    subtasks: row.subtasks || [],
    frequency: row.frequency || 'one_time',
    startDate: row.start_date ? new Date(row.start_date).toISOString().split('T')[0] : undefined,
    priority: row.priority || 'normal',
    isArchived: !!row.is_archived,
    isPinned: !!row.is_pinned
  };
}

// --- SUBTASKS ACTIONS ---

function dedupeSubtasks(subtasks: SubTask[]): SubTask[] {
  const seen = new Set<string>();
  return subtasks.filter(st => {
    const key = (st.title || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function toggleSubtask(taskId: string, subtaskId: string, completed: boolean) {
  try {
    const perm = await canModifyTask(taskId);
    if (!perm.ok) return { success: false, error: perm.error };
    const { rows } = await sql`SELECT subtasks FROM tasks WHERE id = ${taskId}`;
    if (!rows || rows.length === 0) return { success: false, error: "Task not found" };
    
    const subtasks: SubTask[] = rows[0].subtasks || [];
    const updatedSubtasks = subtasks.map((st: SubTask) => 
      st.id === subtaskId ? { ...st, completed } : st
    );

    await sql`UPDATE tasks SET subtasks = ${JSON.stringify(updatedSubtasks)} WHERE id = ${taskId}`;
    
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error("Error toggling subtask:", error);
    return { success: false, error: "Failed to update" };
  }
}

export async function addSubtask(taskId: string, title: string) {
  try {
    const perm = await canModifyTask(taskId);
    if (!perm.ok) return { success: false, error: perm.error };
    const { rows } = await sql`SELECT subtasks FROM tasks WHERE id = ${taskId}`;
    if (!rows || rows.length === 0) return { success: false, error: "Task not found" };
    
    const subtasks: SubTask[] = rows[0].subtasks || [];
    const titleNorm = title.trim().toLowerCase();
    const alreadyExists = subtasks.some((st: SubTask) => st.title.toLowerCase() === titleNorm);
    if (alreadyExists) {
      return { success: false, error: "Ya existe una subtarea con ese nombre" };
    }

    const newSubtask: SubTask = {
      id: crypto.randomUUID(),
      title: title.trim(),
      completed: false
    };

    const updatedSubtasks = [...subtasks, newSubtask];
    await sql`UPDATE tasks SET subtasks = ${JSON.stringify(updatedSubtasks)} WHERE id = ${taskId}`;
    
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error("Error adding subtask:", error);
    return { success: false, error: "Failed to add subtask" };
  }
}

export async function deleteSubtask(taskId: string, subtaskId: string) {
  try {
    const perm = await canModifyTask(taskId);
    if (!perm.ok) return { success: false, error: perm.error };
    const { rows } = await sql`SELECT subtasks FROM tasks WHERE id = ${taskId}`;
    if (!rows || rows.length === 0) return { success: false, error: "Task not found" };
    
    const subtasks: SubTask[] = rows[0].subtasks || [];
    const updatedSubtasks = subtasks.filter((st: SubTask) => st.id !== subtaskId);

    await sql`UPDATE tasks SET subtasks = ${JSON.stringify(updatedSubtasks)} WHERE id = ${taskId}`;
    
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error("Error deleting subtask:", error);
    return { success: false, error: "Failed to delete subtask" };
  }
}

// --- TASK ACTIONS ---

const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);

type TaskViewMode = 'all' | 'mine';

export async function getTasks(
  showArchived: boolean = false,
  viewMode: TaskViewMode = 'all'
): Promise<Task[]> {
  try {
    const session = await auth();
    if (!session?.user) return [];

    const user = session.user as { role: string; id: string; canViewAllTasks?: boolean };
    const canSeeAll = user.canViewAllTasks === true;
    const userId = user.id;
    const showOnlyMine = viewMode === 'mine' || !canSeeAll;

    let query;
    if (showOnlyMine) {
      query = showArchived
        ? sql`SELECT * FROM tasks WHERE assigned_user_id = ${userId} ORDER BY deadline ASC`
        : sql`SELECT * FROM tasks WHERE assigned_user_id = ${userId} AND is_archived IS NOT TRUE ORDER BY deadline ASC`;
    } else {
      query = showArchived
        ? sql`SELECT * FROM tasks ORDER BY deadline ASC`
        : sql`SELECT * FROM tasks WHERE is_archived IS NOT TRUE ORDER BY deadline ASC`;
    }

    const { rows } = await withTimeout(query, 15000, { rows: [], rowCount: 0 });
    return rows.map(mapTask);
  } catch (error) {
    console.error("Error in getTasks:", error);
    return [];
  }
}

// Versión sin autenticación, pensada para procesos de backend (cron, reportes, etc.)
export async function getAllTasksForReports(): Promise<Task[]> {
  try {
    const { rows } = await sql`SELECT * FROM tasks ORDER BY deadline ASC`;
    return rows.map(mapTask);
  } catch (error) {
    console.error("Error in getAllTasksForReports:", error);
    return [];
  }
}

export async function archiveTask(taskId: string) {
  try {
    const perm = await canModifyTask(taskId);
    if (!perm.ok) return { success: false, error: perm.error };
    await sql`UPDATE tasks SET is_archived = TRUE WHERE id = ${taskId}`;
    revalidatePath('/', 'page');
    revalidatePath('/calendar', 'page');
    return { success: true };
  } catch (error) {
    console.error("Error archiving task:", error);
    return { success: false, error: "Failed to archive task" };
  }
}

export async function bulkArchiveTasks(taskIds: string[]) {
  try {
    for (const id of taskIds) {
      const perm = await canModifyTask(id);
      if (!perm.ok) continue;
      await sql`UPDATE tasks SET is_archived = TRUE WHERE id = ${id}`;
    }
    revalidatePath('/', 'page');
    revalidatePath('/calendar', 'page');
    return { success: true };
  } catch (error) {
    console.error("Error bulk archiving tasks:", error);
    return { success: false, error: "Failed to bulk archive tasks" };
  }
}

export async function toggleTaskPin(taskId: string, isPinned: boolean) {
  try {
    const perm = await canModifyTask(taskId);
    if (!perm.ok) return { success: false, error: perm.error };
    await sql`UPDATE tasks SET is_pinned = ${isPinned} WHERE id = ${taskId}`;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error("Error toggling task pin:", error);
    return { success: false, error: "Failed to toggle pin" };
  }
}

export async function deleteTask(taskId: string) {
  try {
    const perm = await canModifyTask(taskId);
    if (!perm.ok) return { success: false, error: perm.error };
    await sql`DELETE FROM tasks WHERE id = ${taskId}`;
    revalidatePath('/');
    revalidatePath('/calendar');
    return { success: true };
  } catch (error) {
    console.error("Error deleting task:", error);
    return { success: false, error: "Failed to delete task" };
  }
}

export async function bulkDeleteTasks(taskIds: string[]) {
  try {
    for (const id of taskIds) {
      const perm = await canModifyTask(id);
      if (!perm.ok) continue;
      await sql`DELETE FROM tasks WHERE id = ${id}`;
    }
    revalidatePath('/');
    revalidatePath('/calendar');
    return { success: true };
  } catch (error) {
    console.error("Error bulk deleting tasks:", error);
    return { success: false, error: "Failed to bulk delete tasks" };
  }
}

export async function updateTask(taskId: string, formData: FormData) {
  try {
    const perm = await canModifyTask(taskId);
    if (!perm.ok) return { success: false, error: perm.error };
    const parsed = taskFormSchema.safeParse({
      title: formData.get('title'),
      description: formData.get('description') ?? '',
      assignedUserId: formData.get('assignedUserId') || null,
      deadline: formData.get('deadline') || '',
      notes: formData.get('notes') ?? '',
      frequency: formData.get('frequency') || 'one_time',
      startDate: formData.get('startDate') || undefined,
      priority: formData.get('priority') || 'normal',
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { success: false, error: first?.message ?? 'Datos inválidos' };
    }
    const { title, description, assignedUserId, deadline, notes, frequency, startDate, priority } = parsed.data;
    const subtasksJson = formData.get('subtasks') as string;
    const subtasks = dedupeSubtasks(subtasksJson ? JSON.parse(subtasksJson) : []);

    const startDateVal = frequency === 'date_range' && startDate ? startDate : null;
    await sql`
      UPDATE tasks 
      SET title = ${title}, 
          description = ${description}, 
          assigned_user_id = ${assignedUserId || null}, 
          deadline = ${deadline}, 
          start_date = ${startDateVal}, 
          notes = ${notes}, 
          subtasks = ${JSON.stringify(subtasks)}, 
          frequency = ${frequency}, 
          priority = ${priority}
      WHERE id = ${taskId}
    `;

    revalidatePath('/');
    revalidatePath('/calendar');
    return { success: true };
  } catch (error) {
    console.error("Error updating task:", error);
    return { success: false, error: "Failed to update task" };
  }
}

export async function createTask(formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: 'No autenticado' };
    const user = session.user as { id: string; role: string };
    const parsed = taskFormSchema.safeParse({
      title: formData.get('title'),
      description: formData.get('description') ?? '',
      assignedUserId: formData.get('assignedUserId') || null,
      deadline: formData.get('deadline') || '',
      notes: formData.get('notes') ?? '',
      frequency: formData.get('frequency') || 'one_time',
      startDate: formData.get('startDate') || undefined,
      priority: formData.get('priority') || 'normal',
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { success: false, error: first?.message ?? 'Datos inválidos' };
    }
    let { assignedUserId, title, description, deadline, notes, frequency, startDate, priority } = parsed.data;
    if (user.role !== 'admin') assignedUserId = user.id;
    const subtasksJson = formData.get('subtasks') as string;
    const subtasks = dedupeSubtasks(subtasksJson ? JSON.parse(subtasksJson) : []);

    const startDateVal = frequency === 'date_range' && startDate ? startDate : null;
    try {
      await sql`
        INSERT INTO tasks (title, description, assigned_user_id, deadline, start_date, status, notes, created_at, subtasks, frequency, priority)
        VALUES (${title}, ${description}, ${assignedUserId || null}, ${deadline}, ${startDateVal}, 'pending', ${notes}, NOW(), ${JSON.stringify(subtasks)}, ${frequency}, ${priority})
      `;
    } catch (insertErr: unknown) {
      const msg = String(insertErr instanceof Error ? insertErr.message : '').toLowerCase();
      if (msg.includes('start_date')) {
        try {
          await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date DATE`;
          await sql`
            INSERT INTO tasks (title, description, assigned_user_id, deadline, start_date, status, notes, created_at, subtasks, frequency, priority)
            VALUES (${title}, ${description}, ${assignedUserId || null}, ${deadline}, ${startDateVal}, 'pending', ${notes}, NOW(), ${JSON.stringify(subtasks)}, ${frequency}, ${priority})
          `;
        } catch (retryErr) {
          await sql`
            INSERT INTO tasks (title, description, assigned_user_id, deadline, status, notes, created_at, subtasks, frequency, priority)
            VALUES (${title}, ${description}, ${assignedUserId || null}, ${deadline}, 'pending', ${notes}, NOW(), ${JSON.stringify(subtasks)}, ${frequency}, ${priority})
          `;
        }
      } else {
        throw insertErr;
      }
    }

    revalidatePath('/');
    revalidatePath('/calendar');
    return { success: true };
  } catch (error) {
    console.error("Error creating task:", error);
    const msg = error instanceof Error ? error.message : '';
    return { success: false, error: process.env.NODE_ENV === 'development' ? msg : "Failed to create task" };
  }
}

export async function updateTaskStatus(taskId: string, newStatus: string) {
  try {
    const perm = await canModifyTask(taskId);
    if (!perm.ok) return { success: false, error: perm.error };
    const { rows: taskRows } = await sql`SELECT title, subtasks FROM tasks WHERE id = ${taskId}`;
    if (!taskRows || taskRows.length === 0) {
      return { success: false, error: "La tarea no existe." };
    }

    const taskTitle = taskRows[0]?.title || 'Tarea';

    // 2. If trying to complete, ensure all subtasks are completed
    if (newStatus === 'completed') {
      const subtasks: SubTask[] = taskRows[0].subtasks || [];
      const hasSubtasks = subtasks.length > 0;
      const hasPendingSubtasks = subtasks.some((st) => !st.completed);

      if (hasSubtasks && hasPendingSubtasks) {
        return {
          success: false,
          error: 'No puedes marcar la tarea como finalizada porque tiene subtareas pendientes. Completa todas las subtareas primero.',
        };
      }
    }

    // 3. Update the status
    await sql`UPDATE tasks SET status = ${newStatus} WHERE id = ${taskId}`;

    // 4. If completed, notify Admins
    if (newStatus === 'completed') {
      const { rows: admins } = await sql`SELECT id FROM users WHERE role = 'admin'`;
      
      console.log(`[Notification] Found ${admins.length} admins to notify`);
      
      for (const admin of admins) {
        console.log(`[Notification] Creating alert for admin: ${admin.id}`);
        await sql`
          INSERT INTO notifications (user_id, message, created_at)
          VALUES (${admin.id}, ${`¡Tarea Finalizada! "${taskTitle}" ha sido completada.`}, NOW())
        `;
      }
    }

    revalidatePath('/');
    revalidatePath('/calendar');
    return { success: true };
  } catch (error) {
    console.error("Error updating task status:", error);
    return { success: false, error: "Failed to update status" };
  }
}

export async function updateTaskNotes(taskId: string, notes: string) {
  try {
    const perm = await canModifyTask(taskId);
    if (!perm.ok) return { success: false, error: perm.error };
    await sql`UPDATE tasks SET notes = ${notes} WHERE id = ${taskId}`;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error("Error updating task notes:", error);
    return { success: false, error: "Failed to update notes" };
  }
}

export async function checkOverdueTasks() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Find tasks that are overdue and haven't notified admins yet
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
        console.warn("[Database] 'overdue_notified' column not found. Please visit /api/seed to update the schema.");
        return { success: true, count: 0, warning: "DB_OUTDATED" };
      }
      throw dbError;
    }

    if (overdueTasks.length > 0) {
      console.log(`[Overdue] Found ${overdueTasks.length} overdue tasks to notify`);
      const { rows: admins } = await sql`SELECT id FROM users WHERE role = 'admin'`;
      
      for (const task of overdueTasks) {
        for (const admin of admins) {
          await sql`
            INSERT INTO notifications (user_id, message, created_at)
            VALUES (${admin.id}, ${`¡PLAZO VENCIDO! "${task.title}" ha superado su fecha límite.`}, NOW())
          `;
        }
        // Mark as notified so we don't spam
        await sql`UPDATE tasks SET overdue_notified = TRUE WHERE id = ${task.id}`;
      }
      
      return { success: true, count: overdueTasks.length };
    }
    
    return { success: true, count: 0 };
  } catch (error) {
    console.error("Error checking overdue tasks:", error);
    return { success: false };
  }
}