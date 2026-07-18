export type ProcedureStepActor = { id: string; role: string };

/** Cualquiera de los asignados del paso (o admin/editor) puede marcar/desmarcar. */
export function canToggleProcedureStep(
  actor: ProcedureStepActor | null | undefined,
  assignedUserIds: string[] | string | null | undefined
): boolean {
  if (!actor) return false;
  if (actor.role === 'admin' || actor.role === 'editor') return true;
  const ids = normalizeAssigneeIds(assignedUserIds);
  return ids.includes(actor.id);
}

export function getToggleProcedureStepPermission(
  actor: ProcedureStepActor | null | undefined,
  assignedUserIds: string[] | string | null | undefined,
  stepExists: boolean
): { ok: true } | { ok: false; error: string } {
  if (!actor) return { ok: false, error: 'No autenticado.' };
  if (!stepExists) return { ok: false, error: 'Paso no encontrado.' };
  if (!canToggleProcedureStep(actor, assignedUserIds)) {
    return {
      ok: false,
      error: 'Solo las personas asignadas a este paso pueden marcarlo.',
    };
  }
  return { ok: true };
}

export function normalizeAssigneeIds(
  assignedUserIds: string[] | string | null | undefined
): string[] {
  if (!assignedUserIds) return [];
  if (typeof assignedUserIds === 'string') {
    return assignedUserIds ? [assignedUserIds] : [];
  }
  return [...new Set(assignedUserIds.filter(Boolean))];
}

/** Si hay orden estricto, no se puede completar un paso con anteriores pendientes. */
export function canCompleteWithStrictOrder(
  requireStrictOrder: boolean,
  previousStepsCompleted: boolean
): boolean {
  if (!requireStrictOrder) return true;
  return previousStepsCompleted;
}
