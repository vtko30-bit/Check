export type ProcedureStepActor = { id: string; role: string };

/** Solo el asignado del paso (o admin/editor) puede marcar/desmarcar. */
export function canToggleProcedureStep(
  actor: ProcedureStepActor | null | undefined,
  assignedUserId: string | null | undefined
): boolean {
  if (!actor) return false;
  if (actor.role === 'admin' || actor.role === 'editor') return true;
  return !!assignedUserId && assignedUserId === actor.id;
}

export function getToggleProcedureStepPermission(
  actor: ProcedureStepActor | null | undefined,
  assignedUserId: string | null | undefined,
  stepExists: boolean
): { ok: true } | { ok: false; error: string } {
  if (!actor) return { ok: false, error: 'No autenticado.' };
  if (!stepExists) return { ok: false, error: 'Paso no encontrado.' };
  if (!canToggleProcedureStep(actor, assignedUserId)) {
    return {
      ok: false,
      error: 'Solo la persona asignada a este paso puede marcarlo.',
    };
  }
  return { ok: true };
}
