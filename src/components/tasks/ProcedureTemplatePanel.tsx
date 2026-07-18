'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProcedureStep, TaskGroup, User } from '@/types';
import { startProcedureRun } from '@/actions/task-groups';
import {
  addProcedureStep,
  setProcedureStrictOrder,
} from '@/actions/procedure-steps';
import { normalizeAssigneeIds } from '@/lib/procedure-permissions';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, ListChecks, Play, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface ProcedureTemplatePanelProps {
  template: TaskGroup;
  steps: ProcedureStep[];
  runs: TaskGroup[];
  users: User[];
  canManage: boolean;
  currentUserId?: string;
}

function stepAssigneeIds(step: ProcedureStep): string[] {
  return normalizeAssigneeIds(
    step.assignedUserIds?.length ? step.assignedUserIds : step.assignedUserId
  );
}

export function ProcedureTemplatePanel({
  template,
  steps,
  runs,
  users,
  canManage,
  currentUserId,
}: ProcedureTemplatePanelProps) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [runDate, setRunDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newTitle, setNewTitle] = useState('');
  const [newAssignees, setNewAssignees] = useState<string[]>(
    currentUserId ? [currentUserId] : []
  );
  const [adding, setAdding] = useState(false);
  const [strictPending, setStrictPending] = useState(false);
  const [strictOrder, setStrictOrder] = useState(!!template.requireStrictOrder);

  const userName = (id: string) => users.find((u) => u.id === id)?.name || 'Sin asignar';
  const openRuns = runs.filter((r) => r.runStatus !== 'completed');
  const todayRun = runs.find((r) => r.runDate === runDate);

  async function handleStart() {
    setStarting(true);
    const result = await startProcedureRun(template.id, runDate);
    if (result?.success && result.groupId) {
      if (result.alreadyExists) {
        toast.message('Ya existía una ejecución para esa fecha.');
      } else {
        toast.success('Ejecución iniciada.');
      }
      router.push(`/groups/${result.groupId}`);
    } else if (result?.error) {
      toast.error(result.error);
    }
    setStarting(false);
  }

  async function handleToggleStrict(checked: boolean) {
    setStrictPending(true);
    const result = await setProcedureStrictOrder(template.id, checked);
    if (result?.success) {
      setStrictOrder(checked);
      toast.success(
        checked ? 'Orden estricto activado.' : 'Orden estricto desactivado.'
      );
    } else if (result?.error) {
      toast.error(result.error);
    }
    setStrictPending(false);
  }

  async function handleAddStep(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || newAssignees.length === 0) return;
    setAdding(true);
    const result = await addProcedureStep({
      groupId: template.id,
      title: newTitle.trim(),
      assignedUserIds: newAssignees,
    });
    if (result?.success) {
      setNewTitle('');
      toast.success('Paso añadido a la plantilla.');
    } else if (result?.error) {
      toast.error(result.error);
    }
    setAdding(false);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" />
              Iniciar ejecución
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-xl">
              Crea una copia del procedimiento para una fecha. Los pasos empiezan en cero
              y cada persona marca los suyos. El cron diario también inicia
              automáticamente según la frecuencia de la plantilla.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-slate-500" htmlFor="run-date">
                Fecha
              </label>
              <input
                id="run-date"
                type="date"
                value={runDate}
                onChange={(e) => setRunDate(e.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm bg-white"
              />
            </div>
            <Button
              type="button"
              onClick={handleStart}
              disabled={starting || steps.length === 0}
              className="gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              {starting
                ? 'Iniciando...'
                : todayRun
                  ? 'Abrir ejecución'
                  : 'Iniciar para esta fecha'}
            </Button>
          </div>
        </div>
        {openRuns.length > 0 && (
          <p className="text-[11px] text-amber-800">
            Hay {openRuns.length} ejecución{openRuns.length !== 1 ? 'es' : ''} abierta
            {openRuns.length !== 1 ? 's' : ''}.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-primary" />
            Pasos de la plantilla ({steps.length})
          </h2>
          {canManage && (
            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={strictOrder}
                disabled={strictPending}
                onChange={(e) => handleToggleStrict(e.target.checked)}
                className="rounded border-slate-300"
              />
              Orden estricto
            </label>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Esta es la definición. No se marcan aquí: úsala al iniciar cada ejecución.
          {strictOrder
            ? ' Con orden estricto, en la ejecución no se puede saltar un paso.'
            : ''}
        </p>
        <ul className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
          {steps.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-slate-500">
              Añade al menos un paso para poder iniciar ejecuciones.
            </li>
          ) : (
            steps.map((step, index) => {
              const ids = stepAssigneeIds(step);
              return (
                <li key={step.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="text-xs font-bold text-slate-400 w-5 shrink-0 mt-0.5">
                    {index + 1}.
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{step.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {ids.map(userName).join(', ') || 'Sin asignar'}
                    </p>
                  </div>
                </li>
              );
            })
          )}
        </ul>

        {canManage && (
          <form
            onSubmit={handleAddStep}
            className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 space-y-2"
          >
            <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" />
              Añadir paso a la plantilla
            </p>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ej: Trapear pisos con detergente"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm bg-white"
              maxLength={500}
              required
            />
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {users.map((u) => {
                const checked = newAssignees.includes(u.id);
                return (
                  <label
                    key={u.id}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-600"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setNewAssignees((prev) =>
                          checked
                            ? prev.filter((id) => id !== u.id)
                            : [...prev, u.id]
                        );
                      }}
                      className="rounded border-slate-300"
                    />
                    {u.name}
                  </label>
                );
              })}
            </div>
            <Button
              type="submit"
              disabled={adding || newAssignees.length === 0}
              className="gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              {adding ? '...' : 'Añadir'}
            </Button>
          </form>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-800">Historial de ejecuciones</h2>
        {runs.length === 0 ? (
          <p className="text-xs text-slate-500 rounded-xl border border-slate-200 bg-white px-4 py-6 text-center">
            Aún no hay ejecuciones. Inicia la primera con el botón de arriba.
          </p>
        ) : (
          <ul className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
            {runs.map((run) => {
              const done = run.runStatus === 'completed';
              const progress = `${run.completedStepCount ?? 0}/${run.stepCount ?? 0}`;
              return (
                <li key={run.id}>
                  <Link
                    href={`/groups/${run.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {done ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-amber-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {run.runDate || run.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {done ? 'Completada' : 'Abierta'} · {progress} pasos
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0',
                        done
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      )}
                    >
                      {done ? 'Hecha' : 'En curso'}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
