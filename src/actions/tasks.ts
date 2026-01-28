'use server';

import { revalidatePath } from 'next/cache';
import { sql, QueryResultRow } from '@vercel/postgres';
import { Task, SubTask } from '@/types';

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
    priority: row.priority || 'normal',
    isArchived: !!row.is_archived,
    isPinned: !!row.is_pinned
  };
}

export async function toggleSubtask(taskId: string, subtaskId: string, completed: boolean) {
  try {
    const { rows } = await sql`SELECT subtasks FROM tasks WHERE id = ${taskId}`;
    if (!rows || rows.length === 0) return { success: false, error: "Tast not found" };
    
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
    const { rows } = await sql`SELECT subtasks FROM tasks WHERE id = ${taskId}`;
    if (!rows || rows.length === 0) return { success: false, error: "Task not found" };
    
    const subtasks: SubTask[] = rows[0].subtasks || [];
    const newSubtask: SubTask = {
      id: Math.random().toString(36).substring(2, 9),
      title,
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

import { auth } from '@/auth';

export async function getTasks(showArchived: boolean = false): Promise<Task[]> {
  try {
    const session = await auth();
    if (!session?.user) return [];

    const user = session.user as { role: string; id: string };
    const isAdmin = user.role === 'admin';
    const userId = user.id;

    // Silent migration check for is_pinned (redundant if seed was run, but safe)
    try {
      await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE`;
      await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE`;
    } catch {
      // Ignore
    }

    let query;
    if (isAdmin) {
      query = showArchived 
        ? sql`SELECT * FROM tasks ORDER BY deadline ASC`
        : sql`SELECT * FROM tasks WHERE is_archived IS NOT TRUE ORDER BY deadline ASC`;
    } else {
      query = showArchived
        ? sql`SELECT * FROM tasks WHERE assigned_user_id = ${userId} ORDER BY deadline ASC`
        : sql`SELECT * FROM tasks WHERE assigned_user_id = ${userId} AND is_archived IS NOT TRUE ORDER BY deadline ASC`;
    }

    const { rows } = await query;
    return rows.map(mapTask);
  } catch (error) {
    console.error("Error in getTasks:", error);
    return [];
  }
}

export async function archiveTask(taskId: string) {
  try {
    console.log(`[Archive] Archiving single task: ${taskId}`);
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
    console.log(`[Archive] Archiving ${taskIds.length} tasks:`, taskIds);
    // SQLite/Postgres batch update
    for (const id of taskIds) {
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
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const assignedUserId = formData.get('assignedUserId') as string;
    const deadline = formData.get('deadline') as string;
    const notes = formData.get('notes') as string;
    const subtasksJson = formData.get('subtasks') as string;
    const subtasks = subtasksJson ? JSON.parse(subtasksJson) : [];
    const frequency = formData.get('frequency') as string || 'one_time';
    const priority = formData.get('priority') as string || 'normal';

    await sql`
      UPDATE tasks 
      SET title = ${title}, 
          description = ${description}, 
          assigned_user_id = ${assignedUserId || null}, 
          deadline = ${deadline}, 
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
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const assignedUserId = formData.get('assignedUserId') as string;
    const deadline = formData.get('deadline') as string;
    const notes = formData.get('notes') as string;
    const subtasksJson = formData.get('subtasks') as string;
    const subtasks = subtasksJson ? JSON.parse(subtasksJson) : [];
    const frequency = formData.get('frequency') as string || 'one_time';
    const priority = formData.get('priority') as string || 'normal';

    await sql`
      INSERT INTO tasks (title, description, assigned_user_id, deadline, status, notes, created_at, subtasks, frequency, priority)
      VALUES (${title}, ${description}, ${assignedUserId || null}, ${deadline}, 'pending', ${notes}, NOW(), ${JSON.stringify(subtasks)}, ${frequency}, ${priority})
    `;

    revalidatePath('/');
    revalidatePath('/calendar');
    return { success: true };
  } catch (error) {
    console.error("Error creating task:", error);
    return { success: false, error: "Failed to create task" };
  }
}

export async function updateTaskStatus(taskId: string, newStatus: string) {
  try {
    // 1. Get task details for notification message
    const { rows: taskRows } = await sql`SELECT title FROM tasks WHERE id = ${taskId}`;
    const taskTitle = taskRows[0]?.title || 'Tarea';

    // 2. Update the status
    await sql`UPDATE tasks SET status = ${newStatus} WHERE id = ${taskId}`;

    // 3. If completed, notify Admins
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
