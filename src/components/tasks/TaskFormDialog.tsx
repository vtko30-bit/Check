'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTask, updateTask } from '@/actions/tasks';
import { Plus, Calendar as CalendarIcon, User as UserIcon, FileText, RefreshCw, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { User, Task } from '@/types';
import { VoiceInputButton } from '@/components/tasks/VoiceInputButton';

const TITLE_MAX_LENGTH = 80;

function truncateTitle(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= TITLE_MAX_LENGTH) return trimmed;
  return trimmed.slice(0, TITLE_MAX_LENGTH).trimEnd();
}

interface TaskFormDialogProps {
  users: User[];
  task?: Task; // Optional task for edit mode
  trigger?: React.ReactNode; // Custom trigger
  currentUser?: { id?: string; role?: string; name?: string | null; email?: string | null; image?: string | null };
  groupId?: string; // Opcional: asignar tarea a un grupo/carpeta
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultAssignedUserId?: string;
  defaultFrequency?: string;
  defaultDeadline?: string;
  onTaskCreated?: (groupId?: string) => void;
}

export function TaskFormDialog({
  users,
  task,
  trigger,
  currentUser,
  groupId,
  open: controlledOpen,
  onOpenChange,
  defaultAssignedUserId,
  defaultFrequency,
  defaultDeadline,
  onTaskCreated,
}: TaskFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frequency, setFrequency] = useState(
    task?.frequency === 'monday'
      ? 'weekly_1'
      : (task?.frequency || defaultFrequency || 'one_time')
  );
  const [description, setDescription] = useState(task?.description ?? '');
  const [title, setTitle] = useState(task?.title ?? '');

  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const isDateRange = frequency === 'date_range';
  const lockedFromList = !!groupId && !!defaultAssignedUserId && !!defaultFrequency && !!defaultDeadline;

  useEffect(() => {
    if (open) {
      setError(null);
      setTitle(task?.title ?? '');
      setDescription(task?.description ?? '');
      setFrequency(
        task?.frequency === 'monday'
          ? 'weekly_1'
          : (task?.frequency || defaultFrequency || 'one_time')
      );
    }
  }, [open, task?.title, task?.description, task?.frequency, defaultFrequency]);
  const isEdit = !!task;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsLoading(true);

    // Si se abre desde un grupo, forzamos el groupId para que la tarea viva dentro de esa "carpeta"
    if (groupId) {
      formData.set('groupId', groupId);
    } else if (task && (task as any).groupId) {
      // Mantener el grupo actual al editar, aunque el formulario no lo exponga
      formData.set('groupId', (task as any).groupId as string);
    }

    // Esta vista simplificada no gestiona subtareas; enviamos una lista vacía
    formData.set('subtasks', JSON.stringify([]));
    
    try {
      let result: { success?: boolean; error?: string } | void;
      if (isEdit && task) {
        result = await updateTask(task.id, formData);
      } else {
        result = await createTask(formData);
      }
      if (result && !result.success && result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setOpen(false);
      toast.success(isEdit ? 'Tarea actualizada' : 'Tarea creada');
      if (!isEdit && onTaskCreated) {
        onTaskCreated(groupId);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null); }}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          {trigger || (
            <Button className="gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              Nueva Tarea
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden border border-slate-200/70 bg-gradient-to-b from-slate-50 to-white shadow-2xl dark:from-slate-900 dark:to-slate-950 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-100/80 dark:border-slate-800/80 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-slate-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-3">
              <div className="w-9 h-9 bg-primary shadow-sm shadow-primary/40 rounded-xl flex items-center justify-center text-white">
                {isEdit ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              {isEdit ? 'Editar Tarea' : 'Nueva Tarea'}
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <p className="mb-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
              {error}
            </p>
          )}
          <div className="space-y-5 max-h-[65vh] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent dark:scrollbar-thumb-slate-700">
            {/* Titulo */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="title" className="text-slate-700 dark:text-slate-100 font-semibold flex items-center gap-2 text-sm">
                  <FileText className="w-3.5 h-3.5" /> Titulo
                </Label>
                <VoiceInputButton
                  disabled={isLoading}
                  onTranscription={(text) => {
                    const next = truncateTitle(text);
                    setTitle(next);
                    if (text.trim().length > TITLE_MAX_LENGTH) {
                      toast.info(`Título limitado a ${TITLE_MAX_LENGTH} caracteres`);
                    } else {
                      toast.success('Título dictado');
                    }
                  }}
                />
              </div>
              <Input
                id="title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX_LENGTH))}
                maxLength={TITLE_MAX_LENGTH}
                placeholder="Nombre de la tarea..."
                className="h-12 border-slate-200/80 dark:border-slate-700 focus:border-primary focus:ring-4 focus:ring-primary/15 text-base font-medium shadow-sm shadow-slate-100 dark:shadow-none transition-all bg-white dark:bg-slate-900/80"
                required
              />
              <p className="text-xs text-slate-400 text-right">
                {title.length}/{TITLE_MAX_LENGTH}
              </p>
            </div>

            {/* Asignación */}
            <div className="space-y-1.5">
              <Label htmlFor="assignedUserId" className="text-slate-700 dark:text-slate-100 font-semibold flex items-center gap-2 text-sm">
                <UserIcon className="w-3.5 h-3.5" /> Asignar a
              </Label>
              {lockedFromList ? (
                <>
                  <p className="text-xs text-slate-600 dark:text-slate-300 px-2 py-1 bg-slate-50 dark:bg-slate-900/60 rounded-md border border-slate-100 dark:border-slate-800">
                    {users.find(u => u.id === (defaultAssignedUserId || currentUser?.id))?.name || '—'}
                  </p>
                  <input
                    type="hidden"
                    name="assignedUserId"
                    value={defaultAssignedUserId || currentUser?.id || ''}
                  />
                </>
              ) : (
                <select
                  id="assignedUserId"
                  name="assignedUserId"
                  defaultValue={task?.assignedUserId || defaultAssignedUserId || currentUser?.id || ''}
                  className="flex h-11 w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-slate-900/80 dark:border-slate-700"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              )}
            </div>

            {/* Frecuencia */}
            <div className="space-y-1.5">
              <Label htmlFor="frequency" className="text-slate-700 dark:text-slate-100 font-semibold flex items-center gap-2 text-sm">
                <RefreshCw className="w-3.5 h-3.5" /> Frecuencia
              </Label>
              {lockedFromList ? (
                <>
                  <p className="text-xs text-slate-600 dark:text-slate-300 px-2 py-1 bg-slate-50 dark:bg-slate-900/60 rounded-md border border-slate-100 dark:border-slate-800">
                    {defaultFrequency === 'permanent' ? 'Frecuente / permanente' : 'Una vez'}
                  </p>
                  <input type="hidden" name="frequency" value={defaultFrequency || 'one_time'} />
                </>
              ) : (
                <select
                  id="frequency"
                  name="frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-slate-900/80 dark:border-slate-700"
                >
                  <option value="one_time">Una vez</option>
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal (mismo día que vencimiento)</option>
                  <option value="weekly_0">Semanal - Domingos</option>
                  <option value="weekly_1">Semanal - Lunes</option>
                  <option value="weekly_2">Semanal - Martes</option>
                  <option value="weekly_3">Semanal - Miércoles</option>
                  <option value="weekly_4">Semanal - Jueves</option>
                  <option value="weekly_5">Semanal - Viernes</option>
                  <option value="weekly_6">Semanal - Sábados</option>
                  <option value="monthly">Mensual</option>
                  <option value="date_range">Rango de Fechas</option>
                </select>
              )}
            </div>

            {/* Vencimiento o rango */}
            <div className="space-y-1.5">
              {lockedFromList ? (
                <>
                  <Label className="text-slate-700 dark:text-slate-100 font-semibold flex items-center gap-2 text-sm">
                    <CalendarIcon className="w-3.5 h-3.5" /> Vencimiento
                  </Label>
                  <p className="text-xs text-slate-600 dark:text-slate-300 px-2 py-1 bg-slate-50 dark:bg-slate-900/60 rounded-md border border-slate-100 dark:border-slate-800">
                    {defaultDeadline || '—'}
                  </p>
                  <input type="hidden" name="deadline" value={defaultDeadline || ''} />
                </>
              ) : isDateRange ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate" className="text-slate-700 dark:text-slate-100 font-semibold flex items-center gap-2 text-sm">
                      <CalendarIcon className="w-3.5 h-3.5" /> Desde
                    </Label>
                    <Input
                      id="startDate"
                      name="startDate"
                      type="date"
                      defaultValue={task?.startDate}
                      className="h-11 border-slate-200/80 focus:border-primary focus:ring-primary/20 rounded-lg bg-white dark:bg-slate-900/80 dark:border-slate-700"
                      required={isDateRange}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="deadline" className="text-slate-700 dark:text-slate-100 font-semibold flex items-center gap-2 text-sm">
                      <CalendarIcon className="w-3.5 h-3.5" /> Hasta
                    </Label>
                    <Input
                      id="deadline"
                      name="deadline"
                      type="date"
                      defaultValue={task?.deadline || defaultDeadline || ''}
                      className="h-11 border-slate-200/80 focus:border-primary focus:ring-primary/20 rounded-lg bg-white dark:bg-slate-900/80 dark:border-slate-700"
                      required
                    />
                  </div>
                </div>
              ) : (
                <>
                  <Label htmlFor="deadline" className="text-slate-700 dark:text-slate-100 font-semibold flex items-center gap-2 text-sm">
                    <CalendarIcon className="w-3.5 h-3.5" /> Vencimiento
                  </Label>
                  <Input
                    id="deadline"
                    name="deadline"
                    type="date"
                    defaultValue={task?.deadline || defaultDeadline || ''}
                    className="h-11 border-slate-200/80 focus:border-primary focus:ring-primary/20 rounded-lg bg-white dark:bg-slate-900/80 dark:border-slate-700"
                    required
                  />
                </>
              )}
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="description" className="text-slate-700 dark:text-slate-100 font-semibold flex items-center gap-2 text-sm">
                  Descripción
                </Label>
                <VoiceInputButton
                  disabled={isLoading}
                  onTranscription={(text) => {
                    setDescription((prev) => (prev ? `${prev.trimEnd()} ${text}` : text));
                    toast.success('Texto dictado añadido');
                  }}
                />
              </div>
              <textarea
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalles adicionales..."
                className="flex min-h-[80px] w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none dark:bg-slate-900/80 dark:border-slate-700"
              />
            </div>

            {/* Prioridad */}
            <div className="flex items-center gap-2 py-2 px-3 bg-gradient-to-r from-red-50 via-rose-50 to-transparent rounded-xl border border-red-100/70 group cursor-pointer dark:from-red-950/40 dark:via-red-900/20 dark:border-red-900/60">
              <input 
                type="checkbox" 
                id="priority" 
                name="priority" 
                value="urgent"
                defaultChecked={task?.priority === 'urgent'}
                className="w-4 h-4 rounded text-red-500 focus:ring-red-500 border-red-300"
              />
              <label htmlFor="priority" className="text-sm font-bold text-red-700 cursor-pointer select-none">
                Marcar como Urgente
              </label>
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-slate-100/80 dark:border-slate-800 mt-6 -mx-6 px-6 bg-slate-50/40 dark:bg-slate-900/60">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isLoading} className="rounded-lg">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="px-8 rounded-lg shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90"
            >
              {isLoading ? (isEdit ? 'Guardando...' : 'Creando...') : (isEdit ? 'Guardar Cambios' : 'Crear Tarea')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

  );
}
