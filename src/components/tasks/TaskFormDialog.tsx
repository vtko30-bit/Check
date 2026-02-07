'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTask, updateTask } from '@/actions/tasks';
import { Plus, X, ListTodo, Calendar as CalendarIcon, User as UserIcon, FileText, StickyNote, RefreshCw, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { SubTask, User, Task } from '@/types';

interface TaskFormDialogProps {
  users: User[];
  task?: Task; // Optional task for edit mode
  trigger?: React.ReactNode; // Custom trigger
  currentUser?: { id: string; role: string; name?: string | null; email?: string | null; image?: string | null };
}

export function TaskFormDialog({ users, task, trigger, currentUser }: TaskFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<{title: string}[]>(task?.subtasks?.map(st => ({ title: st.title })) || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [frequency, setFrequency] = useState(
    task?.frequency === 'monday' ? 'weekly_1' : (task?.frequency || 'one_time')
  );

  const isAdmin = currentUser?.role === 'admin';
  const isDateRange = frequency === 'date_range';

  useEffect(() => {
    if (open) setFrequency(task?.frequency === 'monday' ? 'weekly_1' : (task?.frequency || 'one_time'));
  }, [open, task?.frequency]);
  const isEdit = !!task;

  const addSubtaskToList = () => {
    const title = newSubtaskTitle.trim();
    if (!title) return;
    const exists = subtasks.some(st => st.title.toLowerCase() === title.toLowerCase());
    if (exists) {
      toast.error('Ya existe una subtarea con ese nombre');
      return;
    }
    setSubtasks([...subtasks, { title }]);
    setNewSubtaskTitle('');
  };

  const removeSubtaskFromList = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsLoading(true);

    // If not admin, force assignment to self
    if (!isAdmin && currentUser?.id) {
      formData.set('assignedUserId', currentUser.id);
    }

    // Add subtasks to formData as JSON with IDs (deduplicar por título)
    const seen = new Set<string>();
    const subtasksWithIds: SubTask[] = subtasks
      .filter(st => {
        const key = st.title.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(st => {
        const existing = task?.subtasks?.find(est => est.title.toLowerCase() === st.title.toLowerCase());
        return {
          id: existing?.id || crypto.randomUUID(),
          title: st.title.trim(),
          completed: existing?.completed || false
        };
      });
    formData.append('subtasks', JSON.stringify(subtasksWithIds));
    
    try {
      let result: { success?: boolean; error?: string } | void;
      if (isEdit && task) {
        result = await updateTask(task.id, formData);
      } else {
        result = await createTask(formData);
      }
      if (result && !result.success && result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      if (!isEdit) setSubtasks([]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            Nueva Tarea
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none shadow-2xl bg-white">
        <div className="bg-primary/5 px-6 py-4 border-b border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
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
          <div className="space-y-5 max-h-[60vh] overflow-y-auto px-1">
            {/* Titulo */}
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-slate-600 font-semibold flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Titulo
              </Label>
              <Input 
                id="title" 
                name="title" 
                defaultValue={task?.title}
                placeholder="Nombre de la tarea..." 
                className="h-14 border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 text-lg font-medium shadow-sm transition-all" 
                required 
              />
            </div>

            {/* Asignación */}
            <div className="space-y-1.5">
              <Label htmlFor="assignedUserId" className="text-slate-600 font-semibold flex items-center gap-2">
                <UserIcon className="w-3.5 h-3.5" /> Asignar a
              </Label>
              <select 
                id="assignedUserId" 
                name="assignedUserId" 
                defaultValue={task?.assignedUserId || currentUser?.id}
                disabled={!isAdmin}
                className="flex h-12 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed" 
                required
              >
                <option value="">Seleccionar...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>

            {/* Frecuencia */}
            <div className="space-y-1.5">
              <Label htmlFor="frequency" className="text-slate-600 font-semibold flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5" /> Frecuencia
              </Label>
              <select 
                id="frequency" 
                name="frequency" 
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="flex h-12 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" 
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
                <option value="date_range">Rango de fechas</option>
              </select>
            </div>

            {/* Fechas: una sola o rango según frecuencia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isDateRange ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate" className="text-slate-600 font-semibold flex items-center gap-2">
                      <CalendarIcon className="w-3.5 h-3.5" /> Desde
                    </Label>
                    <Input 
                      id="startDate" 
                      name="startDate" 
                      type="date" 
                      defaultValue={task?.startDate}
                      className="h-12 border-slate-200 focus:border-primary focus:ring-primary/20" 
                      required={isDateRange}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="deadline" className="text-slate-600 font-semibold flex items-center gap-2">
                      <CalendarIcon className="w-3.5 h-3.5" /> Hasta
                    </Label>
                    <Input 
                      id="deadline" 
                      name="deadline" 
                      type="date" 
                      defaultValue={task?.deadline}
                      className="h-12 border-slate-200 focus:border-primary focus:ring-primary/20" 
                      required 
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="deadline" className="text-slate-600 font-semibold flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5" /> Vencimiento
                  </Label>
                  <Input 
                    id="deadline" 
                    name="deadline" 
                    type="date" 
                    defaultValue={task?.deadline}
                    className="h-12 border-slate-200 focus:border-primary focus:ring-primary/20" 
                    required 
                  />
                </div>
              )}
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-slate-600 font-semibold flex items-center gap-2">
                <StickyNote className="w-3.5 h-3.5" /> Descripción
              </Label>
              <textarea 
                id="description" 
                name="description" 
                defaultValue={task?.description}
                placeholder="Detalles adicionales..."
                className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" 
              />
            </div>

            {/* Prioridad */}
            <div className="flex items-center gap-2 py-2 px-3 bg-red-50 rounded-lg border border-red-100/50 group cursor-pointer">
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

            {/* Subtareas */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <Label className="text-slate-600 font-semibold flex items-center gap-2">
                <ListTodo className="w-3.5 h-3.5" /> Checklist (Subtareas)
              </Label>
              
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Ej: Revisar puertas..." 
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtaskToList())}
                  className="border-slate-200 h-12 text-sm"
                />
                <Button type="button" size="sm" variant="outline" onClick={addSubtaskToList} className="h-12 px-4">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {subtasks.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-2 space-y-1 border border-slate-100">
                  {subtasks.map((st, i) => (
                    <div key={i} className="flex items-center justify-between group bg-white px-3 py-1.5 rounded border border-slate-100 shadow-sm animate-in fade-in slide-in-from-left-2 duration-200">
                      <span className="text-xs text-slate-700 font-medium">{st.title}</span>
                      <button 
                        type="button"
                        onClick={() => removeSubtaskFromList(i)}
                        className="text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Notas opcionales */}
            <div className="space-y-1.5 opacity-60 hover:opacity-100 transition-opacity">
               <Label htmlFor="notes" className="text-xs font-semibold">Notas administrativas</Label>
               <textarea 
                id="notes" 
                name="notes" 
                defaultValue={task?.notes}
                placeholder="..." 
                className="w-full text-xs p-2 border border-slate-100 rounded-md bg-slate-50 focus:outline-none focus:bg-white transition-colors" 
              />
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 mt-6 -mx-6 px-6">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="px-8 shadow-teal-200 shadow-lg">
              {isLoading ? (isEdit ? 'Guardando...' : 'Creando...') : (isEdit ? 'Guardar Cambios' : 'Crear Tarea')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

  );
}
