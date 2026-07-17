import { queryPg } from '@/lib/db-pg';
import { withPgTransaction } from '@/lib/db-transaction';
import { insertNotificationsForUsers } from '@/lib/notifications-db';
import { shouldAutoStartProcedureToday } from '@/lib/procedure-schedule';

export type StartRunResult =
  | { success: true; groupId: string; alreadyExists: boolean; created: boolean }
  | { success: false; error: string };

function formatRunLabel(templateName: string, runDate: string) {
  const [y, m, d] = runDate.split('-').map(Number);
  const label = new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${templateName} · ${label}`;
}

/** Crea (o reutiliza) una ejecución de plantilla. Uso interno / cron / server action. */
export async function createProcedureRunFromTemplate(
  templateId: string,
  runDate: string,
  createdByUserId: string | null
): Promise<StartRunResult> {
  const templates = await queryPg<{
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    supervisor_user_id: string | null;
    list_type: string | null;
  }>(
    `SELECT id, name, description, color, supervisor_user_id, list_type
     FROM task_groups
     WHERE id = $1 AND kind = 'procedure' AND is_template IS TRUE
     LIMIT 1`,
    [templateId]
  );

  if (!templates.length) {
    return { success: false, error: 'Plantilla de procedimiento no encontrada.' };
  }
  const template = templates[0];

  const existing = await queryPg<{ id: string }>(
    `SELECT id FROM task_groups
     WHERE template_id = $1 AND run_date = $2
     LIMIT 1`,
    [templateId, runDate]
  );
  if (existing.length > 0) {
    return {
      success: true,
      groupId: existing[0].id,
      alreadyExists: true,
      created: false,
    };
  }

  const templateSteps = await queryPg<{
    title: string;
    sort_order: number;
    assigned_user_id: string;
  }>(
    `SELECT title, sort_order, assigned_user_id
     FROM procedure_steps
     WHERE group_id = $1
     ORDER BY sort_order ASC, created_at ASC`,
    [templateId]
  );

  if (templateSteps.length === 0) {
    return {
      success: false,
      error: 'La plantilla no tiene pasos. Añade pasos antes de iniciar una ejecución.',
    };
  }

  const creatorId =
    createdByUserId ||
    template.supervisor_user_id ||
    (
      await queryPg<{ id: string }>(
        `SELECT id FROM users WHERE role = 'admin' AND is_active IS NOT FALSE LIMIT 1`
      )
    )[0]?.id;

  if (!creatorId) {
    return { success: false, error: 'No hay un usuario creador disponible para la ejecución.' };
  }

  const runName = formatRunLabel(template.name, runDate);

  const runId = await withPgTransaction(async (query) => {
    const runResult = await query<{ id: string }>(
      `INSERT INTO task_groups (
         name, description, color, created_by, supervisor_user_id,
         list_type, due_date, kind, is_template, template_id, run_date, run_status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'procedure', FALSE, $8, $9, 'open')
       RETURNING id`,
      [
        runName,
        template.description || null,
        template.color || '#0f766e',
        creatorId,
        template.supervisor_user_id || null,
        template.list_type || 'one_time',
        runDate,
        templateId,
        runDate,
      ]
    );
    const id = runResult.rows[0]?.id;
    if (!id) throw new Error('No se pudo crear la ejecución.');

    for (const step of templateSteps) {
      await query(
        `INSERT INTO procedure_steps (group_id, title, sort_order, assigned_user_id, is_completed)
         VALUES ($1, $2, $3, $4, FALSE)`,
        [id, step.title, step.sort_order, step.assigned_user_id]
      );
    }
    return id;
  });

  return {
    success: true,
    groupId: runId,
    alreadyExists: false,
    created: true,
  };
}

export async function notifyProcedureRunAssignees(
  runId: string,
  templateName: string,
  runDate: string
): Promise<number> {
  const assignees = await queryPg<{ assigned_user_id: string }>(
    `SELECT DISTINCT assigned_user_id
     FROM procedure_steps
     WHERE group_id = $1`,
    [runId]
  );

  const userIds = [
    ...new Set(
      assignees
        .map((r) => r.assigned_user_id)
        .filter(Boolean)
    ),
  ];

  if (userIds.length === 0) return 0;

  const [y, m, d] = runDate.split('-').map(Number);
  const dateLabel = new Date(y, (m || 1) - 1, d || 1).toLocaleDateString('es-CL');
  const safeName =
    templateName.length > 80 ? `${templateName.slice(0, 77)}...` : templateName;

  await insertNotificationsForUsers(
    userIds,
    `Nueva ejecución de procedimiento: "${safeName}" (${dateLabel}). Revisa tus pasos asignados.`
  );

  return userIds.length;
}

/** Genera ejecuciones del día según la frecuencia de cada plantilla. */
export async function runAutoStartProcedureRuns(today?: string): Promise<{
  success: boolean;
  started: number;
  skipped: number;
  notified: number;
  error?: string;
}> {
  const date = today || new Date().toISOString().split('T')[0];

  try {
    const templates = await queryPg<{
      id: string;
      name: string;
      list_type: string | null;
      due_date: string | null;
    }>(
      `SELECT id, name, list_type, due_date::text AS due_date
       FROM task_groups
       WHERE kind = 'procedure'
         AND is_template IS TRUE`
    );

    let started = 0;
    let skipped = 0;
    let notified = 0;

    for (const template of templates) {
      const dueDate = template.due_date
        ? template.due_date.slice(0, 10)
        : null;

      if (!shouldAutoStartProcedureToday(template.list_type, dueDate, date)) {
        skipped++;
        continue;
      }

      const result = await createProcedureRunFromTemplate(template.id, date, null);
      if (!result.success) {
        console.error(`Auto-start failed for ${template.id}:`, result.error);
        skipped++;
        continue;
      }

      if (result.created) {
        started++;
        notified += await notifyProcedureRunAssignees(
          result.groupId,
          template.name,
          date
        );
      } else {
        skipped++;
      }
    }

    return { success: true, started, skipped, notified };
  } catch (error) {
    console.error('runAutoStartProcedureRuns error:', error);
    return {
      success: false,
      started: 0,
      skipped: 0,
      notified: 0,
      error: error instanceof Error ? error.message : 'Error al autoiniciar procedimientos',
    };
  }
}

/** Avisa a responsables de pasos pendientes en ejecuciones abiertas del día. */
export async function notifyIncompleteProcedureRuns(today?: string): Promise<{
  success: boolean;
  runsChecked: number;
  notified: number;
  error?: string;
}> {
  const date = today || new Date().toISOString().split('T')[0];

  try {
    const openRuns = await queryPg<{
      id: string;
      name: string;
      run_date: string | null;
    }>(
      `SELECT id, name, run_date::text AS run_date
       FROM task_groups
       WHERE kind = 'procedure'
         AND is_template IS NOT TRUE
         AND (run_status IS NULL OR run_status = 'open')
         AND run_date = $1`,
      [date]
    );

    let notified = 0;

    for (const run of openRuns) {
      const pending = await queryPg<{ assigned_user_id: string }>(
        `SELECT DISTINCT assigned_user_id
         FROM procedure_steps
         WHERE group_id = $1 AND is_completed IS NOT TRUE`,
        [run.id]
      );

      if (pending.length === 0) continue;

      const userIds = [...new Set(pending.map((p) => p.assigned_user_id).filter(Boolean))];
      const safeName = run.name.length > 80 ? `${run.name.slice(0, 77)}...` : run.name;

      await insertNotificationsForUsers(
        userIds,
        `Procedimiento pendiente: "${safeName}". Aún tienes pasos por completar.`
      );
      notified += userIds.length;
    }

    return { success: true, runsChecked: openRuns.length, notified };
  } catch (error) {
    console.error('notifyIncompleteProcedureRuns error:', error);
    return {
      success: false,
      runsChecked: 0,
      notified: 0,
      error: error instanceof Error ? error.message : 'Error al notificar procedimientos incompletos',
    };
  }
}
