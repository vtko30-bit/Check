'use client';

import { useMemo, useState } from 'react';
import { ProcedureStep, User } from '@/types';
import {
  completeProcedure,
  resetProcedureSteps,
  toggleProcedureStep,
} from '@/actions/procedure-steps';
import {
  canCompleteWithStrictOrder,
  canToggleProcedureStep,
  normalizeAssigneeIds,
} from '@/lib/procedure-permissions';
import { cn } from '@/lib/utils';
import { CheckSquare, ListChecks, RotateCcw, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface ProcedureChecklistProps {
  groupId: string;
  steps: ProcedureStep[];
  users: User[];
  currentUser?: { id: string; role: string };
  canManage: boolean;
  /** Ejecución ya cerrada: solo lectura. */
  readOnly?: boolean;
  requireStrictOrder?: boolean;
}

function stepAssigneeIds(step: ProcedureStep): string[] {
  return normalizeAssigneeIds(
    step.assignedUserIds?.length ? step.assignedUserIds : step.assignedUserId
  );
}

export function ProcedureChecklist({
  groupId,
  steps,
  users,
  currentUser,
  canManage,
  readOnly = false,
  requireStrictOrder = false,
}: ProcedureChecklistProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [filterMine, setFilterMine] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  const userMap = useMemo(
    () => new Map(users.map((u) => [u.id, u])),
    [users]
  );

  const sortedSteps = useMemo(
    () => [...steps].sort((a, b) => a.sortOrder - b.sortOrder),
    [steps]
  );

  const visibleSteps = filterMine && currentUser
    ? sortedSteps.filter((s) => stepAssigneeIds(s).includes(currentUser.id))
    : sortedSteps;

  const completedCount = steps.filter((s) => s.isCompleted).length;
  const total = steps.length;
  const allDone = total > 0 && completedCount === total;

  const myPending = currentUser
    ? steps.filter(
        (s) => stepAssigneeIds(s).includes(currentUser.id) && !s.isCompleted
      ).length
    : 0;

  function previousCompleted(step: ProcedureStep): boolean {
    return sortedSteps
      .filter((s) => s.sortOrder < step.sortOrder)
      .every((s) => s.isCompleted);
  }

  async function handleToggle(step: ProcedureStep) {
    if (readOnly) {
      toast.error('Esta ejecución ya está cerrada.');
      return;
    }
    if (!currentUser) return;
    const assignees = stepAssigneeIds(step);
    if (!canToggleProcedureStep(currentUser, assignees)) {
      toast.error('Solo las personas asignadas a este paso pueden marcarlo.');
      return;
    }
    if (
      !step.isCompleted &&
      !canCompleteWithStrictOrder(requireStrictOrder, previousCompleted(step))
    ) {
      toast.error('Debes completar los pasos anteriores primero (orden estricto).');
      return;
    }
    setPendingId(step.id);
    const result = await toggleProcedureStep(step.id);
    if (!result?.success && result?.error) {
      toast.error(result.error);
    }
    setPendingId(null);
  }

  async function handleComplete() {
    setActionPending(true);
    const result = await completeProcedure(groupId);
    if (result?.success) {
      toast.success('Procedimiento completado.');
    } else if (result?.error) {
      toast.error(result.error);
    }
    setActionPending(false);
  }

  async function handleReset() {
    if (!confirm('¿Reiniciar todos los pasos de este procedimiento?')) return;
    setActionPending(true);
    const result = await resetProcedureSteps(groupId);
    if (result?.success) {
      toast.success('Pasos reiniciados.');
    } else if (result?.error) {
      toast.error(result.error);
    }
    setActionPending(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3 min-w-0">
          <ListChecks className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Progreso: {completedCount}/{total}
            </p>
            <div className="mt-1.5 h-2 w-40 sm:w-56 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${total ? Math.round((completedCount / total) * 100) : 0}%` }}
              />
            </div>
            {currentUser && (
              <p className="text-[11px] text-slate-500 mt-1">
                Tus pendientes: {myPending}
                {requireStrictOrder ? ' · Orden estricto activo' : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterMine((v) => !v)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-colors',
              filterMine
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            {filterMine ? 'Ver todos' : 'Mis pasos'}
          </button>
          {canManage && !readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={actionPending}
              onClick={handleReset}
              className="gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reiniciar
            </Button>
          )}
          {!readOnly && (
            <Button
              type="button"
              size="sm"
              disabled={!allDone || actionPending}
              onClick={handleComplete}
              className="gap-1.5"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Completar procedimiento
            </Button>
          )}
          {readOnly && (
            <span className="text-xs font-semibold text-emerald-700 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-100">
              Ejecución completada
            </span>
          )}
        </div>
      </div>

      <ul className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
        {visibleSteps.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-slate-500">
            {filterMine
              ? 'No tienes pasos asignados en este procedimiento.'
              : 'Este procedimiento aún no tiene pasos.'}
          </li>
        ) : (
          visibleSteps.map((step) => {
            const assignees = stepAssigneeIds(step);
            const names = assignees
              .map((id) => userMap.get(id)?.name)
              .filter(Boolean)
              .join(', ');
            const isMine = currentUser
              ? assignees.includes(currentUser.id)
              : false;
            const blockedByOrder =
              !step.isCompleted &&
              !canCompleteWithStrictOrder(
                requireStrictOrder,
                previousCompleted(step)
              );
            const canToggle =
              !readOnly &&
              canToggleProcedureStep(currentUser, assignees) &&
              !blockedByOrder;
            const busy = pendingId === step.id;

            return (
              <li
                key={step.id}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 transition-colors',
                  step.isCompleted ? 'bg-emerald-50/40' : 'bg-white',
                  !canToggle && 'opacity-80'
                )}
              >
                <button
                  type="button"
                  disabled={!canToggle || busy}
                  onClick={() => handleToggle(step)}
                  className={cn(
                    'mt-0.5 p-1 rounded transition-colors shrink-0',
                    canToggle
                      ? 'hover:bg-slate-100 text-slate-600'
                      : 'cursor-not-allowed text-slate-300'
                  )}
                  aria-label={
                    step.isCompleted
                      ? `Desmarcar: ${step.title}`
                      : `Marcar: ${step.title}`
                  }
                  title={
                    blockedByOrder
                      ? 'Completa los pasos anteriores primero'
                      : canToggle
                        ? undefined
                        : 'Solo las personas asignadas pueden marcar este paso'
                  }
                >
                  {step.isCompleted ? (
                    <CheckSquare className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm font-medium text-slate-800',
                      step.isCompleted && 'line-through text-slate-500'
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {names || 'Sin asignar'}
                    {isMine ? ' · Tuyo' : ''}
                    {blockedByOrder ? ' · Esperando pasos previos' : ''}
                  </p>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
