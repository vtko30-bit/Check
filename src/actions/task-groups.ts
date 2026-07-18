'use server';

import { revalidatePath } from 'next/cache';
import { sql, QueryResultRow } from '@/lib/db';
import { TaskGroup } from '@/types';
import { auth } from '@/auth';
import { z } from 'zod';
import { withPgTransaction } from '@/lib/db-transaction';
import { TASK_FREQUENCIES } from '@/lib/task-validation';
import {
  createProcedureRunFromTemplate,
  notifyProcedureRunAssignees,
} from '@/lib/procedure-runs';

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
    kind: (r.kind as TaskGroup['kind']) || 'folder',
    isTemplate: r.is_template === true,
    templateId: (r.template_id as string) || null,
    runDate: r.run_date
      ? new Date(r.run_date as string).toISOString().split('T')[0]
      : null,
    runStatus: (r.run_status as string) || null,
    requireStrictOrder: r.require_strict_order === true,
    stepCount:
      r.step_count !== undefined && r.step_count !== null
        ? Number(r.step_count)
        : undefined,
    completedStepCount:
      r.completed_step_count !== undefined && r.completed_step_count !== null
        ? Number(r.completed_step_count)
        : undefined,
  };
}

export async function getTaskGroups(): Promise<TaskGroup[]> {
  try {
    const session = await auth();
    if (!session?.user) return [];

    const { rows } = await sql`
      SELECT
        g.*,
        COALESCE(s.step_count, 0)::int AS step_count,
        COALESCE(s.completed_step_count, 0)::int AS completed_step_count
      FROM task_groups g
      LEFT JOIN (
        SELECT
          group_id,
          COUNT(*)::int AS step_count,
          COUNT(*) FILTER (WHERE is_completed IS TRUE)::int AS completed_step_count
        FROM procedure_steps
        GROUP BY group_id
      ) s ON s.group_id = g.id
      WHERE g.template_id IS NULL
      ORDER BY g.created_at DESC
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
      SELECT COUNT(*)::int AS count FROM task_groups WHERE template_id IS NULL
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
        due_date,
        kind
      )
      VALUES (${name}, ${description || null}, ${finalColor}, ${user.id}, ${supervisorUserId || null}, ${listType}, ${dueDate}, 'folder')
      RETURNING id
    `;

    revalidatePath('/groups');
    return { success: true, groupId: rows[0]?.id as string };
  } catch (error) {
    console.error('Error creating task group:', error);
    return { success: false, error: 'No se pudo crear el grupo. Intenta de nuevo.' };
  }
}

const procedureStepInputSchema = z.object({
  title: z.string().min(1).max(500),
  assignedUserIds: z
    .array(z.string().uuid())
    .min(1, 'Cada paso necesita al menos un responsable'),
});

const createProcedureSchema = groupSchema.extend({
  requireStrictOrder: z.boolean().optional().default(false),
  steps: z
    .array(procedureStepInputSchema)
    .min(1, 'Añade al menos un paso al procedimiento.'),
});

/** Crea un procedimiento (checklist) con pasos asignados. */
export async function createProcedure(data: {
  name: string;
  description?: string;
  color?: string | null;
  supervisorUserId?: string | null;
  listType?: string;
  dueDate?: string | null;
  requireStrictOrder?: boolean;
  steps: { title: string; assignedUserIds?: string[]; assignedUserId?: string }[];
}) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (!user?.id) {
    return { success: false, error: 'No autenticado.' };
  }
  if (user.role !== 'admin' && user.role !== 'editor') {
    return { success: false, error: 'No autorizado.' };
  }

  const normalizedSteps = data.steps.map((s) => ({
    title: s.title,
    assignedUserIds: [
      ...new Set(
        (s.assignedUserIds?.length
          ? s.assignedUserIds
          : s.assignedUserId
            ? [s.assignedUserId]
            : []
        ).filter(Boolean)
      ),
    ],
  }));

  const parsed = createProcedureSchema.safeParse({
    name: data.name,
    description: data.description ?? '',
    color: data.color ?? '',
    supervisorUserId: data.supervisorUserId || null,
    listType: data.listType || 'one_time',
    dueDate: data.dueDate || null,
    requireStrictOrder: data.requireStrictOrder ?? false,
    steps: normalizedSteps,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? 'Datos inválidos' };
  }

  const {
    name,
    description,
    color,
    supervisorUserId,
    listType,
    dueDate,
    requireStrictOrder,
    steps,
  } = parsed.data;

  if (!dueDate) {
    return { success: false, error: 'La fecha de vencimiento es obligatoria.' };
  }

  try {
    const existing = await sql`
      SELECT id FROM task_groups
      WHERE LOWER(name) = ${normalizeGroupName(name)}
        AND template_id IS NULL
      LIMIT 1
    `;
    if (existing.rows.length > 0) {
      return { success: false, error: 'Ya existe una lista con ese nombre.' };
    }

    const finalColor =
      typeof color === 'string' && color.trim().length > 0 ? color.trim() : '#0f766e';

    const groupId = await withPgTransaction(async (query) => {
      const groupResult = await query<{ id: string }>(
        `INSERT INTO task_groups (
           name, description, color, created_by, supervisor_user_id,
           list_type, due_date, kind, is_template, require_strict_order
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'procedure', TRUE, $8)
         RETURNING id`,
        [
          name,
          description || null,
          finalColor,
          user.id,
          supervisorUserId || null,
          listType,
          dueDate,
          requireStrictOrder,
        ]
      );
      const id = groupResult.rows[0]?.id;
      if (!id) throw new Error('No se pudo crear el procedimiento.');

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const primary = step.assignedUserIds[0];
        const stepResult = await query<{ id: string }>(
          `INSERT INTO procedure_steps (group_id, title, sort_order, assigned_user_id)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [id, step.title.trim(), i, primary]
        );
        const stepId = stepResult.rows[0]?.id;
        if (!stepId) throw new Error('No se pudo crear un paso.');
        for (const assigneeId of step.assignedUserIds) {
          await query(
            `INSERT INTO procedure_step_assignees (step_id, user_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [stepId, assigneeId]
          );
        }
      }
      return id;
    });

    revalidatePath('/groups');
    revalidatePath(`/groups/${groupId}`);
    return { success: true, groupId };
  } catch (error) {
    console.error('Error creating procedure:', error);
    return { success: false, error: 'No se pudo crear el procedimiento.' };
  }
}

/** Inicia una ejecución del procedimiento plantilla para una fecha. */
export async function startProcedureRun(templateId: string, runDate?: string) {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (!user?.id) {
    return { success: false, error: 'No autenticado.' };
  }

  const date =
    runDate && /^\d{4}-\d{2}-\d{2}$/.test(runDate)
      ? runDate
      : new Date().toISOString().split('T')[0];

  try {
    const result = await createProcedureRunFromTemplate(templateId, date, user.id);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    if (result.created) {
      const { rows: templates } = await sql`
        SELECT name FROM task_groups WHERE id = ${templateId} LIMIT 1
      `;
      const templateName = (templates[0]?.name as string) || 'Procedimiento';
      await notifyProcedureRunAssignees(result.groupId, templateName, date);
    }

    revalidatePath('/groups');
    revalidatePath(`/groups/${templateId}`);
    revalidatePath(`/groups/${result.groupId}`);
    return {
      success: true,
      groupId: result.groupId,
      alreadyExists: result.alreadyExists,
    };
  } catch (error) {
    console.error('Error starting procedure run:', error);
    return { success: false, error: 'No se pudo iniciar la ejecución.' };
  }
}

/** Historial de ejecuciones de una plantilla. */
export async function getProcedureRuns(templateId: string): Promise<TaskGroup[]> {
  try {
    const session = await auth();
    if (!session?.user) return [];

    const { rows } = await sql`
      SELECT
        g.*,
        COALESCE(s.step_count, 0)::int AS step_count,
        COALESCE(s.completed_step_count, 0)::int AS completed_step_count
      FROM task_groups g
      LEFT JOIN (
        SELECT
          group_id,
          COUNT(*)::int AS step_count,
          COUNT(*) FILTER (WHERE is_completed IS TRUE)::int AS completed_step_count
        FROM procedure_steps
        GROUP BY group_id
      ) s ON s.group_id = g.id
      WHERE g.template_id = ${templateId}
      ORDER BY g.run_date DESC NULLS LAST, g.created_at DESC
      LIMIT 50
    `;
    return rows.map(mapTaskGroup);
  } catch (error) {
    console.error('Error fetching procedure runs:', error);
    return [];
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
      // Ejecuciones hijas de esta plantilla
      await query('DELETE FROM task_groups WHERE template_id = $1', [id]);
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
        await query('DELETE FROM task_groups WHERE template_id = $1', [id]);
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

