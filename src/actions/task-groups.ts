'use server';

import { revalidatePath } from 'next/cache';
import { sql, QueryResultRow } from '@/lib/db';
import { TaskGroup } from '@/types';
import { auth } from '@/auth';
import { z } from 'zod';

function mapTaskGroup(row: QueryResultRow): TaskGroup {
  return {
    id: row.id,
    name: row.name,
    description: (row as any).description || '',
    color: (row as any).color || null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
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
});

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
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? 'Datos inválidos' };
  }

  const { name, description, color } = parsed.data;

  try {
    // Pequeña ayuda visual: color por defecto (verde)
    const defaultColor = '#0f766e';
    const finalColor =
      typeof color === 'string' && color.trim().length > 0
        ? color.trim()
        : defaultColor;

    await sql`
      INSERT INTO task_groups (name, description, color, created_by)
      VALUES (${name}, ${description || null}, ${finalColor}, ${user.id})
    `;

    revalidatePath('/groups');
    return { success: true };
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
    // Al eliminar un grupo, devolvemos sus tareas a la lista principal (group_id = NULL)
    await sql`UPDATE tasks SET group_id = NULL WHERE group_id = ${id}`;
    await sql`DELETE FROM task_groups WHERE id = ${id}`;

    revalidatePath('/groups');
    revalidatePath('/');
    revalidatePath('/calendar');
    return { success: true };
  } catch (error) {
    console.error('Error deleting task group:', error);
    return { success: false, error: 'No se pudo eliminar el grupo.' };
  }
}

