export type TaskActor = { id: string; role: string };

export function canUserModifyTask(
  actor: TaskActor,
  assignedUserId: string | null | undefined
): boolean {
  if (actor.role === 'admin') return true;
  return assignedUserId === actor.id;
}

export function getModifyTaskPermission(
  actor: TaskActor | null | undefined,
  assignedUserId: string | null | undefined,
  taskExists: boolean
): { ok: true } | { ok: false; error: string } {
  if (!actor) return { ok: false, error: 'No autenticado' };
  if (!taskExists) return { ok: false, error: 'Tarea no encontrada' };
  if (!canUserModifyTask(actor, assignedUserId)) {
    return { ok: false, error: 'No tienes permiso para modificar esta tarea' };
  }
  return { ok: true };
}
