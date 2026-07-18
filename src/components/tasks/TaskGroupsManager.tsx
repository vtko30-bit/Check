'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TaskGroup, User } from '@/types';
import {
  bulkDeleteTaskGroups,
  createProcedure,
  createTaskGroup,
  deleteTaskGroup,
  updateTaskGroup,
} from '@/actions/task-groups';
import { TASK_FREQUENCY_OPTIONS, type TaskFrequency } from '@/lib/task-validation';
import { cn } from '@/lib/utils';
import {
  Calendar as CalendarIcon,
  CheckSquare,
  FolderKanban,
  ListChecks,
  Plus,
  Square,
  Trash2,
  User as UserIcon,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import type { TaskGroupKind } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

const DEFAULT_COLOR = '#0f766e';
const COLOR_OPTIONS = ['#0f766e', '#0ea5e9', '#eab308', '#f97316', '#6366f1'];

interface TaskGroupsManagerProps {
  groups: TaskGroup[];
  canManage: boolean;
  users: User[];
  currentUser?: { id: string; role: string; name?: string | null; email?: string | null; image?: string | null };
}

export function TaskGroupsManager({ groups, canManage, users, currentUser }: TaskGroupsManagerProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_COLOR);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState<string>(DEFAULT_COLOR);
  const [editPending, setEditPending] = useState(false);
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [supervisorUserId, setSupervisorUserId] = useState(currentUser?.id ?? '');
  const [listType, setListType] = useState<TaskFrequency>('one_time');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [createKind, setCreateKind] = useState<TaskGroupKind>('procedure');
  const [requireStrictOrder, setRequireStrictOrder] = useState(false);
  const [procedureSteps, setProcedureSteps] = useState<
    { title: string; assignedUserIds: string[] }[]
  >([{ title: '', assignedUserIds: currentUser?.id ? [currentUser.id] : [] }]);
  const [createdTaskDefaults, setCreatedTaskDefaults] = useState<{
    assignedUserId: string;
    frequency: string;
    deadline: string;
    startDate?: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectableGroups = groups.filter((g) => g.id !== editingId);
  const isAllSelected =
    selectableGroups.length > 0 && selectedIds.size === selectableGroups.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < selectableGroups.length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableGroups.map((g) => g.id)));
    }
  }

  const isDateRange = listType === 'date_range';

  function resetCreateForm() {
    setSelectedColor(DEFAULT_COLOR);
    setSupervisorUserId(currentUser?.id ?? '');
    setListType('one_time');
    setDueDate('');
    setStartDate('');
    setCreateKind('procedure');
    setRequireStrictOrder(false);
    setProcedureSteps([
      { title: '', assignedUserIds: currentUser?.id ? [currentUser.id] : [] },
    ]);
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canManage) return;
    setPending(true);
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set('color', selectedColor);
    formData.set('supervisorUserId', supervisorUserId);
    formData.set('listType', listType);
    formData.set('dueDate', dueDate);

    if (createKind === 'procedure') {
      const steps = procedureSteps
        .map((s) => ({
          title: s.title.trim(),
          assignedUserIds: s.assignedUserIds,
        }))
        .filter((s) => s.title.length > 0);
      if (steps.length === 0) {
        setError('Añade al menos un paso con título.');
        setPending(false);
        return;
      }
      if (steps.some((s) => s.assignedUserIds.length === 0)) {
        setError('Cada paso debe tener al menos un responsable.');
        setPending(false);
        return;
      }

      const result = await createProcedure({
        name: String(formData.get('name') || ''),
        description: String(formData.get('description') || ''),
        color: selectedColor,
        supervisorUserId,
        listType,
        dueDate,
        requireStrictOrder,
        steps,
      });

      if (!result?.success && result?.error) {
        setError(result.error);
      } else {
        form.reset();
        resetCreateForm();
        setShowCreateDialog(false);
        if (result?.groupId) {
          toast.success('Plantilla de procedimiento creada.');
          router.push(`/groups/${result.groupId}`);
        }
      }
      setPending(false);
      return;
    }

    const taskDefaults = {
      assignedUserId: supervisorUserId,
      frequency: listType,
      deadline: dueDate,
      startDate: isDateRange ? startDate : undefined,
    };
    const result = await createTaskGroup(formData);
    if (!result?.success && result?.error) {
      setError(result.error);
    } else {
      setCreatedTaskDefaults(taskDefaults);
      form.reset();
      resetCreateForm();
      setShowCreateDialog(false);
      if (result?.groupId) {
        setCreatedGroupId(result.groupId);
        setShowTaskDialog(true);
      }
    }
    setPending(false);
  }

  async function handleDelete(id: string) {
    if (!canManage) return;
    if (!confirm('¿Eliminar este grupo? Sus tareas volverán a la lista principal.')) return;
    const result = await deleteTaskGroup(id);
    if (!result?.success && result?.error) {
      toast.error(result.error);
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleBulkDelete() {
    if (!canManage) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (
      !confirm(
        `¿Eliminar ${ids.length} lista${ids.length !== 1 ? 's' : ''}? Sus tareas volverán a la lista principal.`
      )
    ) {
      return;
    }

    const result = await bulkDeleteTaskGroups(ids);
    if (result?.success) {
      const count = result.processed ?? ids.length;
      setSelectedIds(new Set());
      toast.success(`${count} lista${count !== 1 ? 's' : ''} eliminada${count !== 1 ? 's' : ''}`);
    } else if (result?.error) {
      toast.error(result.error);
    }
  }

  function startEdit(group: TaskGroup) {
    setEditingId(group.id);
    setEditName(group.name);
    setEditDescription(group.description || '');
    setEditColor(group.color || DEFAULT_COLOR);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
    setEditColor(DEFAULT_COLOR);
    setEditPending(false);
  }

  async function handleEditSubmit(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    if (!canManage) return;
    setEditPending(true);
    setError(null);

    const result = await updateTaskGroup(id, {
      name: editName,
      description: editDescription,
      color: editColor,
    });

    if (!result?.success && result?.error) {
      setError(result.error);
    } else {
      cancelEdit();
    }
    setEditPending(false);
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <Dialog
          open={showCreateDialog}
          onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (!open) {
              setError(null);
              resetCreateForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva lista
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px] bg-white dark:bg-slate-950">
            <DialogHeader>
              <DialogTitle>Nueva lista</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3 max-h-[80vh] overflow-y-auto pr-1">
              <div className="flex gap-1 p-1 rounded-lg bg-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateKind('procedure')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-md transition-colors',
                    createKind === 'procedure'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  Procedimiento
                </button>
                <button
                  type="button"
                  onClick={() => setCreateKind('folder')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-md transition-colors',
                    createKind === 'folder'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  <FolderKanban className="w-3.5 h-3.5" />
                  Carpeta / proyecto
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600" htmlFor="group-name">
                  Nombre
                </label>
                <input
                  id="group-name"
                  name="name"
                  required
                  maxLength={255}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder={
                    createKind === 'procedure'
                      ? 'Ej: Revisar cocina, Procedimiento de limpieza...'
                      : 'Ej: Auditorías mensuales, Inventario...'
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1" htmlFor="group-supervisor">
                  <UserIcon className="w-3 h-3" />
                  {createKind === 'procedure' ? 'Supervisor' : 'Asignar a'}
                </label>
                <select
                  id="group-supervisor"
                  name="supervisorUserId"
                  value={supervisorUserId}
                  onChange={(e) => setSupervisorUserId(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 flex items-center gap-1" htmlFor="group-type">
                    <RefreshCw className="w-3 h-3" />
                    Frecuencia
                  </label>
                  <select
                    id="group-type"
                    name="listType"
                    value={listType}
                    onChange={(e) => setListType(e.target.value as TaskFrequency)}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    {TASK_FREQUENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {isDateRange ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 flex items-center gap-1" htmlFor="group-start-date">
                        <CalendarIcon className="w-3 h-3" />
                        Desde
                      </label>
                      <input
                        id="group-start-date"
                        name="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 flex items-center gap-1" htmlFor="group-due-date">
                        <CalendarIcon className="w-3 h-3" />
                        Hasta
                      </label>
                      <input
                        id="group-due-date"
                        name="dueDate"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 flex items-center gap-1" htmlFor="group-due-date">
                      <CalendarIcon className="w-3 h-3" />
                      Vencimiento
                    </label>
                    <input
                      id="group-due-date"
                      name="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      required
                    />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600" htmlFor="group-description">
                  Descripción (opcional)
                </label>
                <textarea
                  id="group-description"
                  name="description"
                  rows={2}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder={
                    createKind === 'procedure'
                      ? 'Ej: Checklist de cierre de cocina al final del turno.'
                      : 'Breve descripción del tipo de tareas que vivirán en este grupo.'
                  }
                />
              </div>

              {createKind === 'procedure' && (
                <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <ListChecks className="w-3.5 h-3.5" />
                      Pasos del procedimiento
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setProcedureSteps((prev) => [
                          ...prev,
                          {
                            title: '',
                            assignedUserIds: supervisorUserId
                              ? [supervisorUserId]
                              : currentUser?.id
                                ? [currentUser.id]
                                : [],
                          },
                        ])
                      }
                      className="text-[11px] font-medium text-primary hover:underline"
                    >
                      + Añadir paso
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Cada paso puede tener varios responsables; cualquiera de ellos puede marcarlo.
                  </p>
                  <label className="flex items-center gap-2 text-[11px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={requireStrictOrder}
                      onChange={(e) => setRequireStrictOrder(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    Orden estricto (completar pasos en secuencia)
                  </label>
                  <div className="space-y-2">
                    {procedureSteps.map((step, index) => (
                      <div
                        key={index}
                        className="rounded-md border border-slate-200 bg-white p-2 space-y-1.5"
                      >
                        <div className="flex gap-1.5">
                          <input
                            value={step.title}
                            onChange={(e) => {
                              const value = e.target.value;
                              setProcedureSteps((prev) =>
                                prev.map((s, i) =>
                                  i === index ? { ...s, title: value } : s
                                )
                              );
                            }}
                            placeholder={`Paso ${index + 1}`}
                            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs"
                            maxLength={500}
                          />
                          <button
                            type="button"
                            disabled={procedureSteps.length <= 1}
                            onClick={() =>
                              setProcedureSteps((prev) =>
                                prev.filter((_, i) => i !== index)
                              )
                            }
                            className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30 shrink-0"
                            aria-label="Eliminar paso"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {users.map((u) => {
                            const checked = step.assignedUserIds.includes(u.id);
                            return (
                              <label
                                key={u.id}
                                className="inline-flex items-center gap-1 text-[10px] text-slate-600"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    setProcedureSteps((prev) =>
                                      prev.map((s, i) => {
                                        if (i !== index) return s;
                                        const ids = checked
                                          ? s.assignedUserIds.filter((id) => id !== u.id)
                                          : [...s.assignedUserIds, u.id];
                                        return { ...s, assignedUserIds: ids };
                                      })
                                    );
                                  }}
                                  className="rounded border-slate-300"
                                />
                                {u.name}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-xs font-medium text-slate-600">
                  Color del grupo
                </span>
                <div className="flex items-center gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        'w-6 h-6 rounded-full border-2 transition-all',
                        selectedColor === color
                          ? 'ring-2 ring-primary scale-110'
                          : 'opacity-80 hover:opacity-100'
                      )}
                      style={{ backgroundColor: color, borderColor: color }}
                      aria-label={`Elegir color ${color}`}
                    />
                  ))}
                </div>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={pending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={pending} className="gap-2">
                  <Plus className="w-3 h-3" />
                  {pending
                    ? 'Creando...'
                    : createKind === 'procedure'
                      ? 'Crear procedimiento'
                      : 'Crear lista'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <FolderKanban className="w-4 h-4 text-primary" />
            Listas de Tareas
            {groups.length > 0 && (
              <span className="text-xs font-normal text-slate-500">({groups.length})</span>
            )}
          </h2>
          {groups.length > 0 && (
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-primary px-2 py-1 rounded-md hover:bg-slate-50 transition-colors"
              aria-label={isAllSelected ? 'Quitar selección de todas' : 'Seleccionar todas las listas'}
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-primary" />
              ) : isSomeSelected ? (
                <div className="w-4 h-4 bg-primary/20 rounded-sm flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-primary rounded-full" />
                </div>
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>{isAllSelected ? 'Quitar selección' : 'Seleccionar todas'}</span>
            </button>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-3 p-2 rounded-lg bg-primary/5 border border-primary/20">
            <span className="text-xs font-medium text-slate-700">
              {selectedIds.size} seleccionada{selectedIds.size !== 1 ? 's' : ''}
            </span>
            {canManage && (
              <button
                type="button"
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar seleccionadas
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1"
            >
              Limpiar
            </button>
          </div>
        )}

        {groups.length === 0 ? (
          <p className="text-xs text-slate-500">
            Aún no tienes grupos. Crea uno para agrupar tareas por proyecto, área o checklist.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {groups.map((group) => {
              const isEditing = editingId === group.id;
              const isSelected = selectedIds.has(group.id);
              return (
                <div
                  key={group.id}
                  className={cn(
                    'px-3 py-2 rounded-lg border bg-slate-50 hover:bg-slate-100 transition-colors space-y-2',
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : 'border-slate-200'
                  )}
                >
                  {!isEditing ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleSelect(group.id)}
                          className="p-1 rounded hover:bg-slate-200/80 transition-colors shrink-0"
                          aria-label={
                            isSelected
                              ? `Quitar selección de ${group.name}`
                              : `Seleccionar ${group.name}`
                          }
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                        <span
                          className={cn(
                            'w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold text-white',
                          )}
                          style={{
                            backgroundColor: group.color || DEFAULT_COLOR,
                            borderColor: group.color || DEFAULT_COLOR,
                          }}
                        >
                          {group.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <Link
                            href={`/groups/${group.id}`}
                            className="text-sm font-semibold text-slate-800 hover:text-primary truncate"
                          >
                            {group.name}
                          </Link>
                          <div className="flex items-center gap-1.5 min-w-0">
                            {group.kind === 'procedure' ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary shrink-0">
                                <ListChecks className="w-3 h-3" />
                                Plantilla · {group.stepCount ?? 0} pasos
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 shrink-0">
                                <FolderKanban className="w-3 h-3" />
                                Carpeta
                              </span>
                            )}
                            {group.description && (
                              <span className="text-[11px] text-slate-500 truncate">
                                {group.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(group)}
                            className="text-[11px] text-slate-500 hover:text-primary px-1 py-0.5 rounded"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(group.id)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Eliminar grupo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => handleEditSubmit(e, group.id)}
                      className="space-y-2 bg-white rounded-md p-2 border border-slate-200"
                    >
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-600">
                          Nombre
                        </label>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          required
                          maxLength={255}
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-600">
                          Descripción
                        </label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={2}
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-slate-600">
                          Color
                        </span>
                        <div className="flex items-center gap-2">
                          {COLOR_OPTIONS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setEditColor(color)}
                              className={cn(
                                'w-5 h-5 rounded-full border-2 transition-all',
                                editColor === color
                                  ? 'ring-2 ring-primary scale-110'
                                  : 'opacity-80 hover:opacity-100'
                              )}
                              style={{ backgroundColor: color, borderColor: color }}
                              aria-label={`Elegir color ${color}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-[11px] text-slate-500 hover:text-slate-700 px-2 py-1 rounded"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={editPending}
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-primary text-white text-[11px] font-semibold shadow-sm hover:bg-primary/90 disabled:bg-slate-300 transition-colors"
                        >
                          {editPending ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {canManage && createdGroupId && (
        <TaskFormDialog
          users={users}
          currentUser={currentUser}
          groupId={createdGroupId}
          defaultAssignedUserId={createdTaskDefaults?.assignedUserId}
          defaultFrequency={createdTaskDefaults?.frequency}
          defaultDeadline={createdTaskDefaults?.deadline}
          defaultStartDate={createdTaskDefaults?.startDate}
          open={showTaskDialog}
          onOpenChange={(next) => {
            setShowTaskDialog(next);
            if (!next) {
              setCreatedGroupId(null);
              setCreatedTaskDefaults(null);
            }
          }}
          onTaskCreated={(groupId) => {
            setShowTaskDialog(false);
            setCreatedGroupId(null);
            setCreatedTaskDefaults(null);
            if (groupId) {
              router.push(`/groups/${groupId}`);
            }
          }}
        />
      )}
    </div>
  );
}

