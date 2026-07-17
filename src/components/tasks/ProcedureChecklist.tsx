'use client';

import { useMemo, useState } from 'react';
import { ProcedureStep, User } from '@/types';
import {
  addProcedureStep,
  completeProcedure,
  resetProcedureSteps,
  toggleProcedureStep,
} from '@/actions/procedure-steps';
import { canToggleProcedureStep } from '@/lib/procedure-permissions';
import { cn } from '@/lib/utils';
import { CheckSquare, ListChecks, Plus, RotateCcw, Square } from 'lucide-react';
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
}

export function ProcedureChecklist({
  groupId,
  steps,
  users,
  currentUser,
  canManage,
  readOnly = false,
}: ProcedureChecklistProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [filterMine, setFilterMine] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState(currentUser?.id ?? '');
  const [adding, setAdding] = useState(false);
  const [actionPending, setActionPending] = useState(false);

  const userMap = useMemo(
    () => new Map(users.map((u) => [u.id, u])),
    [users]
  );

  const visibleSteps = filterMine && currentUser
    ? steps.filter((s) => s.assignedUserId === currentUser.id)
    : steps;

  const completedCount = steps.filter((s) => s.isCompleted).length;
  const total = steps.length;
  const allDone = total > 0 && completedCount === total;

  const myPending = currentUser
    ? steps.filter((s) => s.assignedUserId === currentUser.id && !s.isCompleted).length
    : 0;

  async function handleToggle(step: ProcedureStep) {
    if (readOnly) {
      toast.error('Esta ejecución ya está cerrada.');
      return;
    }
    if (!currentUser) return;
    if (!canToggleProcedureStep(currentUser, step.assignedUserId)) {
      toast.error('Solo la persona asignada a este paso puede marcarlo.');
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

  async function handleAddStep(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newAssignee) return;
    setAdding(true);
    const result = await addProcedureStep({
      groupId,
      title: newTitle.trim(),
      assignedUserId: newAssignee,
    });
    if (result?.success) {
      setNewTitle('');
      toast.success('Paso añadido.');
    } else if (result?.error) {
      toast.error(result.error);
    }
    setAdding(false);
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
            const assignee = userMap.get(step.assignedUserId);
            const canToggle =
              !readOnly && canToggleProcedureStep(currentUser, step.assignedUserId);
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
                    canToggle
                      ? undefined
                      : 'Solo la persona asignada puede marcar este paso'
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
                    {assignee?.name || 'Sin asignar'}
                    {currentUser?.id === step.assignedUserId ? ' · Tuyo' : ''}
                  </p>
                </div>
              </li>
            );
          })
        )}
      </ul>

      {canManage && !readOnly && (
        <form
          onSubmit={handleAddStep}
          className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 space-y-2"
        >
          <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            Añadir paso
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ej: Trapear pisos con detergente"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white"
              maxLength={500}
              required
            />
            <select
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white"
              required
            >
              <option value="">Responsable...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={adding} className="gap-1">
              <Plus className="w-3.5 h-3.5" />
              {adding ? '...' : 'Añadir'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
