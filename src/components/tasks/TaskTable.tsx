"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Task, User } from "@/types";
import { formatDate } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  updateTaskStatus,
  updateTaskNotes,
  bulkArchiveTasks,
  deleteTask,
  bulkDeleteTasks,
  toggleTaskPin,
} from "@/actions/tasks";
import { cn } from "@/lib/utils";
import {
  Calendar as CalendarIcon,
  Clock,
  RefreshCw,
  Archive,
  Square,
  CheckSquare,
  Trash2,
  Edit,
  Pin,
  Monitor,
} from "lucide-react";
import { TaskDetailModal } from "./TaskDetailModal";
import { TaskFormDialog } from "./TaskFormDialog";
import { launchFloatingNote } from "@/lib/floating-note";

const frequencyLabels: Record<string, string> = {
  one_time: "Una vez",
  daily: "Diario",
  weekly: "Semanal",
  monday: "Lunes",
  monthly: "Mensual",
};

interface TaskTableProps {
  tasks: Task[];
  users: User[];
  currentUser?: { id: string; role: string; name?: string | null; email?: string | null; image?: string | null };
}

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En Progreso",
  completed: "Finalizado",
};

type GroupingType = "none" | "status" | "user";
type FilterType = "all" | "pending" | "completed" | "archived";

function validDate(str: string) {
  return !Number.isNaN(new Date(str).getTime());
}

export function TaskTable({ tasks, users, currentUser }: TaskTableProps) {
  const [grouping, setGrouping] = useState<GroupingType>("none");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filter === "archived") {
      return tasks.filter((t) => t.isArchived);
    }

    // Default: hide archived unless specifically viewing them
    result = tasks.filter((t) => !t.isArchived);

    if (filter === "all") return result;
    return result.filter((task) => {
      if (filter === "pending")
        return task.status === "pending" || task.status === "in_progress";
      if (filter === "completed") return task.status === "completed";
      return true;
    });
  }, [tasks, filter]);

  const isAllSelected = filteredTasks.length > 0 && selectedIds.size === filteredTasks.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredTasks.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTasks.map(t => t.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkArchive = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`¿Estás seguro de que quieres archivar ${selectedIds.size} tareas?`)) {
      await bulkArchiveTasks(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`¿Estás seguro de que quieres ELIMINAR definitivamente ${selectedIds.size} tareas? Esta acción no se puede deshacer.`)) {
      await bulkDeleteTasks(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  async function toggleStatus(task: Task) {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    await updateTaskStatus(task.id, newStatus);
  }


  const getAssignedUser = useCallback(
    (id: string) => users.find((u) => u.id === id),
    [users],
  );

  const isNearDeadline = (dateStr: string) => {
    if (!validDate(dateStr)) return false;
    const d = new Date(dateStr);
    const now = new Date();
    const diffTime = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 2 && diffDays >= 0;
  };



  const groupedTasks = useMemo(() => {
    if (grouping === "none") {
      return [{ label: "", displayLabel: "", tasks: filteredTasks }];
    }

    const groups: Record<string, Task[]> = {};

    filteredTasks.forEach((task) => {
      let key = "unassigned";
      if (grouping === "status") {
        key = task.status;
      } else if (grouping === "user") {
        key = task.assignedUserId || "unassigned";
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });

    return Object.entries(groups).map(([key, groupTasks]) => {
      let displayLabel = key;
      if (grouping === "status") {
        displayLabel = statusLabels[key] || key;
      } else if (grouping === "user") {
        displayLabel = getAssignedUser(key)?.name || "Sin asignar";
      }

      return {
        label: key,
        displayLabel,
        tasks: groupTasks,
      };
    });
  }, [filteredTasks, grouping, getAssignedUser]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Filtro de Estado */}
        <div className="flex items-center gap-2 text-sm bg-white p-2 rounded-lg border w-fit shadow-sm">
          <span className="text-slate-500 ml-2 font-medium">Ver:</span>
          <div className="flex bg-slate-100 p-1 rounded-md">
            {(["all", "pending", "completed", "archived"] as const).map((opt) => {
              const count = opt === "archived" 
                ? tasks.filter(t => t.isArchived).length
                : opt === "all"
                  ? tasks.filter(t => !t.isArchived).length
                  : opt === "pending"
                    ? tasks.filter(t => !t.isArchived && (t.status === "pending" || t.status === "in_progress")).length
                    : tasks.filter(t => !t.isArchived && t.status === "completed").length;

              return (
                <button
                  key={opt}
                  onClick={() => setFilter(opt)}
                  className={cn(
                    "px-4 py-1 rounded-sm transition-all text-xs flex items-center gap-1.5",
                    filter === opt
                      ? "bg-white shadow-sm text-primary font-bold"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  {opt === "all"
                    ? "Todas"
                    : opt === "pending"
                      ? "Pendientes"
                      : opt === "completed" 
                        ? "Finalizadas"
                        : "Archivadas"}
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full",
                    filter === opt ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-500"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Agrupador */}
        <div className="flex items-center gap-2 text-sm bg-white p-2 rounded-lg border w-fit shadow-sm">
          <span className="text-slate-500 ml-2 font-medium">Agrupar:</span>
          <div className="flex bg-slate-100 p-1 rounded-md">
            {(["none", "status", "user"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setGrouping(opt)}
                className={cn(
                  "px-4 py-1 rounded-sm transition-all text-xs",
                  grouping === opt
                    ? "bg-white shadow-sm text-primary font-bold"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                {opt === "none"
                  ? "Sin orden"
                  : opt === "status"
                    ? "Estado"
                    : "Usuario"}
              </button>
            ))}
          </div>
        </div>

        {/* Acciones por lotes */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
            <button
              onClick={handleBulkArchive}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              <Archive className="w-3.5 h-3.5" />
              Archivar ({selectedIds.size})
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar ({selectedIds.size})
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium px-2"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[600px]">
            <thead className="text-slate-500 border-b bg-slate-50">
              <tr>
                <th className="px-4 md:px-6 py-3 font-medium w-10">
                  <button 
                    onClick={toggleSelectAll}
                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : isSomeSelected ? (
                      <div className="w-4 h-4 bg-primary/20 rounded-sm flex items-center justify-center">
                        <div className="w-2 h-0.5 bg-primary rounded-full" />
                      </div>
                    ) : (
                      <Square className="w-4 h-4 text-slate-300" />
                    )}
                  </button>
                </th>
                <th className="px-4 md:px-6 py-3 font-medium">Tarea</th>
                <th className="px-4 md:px-6 py-3 font-medium">Asignado a</th>
                <th className="px-4 md:px-6 py-3 font-medium">Vencimiento</th>
                <th className="px-4 md:px-6 py-3 font-medium">Estado</th>
                <th className="px-4 md:px-6 py-3 font-medium min-w-[200px]">
                  Notas
                </th>
                <th className="px-4 md:px-6 py-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {groupedTasks.map((group, groupIdx) => (
                <React.Fragment key={group.label || groupIdx}>
                  {grouping !== "none" && (
                    <tr className="bg-slate-50/50">
                      <td
                        colSpan={7}
                        className="px-4 md:px-6 py-2 font-semibold text-slate-700 border-y"
                      >
                        <div className="flex items-center gap-2">
                          {group.displayLabel || "Grup"}
                          <span className="text-xs font-normal text-slate-400 bg-white border px-1.5 py-0.5 rounded-full">
                            {group.tasks.length}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {group.tasks.map((task) => {
                    const isUrgent =
                      isNearDeadline(task.deadline) &&
                      task.status !== "completed";
                    const assignee = getAssignedUser(task.assignedUserId);
                    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                    const progress = hasSubtasks 
                      ? Math.round((task.subtasks.filter(st => st.completed).length / task.subtasks.length) * 100)
                      : (task.status === 'completed' ? 100 : 0);

                    const isPriority = task.priority === 'urgent';
                    const isOverdue = validDate(task.deadline) && 
                                     new Date(task.deadline).getTime() < new Date().setHours(0,0,0,0) && 
                                     task.status !== 'completed';

                    return (
                      <tr
                        key={task.id}
                        className={cn(
                          "hover:bg-slate-50 transition-colors group",
                          isPriority ? "bg-red-50/50 hover:bg-red-100/40" : 
                          isOverdue ? "bg-amber-50/60 hover:bg-amber-100/50" : 
                          isUrgent && "bg-red-50 hover:bg-red-100/50",
                        )}
                      >
                        <td className="px-4 md:px-6 py-3 align-top">
                           <button 
                            onClick={() => toggleSelect(task.id)}
                            className="p-1 hover:bg-slate-200/50 rounded transition-colors mt-0.5"
                          >
                            {selectedIds.has(task.id) ? (
                              <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 md:px-6 py-1.5 font-medium align-top">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span 
                                  className="text-[15px] font-bold text-slate-900 cursor-pointer hover:text-primary hover:underline transition-colors"
                                  onClick={() => setSelectedTask(task)}
                                >
                                  {task.title}
                                </span>
                                {isPriority && (
                                  <span className="text-[9px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                                    Urgent
                                  </span>
                                )}
                              </div>
                              {(isUrgent || isOverdue) && !isPriority && (
                                <span className={cn(
                                  "text-xs md:hidden flex items-center gap-1",
                                  isOverdue ? "text-amber-600" : "text-red-500"
                                )}>
                                  <Clock className="w-3 h-3" /> {isOverdue ? 'Vencido' : 'Urgente'}
                                </span>
                              )}
                            </div>

                            {/* Barra de Progreso Universal */}
                            <div className="w-full max-w-[200px] space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Progreso</span>
                                <span className="text-[10px] text-slate-500 font-bold">{progress}%</span>
                              </div>
                              <div className="h-1 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                <div 
                                  className={cn(
                                    "h-full transition-all duration-700 ease-in-out",
                                    progress === 100 ? "bg-green-500" : "bg-primary"
                                  )}
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-1.5">
                          <div className="flex items-center gap-2">
                            {assignee && (
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={assignee.avatarUrl} />
                                <AvatarFallback>
                                  {assignee.name.slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <span className="text-slate-600 truncate max-w-[100px]">
                              {assignee?.name || "Sin asignar"}
                            </span>
                          </div>
                        </td>
                        <td
                          className={cn(
                            "px-4 md:px-6 py-4",
                            isUrgent && "text-red-600 font-bold",
                          )}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                              {formatDate(task.deadline)}
                            </span>
                            {task.frequency &&
                              task.frequency !== "one_time" && (
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full w-fit flex items-center gap-1 font-normal">
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  {frequencyLabels[task.frequency] ||
                                    task.frequency}
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-1.5">
                          <Badge
                            variant={
                              task.status === "completed"
                                ? "success"
                                : task.status === "in_progress"
                                  ? "secondary"
                                  : "default"
                            }
                            className="cursor-pointer whitespace-nowrap"
                            onClick={() => toggleStatus(task)}
                          >
                            {statusLabels[task.status] || task.status}
                          </Badge>
                        </td>
                        <td className="px-4 md:px-6 py-4 space-x-2">
                           <div className="flex items-center gap-2">
                            <input
                              className="text-xs border-b border-transparent hover:border-slate-300 bg-transparent focus:outline-none w-full"
                              defaultValue={task.notes}
                              onBlur={(e) =>
                                updateTaskNotes(task.id, e.target.value)
                              }
                              placeholder="Nota..."
                            />
                            <div className="flex items-center gap-1">
                              {!task.isArchived && (
                                <>
                                  <button
                                    onClick={async () => {
                                      if (!task.isPinned) {
                                        await toggleTaskPin(task.id, true);
                                      }
                                      await launchFloatingNote(task);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                                    title="Lanzar al Escritorio"
                                  >
                                    <Monitor className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      await toggleTaskPin(task.id, !task.isPinned);
                                    }}
                                    className={cn(
                                      "p-1.5 rounded-md transition-all",
                                      task.isPinned 
                                        ? "text-yellow-600 bg-yellow-50 hover:bg-yellow-100" 
                                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                    )}
                                    title={task.isPinned ? "Desanclar" : "Anclar al tablero"}
                                  >
                                    <Pin className={cn("w-4 h-4", task.isPinned && "fill-yellow-600")} />
                                  </button>
                                  <TaskFormDialog 
                                    users={users} 
                                    task={task} 
                                    currentUser={currentUser}
                                    trigger={
                                      <button
                                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-md transition-all"
                                        title="Editar"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                    }
                                  />
                                  <button
                                    onClick={async () => {
                                      if (confirm("¿Archivar esta tarea?")) {
                                        await bulkArchiveTasks([task.id]);
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-all"
                                    title="Archivar"
                                  >
                                    <Archive className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={async () => {
                                  if (confirm("¿ELIMINAR esta tarea definitivamente?")) {
                                    await deleteTask(task.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <TaskDetailModal 
        task={selectedTask} 
        tasks={tasks}
        isOpen={!!selectedTask} 
        onClose={() => setSelectedTask(null)} 
      />
    </div>
  );
}
