'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TaskGroup, User } from '@/types';
import { createTaskGroup, deleteTaskGroup, updateTaskGroup } from '@/actions/task-groups';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, FolderKanban, Plus, Trash2, User as UserIcon, RefreshCw } from 'lucide-react';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';

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
  const [supervisorUserId, setSupervisorUserId] = useState(currentUser?.id ?? '');
  const [listType, setListType] = useState<'one_time' | 'permanent'>('one_time');
  const [dueDate, setDueDate] = useState('');
  const [createdTaskDefaults, setCreatedTaskDefaults] = useState<{
    assignedUserId: string;
    frequency: string;
    deadline: string;
  } | null>(null);

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
    const taskDefaults = {
      assignedUserId: supervisorUserId,
      frequency: listType,
      deadline: dueDate,
    };
    const result = await createTaskGroup(formData);
    if (!result?.success && result?.error) {
      setError(result.error);
    } else {
      setCreatedTaskDefaults(taskDefaults);
      form.reset();
      setSelectedColor(DEFAULT_COLOR);
      setSupervisorUserId(currentUser?.id ?? '');
      setListType('one_time');
      setDueDate('');
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
      alert(result.error);
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
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
          <FolderKanban className="w-4 h-4 text-primary" />
          Listas de Tareas
        </h2>
        {groups.length === 0 ? (
          <p className="text-xs text-slate-500">
            Aún no tienes grupos. Crea uno para agrupar tareas por proyecto, área o checklist.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {groups.map((group) => {
              const isEditing = editingId === group.id;
              return (
                <div
                  key={group.id}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors space-y-2"
                >
                  {!isEditing ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
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
                          {group.description && (
                            <span className="text-[11px] text-slate-500 truncate">
                              {group.description}
                            </span>
                          )}
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

      {canManage && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-3">
            <Plus className="w-4 h-4 text-primary" />
            Nueva Lista
          </h3>
          <form onSubmit={handleCreate} className="space-y-3">
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
                placeholder="Ej: Auditorías mensuales, Inventario, Turno Noche..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-1" htmlFor="group-supervisor">
                <UserIcon className="w-3 h-3" />
                Asignar a
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 flex items-center gap-1" htmlFor="group-type">
                  <RefreshCw className="w-3 h-3" />
                  Frecuencia
                </label>
                <select
                  id="group-type"
                  name="listType"
                  value={listType}
                  onChange={(e) => {
                    const nextType = e.target.value as 'one_time' | 'permanent';
                    setListType(nextType);
                    if (nextType === 'permanent') setDueDate('');
                  }}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="one_time">Una vez</option>
                  <option value="permanent">Frecuente / permanente</option>
                </select>
              </div>
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
                  required={listType === 'one_time'}
                  disabled={listType === 'permanent'}
                />
              </div>
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
                placeholder="Breve descripción del tipo de tareas que vivirán en este grupo."
              />
            </div>
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
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-white text-xs font-semibold shadow-sm hover:bg-primary/90 disabled:bg-slate-300 transition-colors"
            >
              <Plus className="w-3 h-3" />
              {pending ? 'Creando...' : 'Crear Lista'}
            </button>
          </form>
        </section>
      )}

      {canManage && createdGroupId && (
        <TaskFormDialog
          users={users}
          currentUser={currentUser}
          groupId={createdGroupId}
          defaultAssignedUserId={createdTaskDefaults?.assignedUserId}
          defaultFrequency={createdTaskDefaults?.frequency}
          defaultDeadline={createdTaskDefaults?.deadline}
          open={showTaskDialog}
          onOpenChange={(next) => {
            setShowTaskDialog(next);
            if (!next) {
              setCreatedGroupId(null);
              setCreatedTaskDefaults(null);
            }
          }}
          onTaskCreated={(groupId) => {
            const wantsMore = window.confirm('¿Desea agregar más tareas a la lista?');
            setShowTaskDialog(false);
            setCreatedGroupId(null);
            setCreatedTaskDefaults(null);
            if (wantsMore && groupId) {
              router.push(`/groups/${groupId}`);
            }
          }}
        />
      )}
    </div>
  );
}

