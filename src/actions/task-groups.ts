'use server';

import { revalidatePath } from 'next/cache';
import { sql, QueryResultRow } from '@/lib/db';
import { TaskGroup } from '@/types';
import { auth } from '@/auth';
import { z } from 'zod';
import { withPgTransaction } from '@/lib/db-transaction';
import { TASK_FREQUENCIES } from '@/lib/task-validation';

function mapTaskGroup(row: QueryResultRow): TaskGroup {
  const r = row as Record<string, unknown>;
  return {
    id: row.id as string,
    name: row.name as string,
    description: (r.description as string) || '',
    color: (r.color as string) || undefined,
    createdAt: row.created_at
      ? new Date(row.created_at as string).toISOString()
      : new Date().toISOString(),
    supervisorUserId: (r.supervisor_user_id as string) || null,
    listType: (r.list_type as TaskGroup['listType']) || 'one_time',
    dueDate: r.due_date
      ? new Date(r.due_date as string).toISOString().split('T')[0]
      : null,
    lastCompletedAt: r.last_completed_at
      ? new Date(r.last_completed_at as string).toISOString()
      : null,
    lastCompletedBy: (r.last_completed_by as string) || null,
  };
}

export async function getTaskGroups(): Promise<TaskGroup[]> {
  try {
    const session = await auth();
    if (!session?.user) return [];

    const { rows } = await sql`
      SELECT * FROM task_groups
      ORDER BY created_at DESC
    `;
    return rows.map(mapTaskGroup);
  } catch (error) {
    console.error('Error fetching task groups:', error);
    return [];
  }
}

/** Cantidad de grupos de tareas (para mostrar en el menú lateral). */
export async function getGroupedTasksCount(): Promise<number> {
  try {
    const session = await auth();
    if (!session?.user) return 0;

    const { rows } = await sql`
      SELECT COUNT(*)::int AS count FROM task_groups
    `;
    return (rows[0]?.count ?? 0) as number;
  } catch (error) {
    console.error('Error fetching task groups count:', error);
    return 0;
  }
}

export async function getTaskGroupById(id: string): Promise<TaskGroup | null> {
  try {
    const session = await auth();
    if (!session?.user) return null;

    const { rows } = await sql`
      SELECT * FROM task_groups
      WHERE id = ${id}
      LIMIT 1
    `;
    if (!rows.length) return null;
    return mapTaskGroup(rows[0]);
  } catch (error) {
    console.error('Error fetching task group by id:', error);
    return null;
  }
}

const groupSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(255),
  description: z.string().max(1000).optional(),
  color: z.string().max(20).optional().nullable(),
  supervisorUserId: z.string().uuid().optional().nullable(),
  listType: z.enum(TASK_FREQUENCIES).default('one_time'),
  dueDate: z.string().optional().nullable(),
});

function normalizeGroupName(name: string) {
  return name.trim().toLowerCase();
}

export async function createTaskGroup(formData: FormData) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (!user?.id) {
    return { success: false, error: 'No autenticado.' };
  }
  if (user.role !== 'admin' && user.role !== 'editor') {
    return { success: false, error: 'No autorizado. Solo administradores o editores pueden crear grupos.' };
  }

  const parsed = groupSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    color: formData.get('color') ?? '',
    supervisorUserId: formData.get('supervisorUserId') || null,
    listType: formData.get('listType') || 'one_time',
    dueDate: formData.get('dueDate') || null,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? 'Datos inválidos' };
  }

  const { name, description, color, supervisorUserId, listType, dueDate } = parsed.data;

  try {
    const existing = await sql`
      SELECT id
      FROM task_groups
      WHERE LOWER(name) = ${normalizeGroupName(name)}
      LIMIT 1
    `;

    if (existing.rows.length > 0) {
      return { success: false, error: 'Ya existe una lista con ese nombre.' };
    }

    if (!dueDate) {
      return { success: false, error: 'La fecha de vencimiento es obligatoria.' };
    }

    // Pequeña ayuda visual: color por defecto (verde)
    const defaultColor = '#0f766e';
    const finalColor =
      typeof color === 'string' && color.trim().length > 0
        ? color.trim()
        : defaultColor;

    const { rows } = await sql`
      INSERT INTO task_groups (
        name,
        description,
        color,
        created_by,
        supervisor_user_id,
        list_type,
        due_date
      )
      VALUES (${name}, ${description || null}, ${finalColor}, ${user.id}, ${supervisorUserId || null}, ${listType}, ${dueDate})
      RETURNING id
    `;

    revalidatePath('/groups');
    return { success: true, groupId: rows[0]?.id as string };
  } catch (error) {
    console.error('Error creating task group:', error);
    return { success: false, error: 'No se pudo crear el grupo. Intenta de nuevo.' };
  }
}

export async function updateTaskGroup(
  id: string,
  data: { name: string; description?: string; color?: string | null }
) {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;

  if (user?.role !== 'admin' && user?.role !== 'editor') {
    return { success: false, error: 'No autorizado.' };
  }

  const parsed = groupSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? 'Datos inválidos' };
  }

  const { name, description, color } = parsed.data;
  const finalColor =
    typeof color === 'string' && color.trim().length > 0
      ? color.trim()
      : null;

  try {
    const existing = await sql`
      SELECT id
      FROM task_groups
      WHERE LOWER(name) = ${normalizeGroupName(name)}
        AND id <> ${id}
      LIMIT 1
    `;

    if (existing.rows.length > 0) {
      return { success: false, error: 'Ya existe una lista con ese nombre.' };
    }

    await sql`
      UPDATE task_groups
      SET name = ${name}, description = ${description || null}, color = ${finalColor}
      WHERE id = ${id}
    `;
    revalidatePath('/groups');
    revalidatePath(`/groups/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating task group:', error);
    return { success: false, error: 'No se pudo actualizar el grupo.' };
  }
}

export async function deleteTaskGroup(id: string) {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;

  if (user?.role !== 'admin' && user?.role !== 'editor') {
    return { success: false, error: 'No autorizado.' };
  }

  try {
    await withPgTransaction(async (query) => {
      await query('UPDATE tasks SET group_id = NULL WHERE group_id = $1', [id]);
      await query('DELETE FROM task_groups WHERE id = $1', [id]);
    });

    revalidatePath('/groups');
    revalidatePath('/');
    revalidatePath('/calendar');
    return { success: true };
  } catch (error) {
    console.error('Error deleting task group:', error);
    return { success: false, error: 'No se pudo eliminar el grupo.' };
  }
}

export async function bulkDeleteTaskGroups(groupIds: string[]) {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;

  if (user?.role !== 'admin' && user?.role !== 'editor') {
    return { success: false, error: 'No autorizado.' };
  }

  if (groupIds.length === 0) {
    return { success: false, error: 'No hay listas seleccionadas.' };
  }

  try {
    await withPgTransaction(async (query) => {
      for (const id of groupIds) {
        await query('UPDATE tasks SET group_id = NULL WHERE group_id = $1', [id]);
        await query('DELETE FROM task_groups WHERE id = $1', [id]);
      }
    });

    revalidatePath('/groups');
    revalidatePath('/');
    revalidatePath('/calendar');
    return { success: true, processed: groupIds.length };
  } catch (error) {
    console.error('Error bulk deleting task groups:', error);
    return { success: false, error: 'No se pudieron eliminar las listas.' };
  }
}

