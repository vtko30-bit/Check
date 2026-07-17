'use server';

import { revalidatePath } from 'next/cache';
import { sql, QueryResultRow } from '@/lib/db';
import { ProcedureStep } from '@/types';
import { getSessionUser, isAdminOrEditor } from '@/lib/auth-helpers';
import { getToggleProcedureStepPermission } from '@/lib/procedure-permissions';
import { z } from 'zod';

function mapStep(row: QueryResultRow): ProcedureStep {
  const r = row as Record<string, unknown>;
  return {
    id: row.id as string,
    groupId: r.group_id as string,
    title: r.title as string,
    sortOrder: Number(r.sort_order ?? 0),
    assignedUserId: r.assigned_user_id as string,
    isCompleted: r.is_completed === true,
    completedAt: r.completed_at
      ? new Date(r.completed_at as string).toISOString()
      : null,
    completedBy: (r.completed_by as string) || null,
  };
}

export async function getProcedureSteps(groupId: string): Promise<ProcedureStep[]> {
  try {
    const user = await getSessionUser();
    if (!user) return [];

    const { rows } = await sql`
      SELECT * FROM procedure_steps
      WHERE group_id = ${groupId}
      ORDER BY sort_order ASC, created_at ASC
    `;
    return rows.map(mapStep);
  } catch (error) {
    console.error('Error fetching procedure steps:', error);
    return [];
  }
}

export async function toggleProcedureStep(stepId: string) {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'No autenticado.' };

  try {
    const { rows } = await sql`
      SELECT id, group_id, assigned_user_id, is_completed
      FROM procedure_steps
      WHERE id = ${stepId}
      LIMIT 1
    `;
    if (!rows.length) {
      return { success: false, error: 'Paso no encontrado.' };
    }

    const step = rows[0];
    const perm = getToggleProcedureStepPermission(
      { id: user.id, role: user.role },
      step.assigned_user_id as string,
      true
    );
    if (!perm.ok) return { success: false, error: perm.error };

    const nextCompleted = step.is_completed !== true;
    if (nextCompleted) {
      await sql`
        UPDATE procedure_steps
        SET is_completed = TRUE,
            completed_at = NOW(),
            completed_by = ${user.id}
        WHERE id = ${stepId}
      `;
    } else {
      await sql`
        UPDATE procedure_steps
        SET is_completed = FALSE,
            completed_at = NULL,
            completed_by = NULL
        WHERE id = ${stepId}
      `;
    }

    const groupId = step.group_id as string;
    revalidatePath(`/groups/${groupId}`);
    revalidatePath('/groups');
    return { success: true, isCompleted: nextCompleted };
  } catch (error) {
    console.error('Error toggling procedure step:', error);
    return { success: false, error: 'No se pudo actualizar el paso.' };
  }
}

const addStepSchema = z.object({
  groupId: z.string().uuid(),
  title: z.string().min(1, 'El título es obligatorio').max(500),
  assignedUserId: z.string().uuid('Selecciona un responsable'),
});

export async function addProcedureStep(data: {
  groupId: string;
  title: string;
  assignedUserId: string;
}) {
  const user = await getSessionUser();
  if (!isAdminOrEditor(user)) {
    return { success: false, error: 'No autorizado.' };
  }

  const parsed = addStepSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    const { rows: groupRows } = await sql`
      SELECT id, kind FROM task_groups WHERE id = ${parsed.data.groupId} LIMIT 1
    `;
    if (!groupRows.length || groupRows[0].kind !== 'procedure') {
      return { success: false, error: 'Procedimiento no encontrado.' };
    }

    const { rows: maxRows } = await sql`
      SELECT COALESCE(MAX(sort_order), -1)::int AS max_order
      FROM procedure_steps
      WHERE group_id = ${parsed.data.groupId}
    `;
    const nextOrder = Number(maxRows[0]?.max_order ?? -1) + 1;

    await sql`
      INSERT INTO procedure_steps (group_id, title, sort_order, assigned_user_id)
      VALUES (
        ${parsed.data.groupId},
        ${parsed.data.title.trim()},
        ${nextOrder},
        ${parsed.data.assignedUserId}
      )
    `;

    revalidatePath(`/groups/${parsed.data.groupId}`);
    revalidatePath('/groups');
    return { success: true };
  } catch (error) {
    console.error('Error adding procedure step:', error);
    return { success: false, error: 'No se pudo añadir el paso.' };
  }
}

export async function completeProcedure(groupId: string) {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'No autenticado.' };

  try {
    const { rows: groupRows } = await sql`
      SELECT id, kind FROM task_groups WHERE id = ${groupId} LIMIT 1
    `;
    if (!groupRows.length || groupRows[0].kind !== 'procedure') {
      return { success: false, error: 'Procedimiento no encontrado.' };
    }

    const { rows: pending } = await sql`
      SELECT COUNT(*)::int AS count
      FROM procedure_steps
      WHERE group_id = ${groupId} AND is_completed IS NOT TRUE
    `;
    if (Number(pending[0]?.count ?? 0) > 0) {
      return {
        success: false,
        error: 'Aún hay pasos pendientes. Completa todos antes de cerrar el procedimiento.',
      };
    }

    await sql`
      UPDATE task_groups
      SET last_completed_at = NOW(), last_completed_by = ${user.id}
      WHERE id = ${groupId}
    `;

    revalidatePath(`/groups/${groupId}`);
    revalidatePath('/groups');
    return { success: true };
  } catch (error) {
    console.error('Error completing procedure:', error);
    return { success: false, error: 'No se pudo completar el procedimiento.' };
  }
}

export async function resetProcedureSteps(groupId: string) {
  const user = await getSessionUser();
  if (!isAdminOrEditor(user)) {
    return { success: false, error: 'No autorizado.' };
  }

  try {
    const { rows: groupRows } = await sql`
      SELECT id, kind FROM task_groups WHERE id = ${groupId} LIMIT 1
    `;
    if (!groupRows.length || groupRows[0].kind !== 'procedure') {
      return { success: false, error: 'Procedimiento no encontrado.' };
    }

    await sql`
      UPDATE procedure_steps
      SET is_completed = FALSE, completed_at = NULL, completed_by = NULL
      WHERE group_id = ${groupId}
    `;

    revalidatePath(`/groups/${groupId}`);
    revalidatePath('/groups');
    return { success: true };
  } catch (error) {
    console.error('Error resetting procedure steps:', error);
    return { success: false, error: 'No se pudieron reiniciar los pasos.' };
  }
}
