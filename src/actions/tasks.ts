'use server';

import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/db';
import { SubTask, Task } from '@/types';
import { insertNotificationsForUsers } from '@/lib/notifications-db';
import { getSessionUser } from '@/lib/auth-helpers';
import { mapTask } from '@/lib/task-mapper';
import { getModifyTaskPermission, type TaskActor } from '@/lib/task-permissions';
import { parseTaskFormData } from '@/lib/task-validation';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_CREATES = 30;
const createTaskTimestamps: { [userId: string]: number[] } = {};

function checkCreateRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = createTaskTimestamps[userId] ?? [];
  const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (valid.length >= RATE_LIMIT_MAX_CREATES) return false;
  valid.push(now);
  createTaskTimestamps[userId] = valid;
  return true;
}

async function getCurrentUser(): Promise<TaskActor | null> {
  const user = await getSessionUser();
  if (!user?.id || !user.role) return null;
  return { id: user.id, role: user.role };
}

async function canModifyTask(
  taskId: string,
  currentUser?: TaskActor | null
): Promise<{ ok: boolean; error?: string }> {
  const user = currentUser ?? (await getCurrentUser());
  const { rows } = await sql`SELECT assigned_user_id FROM tasks WHERE id = ${taskId}`;
  const assigned = rows[0]?.assigned_user_id as string | null | undefined;
  const perm = getModifyTaskPermission(user, assigned, (rows?.length ?? 0) > 0);
  return perm.ok ? { ok: true } : { ok: false, error: perm.error };
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
    const user = await getCurrentUser();
    const perm = await canModifyTask(taskId, user);
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
    const user = await getCurrentUser();
    const perm = await canModifyTask(taskId, user);
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
    const user = await getCurrentUser();
    const perm = await canModifyTask(taskId, user);
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
    const user = await getSessionUser();
    if (!user) return [];

    const canSeeAll = user.canViewAllTasks === true;
    const userId = user.id;
    const showOnlyMine = viewMode === 'mine' || !canSeeAll;

    let query;
    if (showOnlyMine) {
      query = showArchived
        ? sql`SELECT * FROM tasks WHERE assigned_user_id = ${userId} AND (group_id IS NULL) ORDER BY deadline ASC`
        : sql`SELECT * FROM tasks WHERE assigned_user_id = ${userId} AND is_archived IS NOT TRUE AND (group_id IS NULL) ORDER BY deadline ASC`;
    } else {
      query = showArchived
        ? sql`SELECT * FROM tasks WHERE group_id IS NULL ORDER BY deadline ASC`
        : sql`SELECT * FROM tasks WHERE is_archived IS NOT TRUE AND group_id IS NULL ORDER BY deadline ASC`;
    }

    const { rows } = await withTimeout(query, 15000, { rows: [], rowCount: 0 });
    return rows.map(mapTask);
  } catch (error) {
    console.error("Error in getTasks:", error);
    return [];
  }
}

// Obtiene tareas pertenecientes a un grupo concreto (carpeta/proyecto)
export async function getTasksByGroup(
  groupId: string,
  showArchived: boolean = false
): Promise<Task[]> {
  try {
    const user = await getSessionUser();
    if (!user) return [];

    const canSeeAll = user.canViewAllTasks === true || user.role === 'admin';
    const userId = user.id;

    let query;
    if (canSeeAll) {
      query = showArchived
        ? sql`SELECT * FROM tasks WHERE group_id = ${groupId} ORDER BY deadline ASC`
        : sql`SELECT * FROM tasks WHERE group_id = ${groupId} AND is_archived IS NOT TRUE ORDER BY deadline ASC`;
    } else {
      query = showArchived
        ? sql`SELECT * FROM tasks WHERE group_id = ${groupId} AND assigned_user_id = ${userId} ORDER BY deadline ASC`
        : sql`SELECT * FROM tasks WHERE group_id = ${groupId} AND assigned_user_id = ${userId} AND is_archived IS NOT TRUE ORDER BY deadline ASC`;
    }

    const { rows } = await withTimeout(query, 15000, { rows: [], rowCount: 0 });
    return rows.map(mapTask);
  } catch (error) {
    console.error("Error in getTasksByGroup:", error);
    return [];
  }
}

export async function archiveTask(taskId: string) {
  try {
    const user = await getCurrentUser();
    const perm = await canModifyTask(taskId, user);
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
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'No autenticado' };

    for (const id of taskIds) {
      const perm = await canModifyTask(id, user);
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
    const user = await getCurrentUser();
    const perm = await canModifyTask(taskId, user);
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
    const user = await getCurrentUser();
    const perm = await canModifyTask(taskId, user);
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
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'No autenticado' };

    for (const id of taskIds) {
      const perm = await canModifyTask(id, user);
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
    const user = await getCurrentUser();
    const perm = await canModifyTask(taskId, user);
    if (!perm.ok) return { success: false, error: perm.error };
    const parsed = parseTaskFormData(formData);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { success: false, error: first?.message ?? 'Datos inválidos' };
    }
    const { title, description, assignedUserId, deadline, notes, frequency, startDate, priority, groupId } = parsed.data;
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
          priority = ${priority},
          group_id = ${groupId || null}
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
    const sessionUser = await getSessionUser();
    if (!sessionUser) return { success: false, error: 'No autenticado' };
    const user = { id: sessionUser.id, role: sessionUser.role };
    if (!checkCreateRateLimit(user.id)) {
      return { success: false, error: 'Demasiadas tareas creadas en poco tiempo. Espera un momento.' };
    }
    const parsed = parseTaskFormData(formData);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { success: false, error: first?.message ?? 'Datos inválidos' };
    }
    let { assignedUserId, title, description, deadline, notes, frequency, startDate, priority, groupId } = parsed.data;
    // Si no es admin, la tarea queda sin asignar y pendiente de que un admin la gestione
    if (user.role !== 'admin') {
      assignedUserId = null;
    }
    const subtasksJson = formData.get('subtasks') as string;
    const subtasks = dedupeSubtasks(subtasksJson ? JSON.parse(subtasksJson) : []);

    const startDateVal = frequency === 'date_range' && startDate ? startDate : null;
    await sql`
      INSERT INTO tasks (title, description, assigned_user_id, deadline, start_date, status, notes, created_at, subtasks, frequency, priority, group_id)
      VALUES (${title}, ${description}, ${assignedUserId || null}, ${deadline}, ${startDateVal}, 'pending', ${notes}, NOW(), ${JSON.stringify(subtasks)}, ${frequency}, ${priority}, ${groupId || null})
    `;

    // Notificar a administradores si la tarea la ha creado un usuario no admin
    if (user.role !== 'admin') {
      try {
        const { rows: admins } = await sql`SELECT id FROM users WHERE role = 'admin'`;
        const creatorName = sessionUser.name || 'un usuario';
        const safeTitle = title.length > 80 ? `${title.slice(0, 77)}...` : title;
        await insertNotificationsForUsers(
          admins.map((admin) => admin.id as string),
          `Nueva tarea pendiente de asignación: "${safeTitle}" creada por ${creatorName}.`
        );
      } catch (notifyError) {
        console.error('Error sending task approval notifications:', notifyError);
      }
    }

    revalidatePath('/');
    revalidatePath('/calendar');
    return { success: true };
  } catch (error) {
    console.error("Error creating task:", error);
    const msg = error instanceof Error ? error.message : '';

    if (msg.toLowerCase().includes('start_date') && msg.toLowerCase().includes('column')) {
      return {
        success: false,
        error: 'La base de datos necesita actualizarse (columna start_date). Ejecuta el seed en desarrollo o contacta al administrador.',
      };
    }

    return { success: false, error: process.env.NODE_ENV === 'development' ? msg : "Failed to create task" };
  }
}

export async function updateTaskStatus(taskId: string, newStatus: string) {
  try {
    const user = await getCurrentUser();
    const perm = await canModifyTask(taskId, user);
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
      await insertNotificationsForUsers(
        admins.map((admin) => admin.id as string),
        `¡Tarea Finalizada! "${taskTitle}" ha sido completada.`
      );
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
    const user = await getCurrentUser();
    const perm = await canModifyTask(taskId, user);
    if (!perm.ok) return { success: false, error: perm.error };
    await sql`UPDATE tasks SET notes = ${notes} WHERE id = ${taskId}`;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error("Error updating task notes:", error);
    return { success: false, error: "Failed to update notes" };
  }
}

export async function setTaskGroup(taskId: string, groupId: string | null) {
  try {
    const user = await getCurrentUser();
    const perm = await canModifyTask(taskId, user);
    if (!perm.ok) return { success: false, error: perm.error };

    await sql`UPDATE tasks SET group_id = ${groupId} WHERE id = ${taskId}`;

    revalidatePath('/');
    revalidatePath('/calendar');
    revalidatePath('/groups');
    if (groupId) {
      revalidatePath(`/groups/${groupId}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating task group:', error);
    return { success: false, error: 'No se pudo mover la tarea de grupo.' };
  }
}