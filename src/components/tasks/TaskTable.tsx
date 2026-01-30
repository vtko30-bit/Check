"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Task, User } from "@/types";
import { formatDate } from "@/lib/date";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  updateTaskStatus,
  updateTaskNotes,
  bulkArchiveTasks,
  deleteTask,
  bulkDeleteTasks,
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
  LayoutList,
  Kanban, 
  List
} from "lucide-react";
import { TaskDetailModal } from "./TaskDetailModal";
import { TaskFormDialog } from "./TaskFormDialog";
import { TaskBoard } from "./TaskBoard";

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
type FilterType = "all" | "pending" | "completed"; 
type ViewMode = "active" | "archived";

function validDate(str: string) {
  return !Number.isNaN(new Date(str).getTime());
}

export function TaskTable({ tasks, users, currentUser }: TaskTableProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [layout, setLayout] = useState<"list" | "board">("list");
  const [grouping, setGrouping] = useState<GroupingType>("none");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredTasks = useMemo(() => {
    let result = viewMode === "archived" 
      ? tasks.filter((t) => t.isArchived)
      : tasks.filter((t) => !t.isArchived);

    if (viewMode === "archived") return result;

    if (filter === "all") return result;
    
    return result.filter((task) => {
      if (filter === "pending")
        return task.status === "pending" || task.status === "in_progress";
      if (filter === "completed") return task.status === "completed";
      return true;
    });
  }, [tasks, filter, viewMode]);

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
      
      {/* --- PESTAÑAS PRINCIPALES --- */}
      <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800 mb-6">
        <button
          onClick={() => {
            setViewMode("active");
            setSelectedIds(new Set());
          }}
          className={cn(
            "pb-3 text-sm font-medium flex items-center gap-2 transition-all relative",
            viewMode === "active" 
              ? "text-primary font-bold" 
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          <LayoutList className="w-4 h-4" />
          Activas
          {viewMode === "active" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => {
            setViewMode("archived");
            setSelectedIds(new Set());
          }}
          className={cn(
            "pb-3 text-sm font-medium flex items-center gap-2 transition-all relative",
            viewMode === "archived" 
              ? "text-primary font-bold" 
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          <Archive className="w-4 h-4" />
          Archivado
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-500">
            {tasks.filter(t => t.isArchived).length}
          </span>
           {viewMode === "archived" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
      </div>


      {/* --- BARRA DE HERRAMIENTAS --- */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full">
        
        {viewMode === "active" && (
          <div className="flex items-center gap-2 text-sm bg-white dark:bg-slate-900 p-2 rounded-lg border shadow-sm max-w-full overflow-x-auto scrollbar-hide">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
              {(["all", "pending", "completed"] as const).map((opt) => {
                const count = opt === "all"
                    ? tasks.filter(t => !t.isArchived).length
                    : opt === "pending"
                      ? tasks.filter(t => !t.isArchived && (t.status === "pending" || t.status === "in_progress")).length
                      : tasks.filter(t => !t.isArchived && t.status === "completed").length;

                return (
                  <button
                    key={opt}
                    onClick={() => setFilter(opt)}
                    className={cn(
                      "px-4 py-1 rounded-sm transition-all text-xs flex items-center gap-1.5 whitespace-nowrap",
                      filter === opt
                        ? "bg-white dark:bg-slate-950 shadow-sm text-primary font-bold"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700",
                    )}
                  >
                    {opt === "all"
                      ? "Todas"
                      : opt === "pending"
                        ? "Pendientes"
                        : "Finalizadas"}
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full",
                      filter === opt 
                        ? "bg-primary/10 text-primary" 
                        : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm bg-white dark:bg-slate-900 p-2 rounded-lg border shadow-sm max-w-full overflow-x-auto scrollbar-hide flex-1">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
            {(["none", "status", "user"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setGrouping(opt)}
                className={cn(
                  "px-4 py-1 rounded-sm transition-all text-xs whitespace-nowrap",
                  grouping === opt
                    ? "bg-white dark:bg-slate-950 shadow-sm text-primary font-bold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700",
                )}
              >
                {opt === "none" ? "Sin orden" : opt === "status" ? "Estado" : "Usuario"}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-md">
            <button
                onClick={() => setLayout("list")}
                className={cn(
                    "p-1.5 rounded-sm transition-all",
                    layout === "list"
                        ? "bg-white dark:bg-slate-950 shadow-sm text-primary"
                        : "text-slate-400 hover:text-slate-600"
                )}
                title="Vista de Lista"
            >
                <List className="w-4 h-4" />
            </button>
            <button
                onClick={() => setLayout("board")}
                className={cn(
                    "p-1.5 rounded-sm transition-all",
                    layout === "board"
                        ? "bg-white dark:bg-slate-950 shadow-sm text-primary"
                        : "text-slate-400 hover:text-slate-600"
                )}
                title="Vista de Tablero"
            >
                <Kanban className="w-4 h-4" />
            </button>
         </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200 overflow-x-auto max-w-full pb-1 ml-auto">
            {viewMode === "active" && (
                <button
                onClick={handleBulkArchive}
                className="flex items-center gap-2 bg-slate-900 dark:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 whitespace-nowrap"
                >
                <Archive className="w-3.5 h-3.5" />
                Archivar ({selectedIds.size})
                </button>
            )}
            
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar ({selectedIds.size})
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-500 hover:text-slate-700 font-medium px-2 whitespace-nowrap"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* --- RENDERIZADO CONDICIONAL --- */}
      {layout === "board" && viewMode === "active" ? (
         <div className="animate-in fade-in duration-300">
            <TaskBoard tasks={filteredTasks} users={users} currentUser={currentUser} />
         </div>
      ) : (
        <div className="rounded-lg border bg-white dark:bg-slate-900 overflow-hidden shadow-sm animate-in fade-in duration-300">
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {groupedTasks.flatMap(group => group.tasks).length === 0 && (
                <div className="p-12 flex flex-col items-center justify-center text-center text-slate-400 gap-4">
                    {viewMode === 'active' ? (
                        <>
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                <CheckSquare className="w-8 h-8 text-slate-300" />
                            </div>
                            <p>No hay tareas pendientes</p>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                <Archive className="w-8 h-8 text-slate-300" />
                            </div>
                            <p>No hay tareas en archivado</p>
                        </>
                    )}
                </div>
            )}
            {groupedTasks.map((group, groupIdx) => (
                <React.Fragment key={group.label || groupIdx}>
                {grouping !== "none" && group.tasks.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between border-y dark:border-slate-800">
                    <span>{group.displayLabel}</span>
                    <span className="bg-white dark:bg-slate-950 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">{group.tasks.length}</span>
                    </div>
                )}
                {group.tasks.map((task) => {
                    const assignee = getAssignedUser(task.assignedUserId);
                    const isOverdue = validDate(task.deadline) && 
                                    new Date(task.deadline).getTime() < new Date().setHours(0,0,0,0) && 
                                    task.status !== 'completed';
                    const isUrgent = isNearDeadline(task.deadline) && task.status !== "completed";
                    const isPriority = task.priority === 'urgent';
                

                    return (
                    <div key={task.id} className={cn(
                        "p-4 flex flex-col gap-3 active:bg-slate-50 dark:active:bg-slate-800 transition-colors",
                        isPriority ? "bg-red-50/30 dark:bg-red-900/10" : isOverdue ? "bg-amber-50/30 dark:bg-amber-900/10" : ""
                    )}>
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 
                                className="font-bold text-slate-900 dark:text-slate-100 leading-tight cursor-pointer"
                                onClick={() => setSelectedTask(task)}
                                >
                                {task.title}
                                </h3>
                                {isPriority && (
                                <span className="text-[8px] bg-red-600 text-white font-black px-1 py-0.5 rounded uppercase">Urgent</span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                <span className={cn("flex items-center gap-1", isOverdue ? "text-red-600 font-bold" : isUrgent ? "text-amber-600" : "")}>
                                <CalendarIcon className="w-3 h-3" /> {formatDate(task.deadline)}
                                </span>
                                {assignee && (
                                <div className="flex items-center gap-1">
                                    <Avatar className="h-4 w-4">
                                    <AvatarImage src={assignee.avatarUrl} />
                                    <AvatarFallback>{assignee.name?.slice(0, 1)}</AvatarFallback>
                                    </Avatar>
                                    <span className="truncate max-w-[80px]">{assignee.name}</span>
                                </div>
                                )}
                            </div>
                            </div>
                            
                            {/* --- CHECKBOX DE ESTADO (MÓVIL) --- */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleStatus(task);
                                }}
                                className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-lg transition-all",
                                    task.status === "completed"
                                    ? "bg-green-100 text-green-600 hover:bg-green-200"
                                    : "bg-slate-100 text-slate-300 hover:text-slate-500 hover:bg-slate-200"
                                )}
                            >
                                {task.status === "completed" ? (
                                    <CheckSquare className="w-5 h-5" />
                                ) : (
                                    <Square className="w-5 h-5" />
                                )}
                            </button>
                        </div>


                        <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1">
                            <TaskFormDialog 
                                users={users} 
                                task={task} 
                                currentUser={currentUser}
                                trigger={
                                <button className="p-2 text-slate-400 hover:text-primary"><Edit className="w-4 h-4" /></button>
                                }
                            />
                            
                            {!task.isArchived && (
                                <button 
                                    onClick={() => bulkArchiveTasks([task.id])}
                                    className="p-2 text-slate-400 hover:text-slate-600"
                                >
                                    <Archive className="w-4 h-4" />
                                </button>
                            )}
                            
                            <button 
                                onClick={() => deleteTask(task.id)}
                                className="p-2 text-slate-400 hover:text-red-500"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        
                        </div>
                    </div>
                    );
                })}
                </React.Fragment>
            ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[600px]">
                <thead className="text-slate-500 dark:text-slate-400 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <tr>
                    <th className="px-4 md:px-6 py-3 font-medium w-10">
                    <button 
                        onClick={toggleSelectAll}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                    >
                        {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                        ) : isSomeSelected ? (
                        <div className="w-4 h-4 bg-primary/20 rounded-sm flex items-center justify-center">
                            <div className="w-2 h-0.5 bg-primary rounded-full" />
                        </div>
                        ) : (
                        <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
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
                <tbody className="divide-y dark:divide-slate-800">
                {groupedTasks.map((group, groupIdx) => (
                    <React.Fragment key={group.label || groupIdx}>
                    {grouping !== "none" && (
                        <tr className="bg-slate-50/50 dark:bg-slate-900/50">
                        <td
                            colSpan={7}
                            className="px-4 md:px-6 py-2 font-semibold text-slate-700 dark:text-slate-300 border-y dark:border-slate-800"
                        >
                            <div className="flex items-center gap-2">
                            {group.displayLabel || "Grup"}
                            <span className="text-xs font-normal text-slate-400 bg-white dark:bg-slate-950 border dark:border-slate-700 px-1.5 py-0.5 rounded-full">
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
                        const isPriority = task.priority === 'urgent';
                        const isOverdue = validDate(task.deadline) && 
                                        new Date(task.deadline).getTime() < new Date().setHours(0,0,0,0) && 
                                        task.status !== 'completed';

                        return (
                        <tr
                            key={task.id}
                            className={cn(
                            "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group",
                            isPriority ? "bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100/40" : 
                            isOverdue ? "bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-100/50" : 
                            isUrgent && "bg-red-50 dark:bg-red-900/10 hover:bg-red-100/50",
                            )}
                        >
                            <td className="px-4 md:px-6 py-3 align-top">
                            <button 
                                onClick={() => toggleSelect(task.id)}
                                className="p-1 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded transition-colors mt-0.5"
                            >
                                {selectedIds.has(task.id) ? (
                                <CheckSquare className="w-4 h-4 text-primary" />
                                ) : (
                                <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400" />
                                )}
                            </button>
                            </td>
                            <td className="px-4 md:px-6 py-1.5 font-medium align-top">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span 
                                    className="text-[15px] font-bold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-primary hover:underline transition-colors"
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
                                
                            </div>
                            </td>
                            <td className="px-4 md:px-6 py-1.5">
                            <div className="flex items-center gap-2">
                                {assignee && (
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={assignee.avatarUrl} />
                                    <AvatarFallback>
                                    {assignee.name?.slice(0, 2)}
                                    </AvatarFallback>
                                </Avatar>
                                )}
                                <span className="text-slate-600 dark:text-slate-400 truncate max-w-[100px]">
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
                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full w-fit flex items-center gap-1 font-normal">
                                    <RefreshCw className="w-2.5 h-2.5" />
                                    {frequencyLabels[task.frequency] ||
                                        task.frequency}
                                    </span>
                                )}
                            </div>
                            </td>
                            
                            {/* --- CHECKBOX DE ESTADO (DESKTOP) --- */}
                            <td className="px-4 md:px-6 py-1.5">
                                <button
                                    onClick={() => toggleStatus(task)}
                                    className={cn(
                                        "flex items-center gap-2 px-2 py-1.5 rounded-md border transition-all text-xs font-medium w-full max-w-[120px]",
                                        task.status === "completed"
                                        ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                    )}
                                >
                                    {task.status === "completed" ? (
                                        <CheckSquare className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <Square className="w-4 h-4 text-slate-400" />
                                    )}
                                    <span>{statusLabels[task.status]}</span>
                                </button>
                            </td>

                            <td className="px-4 md:px-6 py-4 space-x-2">
                            <div className="flex items-center gap-2">
                                <input
                                className="text-xs border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 bg-transparent focus:outline-none w-full dark:text-slate-300"
                                defaultValue={task.notes}
                                onBlur={(e) =>
                                    updateTaskNotes(task.id, e.target.value)
                                }
                                placeholder="Nota..."
                                />
                                <div className="flex items-center gap-1">
                                {!task.isArchived && (
                                    <>
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
                                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-all"
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
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
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