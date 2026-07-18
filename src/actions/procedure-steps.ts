'use server';

import { revalidatePath } from 'next/cache';
import { sql, QueryResultRow } from '@/lib/db';
import { ProcedureStep } from '@/types';
import { getSessionUser, isAdminOrEditor } from '@/lib/auth-helpers';
import {
  canCompleteWithStrictOrder,
  getToggleProcedureStepPermission,
  normalizeAssigneeIds,
} from '@/lib/procedure-permissions';
import { z } from 'zod';

function mapStep(
  row: QueryResultRow,
  assigneeIds: string[] = []
): ProcedureStep {
  const r = row as Record<string, unknown>;
  const ids =
    assigneeIds.length > 0
      ? assigneeIds
      : normalizeAssigneeIds(r.assigned_user_id as string);
  return {
    id: row.id as string,
    groupId: r.group_id as string,
    title: r.title as string,
    sortOrder: Number(r.sort_order ?? 0),
    assignedUserId: ids[0] || (r.assigned_user_id as string) || '',
    assignedUserIds: ids,
    isCompleted: r.is_completed === true,
    completedAt: r.completed_at
      ? new Date(r.completed_at as string).toISOString()
      : null,
    completedBy: (r.completed_by as string) || null,
  };
}

async function loadAssigneeMap(stepIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (stepIds.length === 0) return map;

  const idList = `{${stepIds.join(',')}}`;
  const { rows } = await sql`
    SELECT step_id, user_id
    FROM procedure_step_assignees
    WHERE step_id = ANY(${idList}::uuid[])
  `;
  for (const row of rows) {
    const stepId = row.step_id as string;
    const userId = row.user_id as string;
    const list = map.get(stepId) ?? [];
    list.push(userId);
    map.set(stepId, list);
  }
  return map;
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
    const assigneeMap = await loadAssigneeMap(rows.map((r) => r.id as string));
    return rows.map((row) => mapStep(row, assigneeMap.get(row.id as string) ?? []));
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
      SELECT
        ps.id,
        ps.group_id,
        ps.assigned_user_id,
        ps.is_completed,
        ps.sort_order,
        g.is_template,
        g.run_status,
        g.require_strict_order
      FROM procedure_steps ps
      JOIN task_groups g ON g.id = ps.group_id
      WHERE ps.id = ${stepId}
      LIMIT 1
    `;
    if (!rows.length) {
      return { success: false, error: 'Paso no encontrado.' };
    }

    const step = rows[0];
    if (step.is_template === true) {
      return {
        success: false,
        error: 'Los pasos de la plantilla no se marcan aquí. Inicia una ejecución.',
      };
    }
    if (step.run_status === 'completed') {
      return { success: false, error: 'Esta ejecución ya está cerrada.' };
    }

    const { rows: assigneeRows } = await sql`
      SELECT user_id FROM procedure_step_assignees WHERE step_id = ${stepId}
    `;
    const assignedUserIds =
      assigneeRows.length > 0
        ? assigneeRows.map((r) => r.user_id as string)
        : normalizeAssigneeIds(step.assigned_user_id as string);

    const perm = getToggleProcedureStepPermission(
      { id: user.id, role: user.role },
      assignedUserIds,
      true
    );
    if (!perm.ok) return { success: false, error: perm.error };

    const nextCompleted = step.is_completed !== true;
    if (nextCompleted && step.require_strict_order === true) {
      const { rows: pendingPrev } = await sql`
        SELECT COUNT(*)::int AS count
        FROM procedure_steps
        WHERE group_id = ${step.group_id as string}
          AND sort_order < ${Number(step.sort_order)}
          AND is_completed IS NOT TRUE
      `;
      if (
        !canCompleteWithStrictOrder(
          true,
          Number(pendingPrev[0]?.count ?? 0) === 0
        )
      ) {
        return {
          success: false,
          error: 'Debes completar los pasos anteriores primero (orden estricto).',
        };
      }
    }

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
  assignedUserIds: z
    .array(z.string().uuid())
    .min(1, 'Selecciona al menos un responsable'),
});

export async function addProcedureStep(data: {
  groupId: string;
  title: string;
  assignedUserIds?: string[];
  /** @deprecated usar assignedUserIds */
  assignedUserId?: string;
}) {
  const user = await getSessionUser();
  if (!isAdminOrEditor(user)) {
    return { success: false, error: 'No autorizado.' };
  }

  const assignedUserIds = normalizeAssigneeIds(
    data.assignedUserIds?.length
      ? data.assignedUserIds
      : data.assignedUserId
        ? [data.assignedUserId]
        : []
  );

  const parsed = addStepSchema.safeParse({
    groupId: data.groupId,
    title: data.title,
    assignedUserIds,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    const { rows: groupRows } = await sql`
      SELECT id, kind, is_template FROM task_groups WHERE id = ${parsed.data.groupId} LIMIT 1
    `;
    if (!groupRows.length || groupRows[0].kind !== 'procedure') {
      return { success: false, error: 'Procedimiento no encontrado.' };
    }
    if (groupRows[0].is_template !== true) {
      return {
        success: false,
        error: 'Solo se pueden añadir pasos en la plantilla, no en una ejecución.',
      };
    }

    const { rows: maxRows } = await sql`
      SELECT COALESCE(MAX(sort_order), -1)::int AS max_order
      FROM procedure_steps
      WHERE group_id = ${parsed.data.groupId}
    `;
    const nextOrder = Number(maxRows[0]?.max_order ?? -1) + 1;
    const primary = parsed.data.assignedUserIds[0];

    const { rows: inserted } = await sql`
      INSERT INTO procedure_steps (group_id, title, sort_order, assigned_user_id)
      VALUES (
        ${parsed.data.groupId},
        ${parsed.data.title.trim()},
        ${nextOrder},
        ${primary}
      )
      RETURNING id
    `;
    const stepId = inserted[0]?.id as string;
    for (const assigneeId of parsed.data.assignedUserIds) {
      await sql`
        INSERT INTO procedure_step_assignees (step_id, user_id)
        VALUES (${stepId}, ${assigneeId})
        ON CONFLICT DO NOTHING
      `;
    }

    revalidatePath(`/groups/${parsed.data.groupId}`);
    revalidatePath('/groups');
    return { success: true };
  } catch (error) {
    console.error('Error adding procedure step:', error);
    return { success: false, error: 'No se pudo añadir el paso.' };
  }
}

export async function setProcedureStrictOrder(groupId: string, requireStrictOrder: boolean) {
  const user = await getSessionUser();
  if (!isAdminOrEditor(user)) {
    return { success: false, error: 'No autorizado.' };
  }

  try {
    const { rows } = await sql`
      SELECT id, kind, is_template FROM task_groups WHERE id = ${groupId} LIMIT 1
    `;
    if (!rows.length || rows[0].kind !== 'procedure' || rows[0].is_template !== true) {
      return { success: false, error: 'Solo se puede configurar en la plantilla.' };
    }

    await sql`
      UPDATE task_groups
      SET require_strict_order = ${requireStrictOrder}
      WHERE id = ${groupId}
    `;
    revalidatePath(`/groups/${groupId}`);
    return { success: true };
  } catch (error) {
    console.error('Error setting strict order:', error);
    return { success: false, error: 'No se pudo actualizar la configuración.' };
  }
}

export async function completeProcedure(groupId: string) {
  const user = await getSessionUser();
  if (!user) return { success: false, error: 'No autenticado.' };

  try {
    const { rows: groupRows } = await sql`
      SELECT id, kind, is_template FROM task_groups WHERE id = ${groupId} LIMIT 1
    `;
    if (!groupRows.length || groupRows[0].kind !== 'procedure') {
      return { success: false, error: 'Procedimiento no encontrado.' };
    }
    if (groupRows[0].is_template === true) {
      return {
        success: false,
        error: 'Completa una ejecución, no la plantilla.',
      };
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
      SET last_completed_at = NOW(),
          last_completed_by = ${user.id},
          run_status = 'completed'
      WHERE id = ${groupId}
    `;

    const { rows: meta } = await sql`
      SELECT template_id FROM task_groups WHERE id = ${groupId} LIMIT 1
    `;
    revalidatePath(`/groups/${groupId}`);
    revalidatePath('/groups');
    if (meta[0]?.template_id) {
      revalidatePath(`/groups/${meta[0].template_id}`);
    }
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
      SELECT id, kind, is_template, template_id FROM task_groups WHERE id = ${groupId} LIMIT 1
    `;
    if (!groupRows.length || groupRows[0].kind !== 'procedure') {
      return { success: false, error: 'Procedimiento no encontrado.' };
    }
    if (groupRows[0].is_template === true) {
      return {
        success: false,
        error: 'Reinicia una ejecución, no la plantilla.',
      };
    }

    await sql`
      UPDATE procedure_steps
      SET is_completed = FALSE, completed_at = NULL, completed_by = NULL
      WHERE group_id = ${groupId}
    `;
    await sql`
      UPDATE task_groups
      SET run_status = 'open', last_completed_at = NULL, last_completed_by = NULL
      WHERE id = ${groupId}
    `;

    revalidatePath(`/groups/${groupId}`);
    revalidatePath('/groups');
    const templateId = groupRows[0].template_id as string | null;
    if (templateId) revalidatePath(`/groups/${templateId}`);
    return { success: true };
  } catch (error) {
    console.error('Error resetting procedure steps:', error);
    return { success: false, error: 'No se pudieron reiniciar los pasos.' };
  }
}
