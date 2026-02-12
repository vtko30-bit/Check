"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Task, User, TaskGroup } from "@/types";
import { formatDate } from "@/lib/date";
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
  List,
  ListChecks,
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { TaskDetailModal } from "./TaskDetailModal";
import { TaskFormDialog } from "./TaskFormDialog";
import { TaskBoard } from "./TaskBoard";

const frequencyLabels: Record<string, string> = {
  one_time: "Una vez",
  daily: "Diario",
  weekly: "Semanal",
  weekly_0: "Domingos",
  weekly_1: "Lunes",
  weekly_2: "Martes",
  weekly_3: "Miércoles",
  weekly_4: "Jueves",
  weekly_5: "Viernes",
  weekly_6: "Sábados",
  monday: "Lunes", // compatibilidad
  monthly: "Mensual",
  date_range: "Rango de fechas",
};

interface TaskTableProps {
  tasks: Task[];
  users: User[];
  currentUser?: { id: string; role: string; name?: string | null; email?: string | null; image?: string | null };
  groups?: TaskGroup[];
}

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En Progreso",
  completed: "Finalizado",
};

type FilterType = "all" | "pending" | "completed"; 
type ViewMode = "active" | "archived";
type SortDirection = "asc" | "desc";
type SortKey = "title" | "assignedUserId" | "deadline" | "status" | "priority";

function validDate(str: string) {
  return !Number.isNaN(new Date(str).getTime());
}

export function TaskTable({ tasks, users, currentUser, groups = [] }: TaskTableProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [layout, setLayout] = useState<"list" | "board">("list");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getAssignedUser = useCallback(
    (id: string) => users.find((u) => u.id === id),
    [users],
  );

  const sortedTasks = useMemo(() => {
    let result = viewMode === "archived" 
      ? tasks.filter((t) => t.isArchived)
      : tasks.filter((t) => !t.isArchived);

    if (viewMode !== "archived") {
      if (filter === "pending") {
        result = result.filter(t => t.status === "pending" || t.status === "in_progress");
      } else if (filter === "completed") {
        result = result.filter(t => t.status === "completed");
      }
    }

    if (sortConfig) {
      result.sort((a, b) => {
        let valA: any = a[sortConfig.key];
        let valB: any = b[sortConfig.key];

        if (sortConfig.key === 'assignedUserId') {
            valA = getAssignedUser(valA)?.name || "";
            valB = getAssignedUser(valB)?.name || "";
        }
        if (sortConfig.key === 'deadline') {
            valA = new Date(valA).getTime();
            valB = new Date(valB).getTime();
        }

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [tasks, filter, viewMode, sortConfig, getAssignedUser]);

  const isAllSelected = sortedTasks.length > 0 && selectedIds.size === sortedTasks.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < sortedTasks.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedTasks.map(t => t.id)));
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
    const ids =
      selectedIds.size > 0
        ? Array.from(selectedIds)
        : sortedTasks.map((t) => t.id);
    if (ids.length === 0) return;
    if (confirm(`¿Estás seguro de que quieres archivar ${ids.length} tareas?`)) {
      await bulkArchiveTasks(ids);
      setSelectedIds(new Set());
    }
  };

  const handleBulkDelete = async () => {
    const ids =
      selectedIds.size > 0
        ? Array.from(selectedIds)
        : sortedTasks.map((t) => t.id);
    if (ids.length === 0) return;
    if (
      confirm(
        `¿Estás seguro de que quieres ELIMINAR definitivamente ${ids.length} tareas? Esta acción no se puede deshacer.`
      )
    ) {
      await bulkDeleteTasks(ids);
      setSelectedIds(new Set());
    }
  };

  async function toggleStatus(task: Task) {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    const result = await updateTaskStatus(task.id, newStatus);
    if (!result?.success && result?.error) {
      alert(result.error);
    }
  }

  const isNearDeadline = (dateStr: string) => {
    if (!validDate(dateStr)) return false;
    const d = new Date(dateStr);
    const now = new Date();
    const diffTime = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 2 && diffDays >= 0;
  };

  const SortableHeader = ({ label, sortKey, className }: { label: string, sortKey?: SortKey, className?: string }) => {
    const isActive = sortConfig?.key === sortKey;
    
    return (
        <th className={cn(
            "px-4 md:px-6 py-3.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider select-none bg-slate-100/80 border-b-2 border-slate-200 dark:bg-slate-800 dark:border-slate-700",
            className
        )}>
            {sortKey ? (
                <button 
                    onClick={() => handleSort(sortKey)}
                    className="flex items-center gap-1.5 hover:text-primary transition-colors group"
                >
                    {label}
                    {isActive ? (
                        <span className="bg-primary/10 text-primary p-0.5 rounded">
                            {sortConfig?.direction === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                        </span>
                    ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-50 group-hover:opacity-100" />
                    )}
                </button>
            ) : (
                <span>{label}</span>
            )}
        </th>
    );
  };

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
          Archivadas
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-500">
            {tasks.filter(t => t.isArchived).length}
          </span>
           {viewMode === "archived" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
          )}
        </button>
      </div>


      {/* --- BARRA DE HERRAMIENTAS COMPACTA --- */}
      <div className="flex flex-col gap-3 w-full">
        {/* Fila única de controles */}
        <div className="flex items-center justify-between gap-2 w-full">
            
            {/* Contenedor de Filtros y Vistas combinados */}
            {viewMode === "active" && (
                <div className="flex items-center gap-2 w-full">
                    
                    {/* Filtros (Diseño Vertical Compacto) */}
                    <div className="flex-1 flex items-stretch gap-1 p-1 bg-slate-50 dark:bg-slate-900 rounded-lg border shadow-sm">
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
                                "flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-md transition-all min-w-[60px]",
                                filter === opt
                                    ? "bg-white shadow-sm border border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                                    : "hover:bg-slate-100 dark:hover:bg-slate-800",
                                )}
                            >
                                <span className={cn(
                                    "text-[9px] font-bold uppercase tracking-wider mb-0.5 leading-none",
                                    filter === opt ? "text-primary" : "text-slate-500"
                                )}>
                                    {opt === "all" ? "Todas" : opt === "pending" ? "Pendientes" : "Listas"}
                                </span>
                                <span className={cn(
                                    "text-xs font-bold leading-none",
                                    filter === opt ? "text-slate-800 dark:text-slate-100" : "text-slate-400"
                                )}>
                                    {count}
                                </span>
                            </button>
                            );
                        })}
                    </div>

                    {/* Selector de Vista (Fijo a la derecha) */}
                    <div className="flex-none flex items-center p-1 bg-slate-50 dark:bg-slate-900 rounded-lg border shadow-sm h-full self-stretch">
                        <button 
                            onClick={() => setLayout("list")} 
                            className={cn(
                                "p-2 rounded-md transition-all h-full flex items-center justify-center", 
                                layout === "list" ? "bg-white dark:bg-slate-800 text-primary shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600"
                            )} 
                            title="Lista"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setLayout("board")} 
                            className={cn(
                                "p-2 rounded-md transition-all h-full flex items-center justify-center", 
                                layout === "board" ? "bg-white dark:bg-slate-800 text-primary shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600"
                            )} 
                            title="Tablero"
                        >
                            <Kanban className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Barra fija bajo los filtros: Archivar (negro) y Eliminar (rojo), siempre activos.
            - Si hay selección: actúan sobre las tareas seleccionadas.
            - Si no hay selección: actúan sobre todas las tareas visibles del filtro actual. */}
        <div className="flex items-center gap-2 py-2">
          {viewMode === "active" && (
            <button
              onClick={handleBulkArchive}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all shadow-sm whitespace-nowrap bg-black dark:bg-slate-900 hover:bg-slate-800"
            >
              <Archive className="w-4 h-4" /> Archivar
            </button>
          )}
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all shadow-sm whitespace-nowrap bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4" /> Eliminar
          </button>
        </div>
      </div>

      {/* --- RENDERIZADO CONDICIONAL --- */}
      {layout === "board" && viewMode === "active" ? (
         <div className="animate-in fade-in duration-300">
            <TaskBoard tasks={sortedTasks} users={users} currentUser={currentUser} />
         </div>
      ) : (
        <div className="rounded-lg border bg-white dark:bg-slate-900 overflow-hidden shadow-sm animate-in fade-in duration-300">
            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {sortedTasks.length === 0 && (
                <div className="p-12 flex flex-col items-center justify-center text-center text-slate-400 gap-4">
                    {viewMode === 'active' ? (
                        <>
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                <CheckSquare className="w-8 h-8 text-slate-300" />
                            </div>
                            <p>No hay tareas</p>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                <Archive className="w-8 h-8 text-slate-300" />
                            </div>
                            <p>No hay tareas archivadas</p>
                        </>
                    )}
                </div>
            )}
            {sortedTasks.map((task) => {
                    const assignee = getAssignedUser(task.assignedUserId);
                    const isOverdue = validDate(task.deadline) && 
                                    new Date(task.deadline).getTime() < new Date().setHours(0,0,0,0) && 
                                    task.status !== 'completed';
                    const isUrgent = isNearDeadline(task.deadline) && task.status !== "completed";
                    const isPriority = task.priority === 'urgent';

                    return (
                    <div
                      key={task.id}
                      className="p-4 flex flex-col gap-3 transition-colors border-b bg-white dark:bg-slate-900"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <h3 
                                    className="font-bold text-slate-900 dark:text-slate-100 leading-tight cursor-pointer"
                                    onClick={() => setSelectedTask(task)}
                                    >
                                    {task.title}
                                    </h3>
                                    {task.subtasks?.length ? (
                                        <span className="text-[8px] bg-primary/15 text-primary font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 border border-primary/40 shrink-0" title="Tiene checklist">
                                            <ListChecks className="w-3 h-3" /> {task.subtasks.filter((s: {completed?: boolean}) => s.completed).length}/{task.subtasks.length}
                                        </span>
                                    ) : null}
                                </div>
                                {isOverdue ? (
                                    <span className="text-[8px] bg-rose-50 text-rose-600 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 border border-rose-100">
                                        Vencido
                                    </span>
                                ) : isPriority && (
                                    <span className="text-[8px] bg-amber-50 text-amber-600 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 border border-amber-100">
                                        Urgente
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                <span className={cn(
                                    "flex items-center gap-1", 
                                    isOverdue ? "text-rose-500 font-bold" : isUrgent ? "text-amber-500" : "text-primary/80"
                                )}>
                                <CalendarIcon className="w-3 h-3" /> {formatDate(task.deadline)}
                                </span>
                                {assignee && (
                                    <span className="truncate max-w-[80px]">{assignee.name}</span>
                                )}
                            </div>
                            </div>
                            
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleStatus(task);
                                }}
                                className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-lg transition-all shadow-sm border",
                                    task.status === "completed"
                                    ? "bg-emerald-100 text-emerald-600 border-emerald-200"
                                    : "bg-white text-slate-300 border-slate-200"
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
                        <div className="flex items-center gap-2 flex-wrap">
                            <TaskFormDialog 
                                users={users} 
                                task={task} 
                                currentUser={currentUser}
                                trigger={
                                <button className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-slate-500 hover:text-primary hover:bg-slate-50 rounded-lg"><Edit className="w-3.5 h-3.5" /><span>Editar</span></button>
                                }
                            />
                            {!task.isArchived && (
                                <button
                                  onClick={() => bulkArchiveTasks([task.id])}
                                  className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-slate-500 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                  <span>Archivar</span>
                                </button>
                            )}
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar</span>
                            </button>
                        </div>
                        </div>
                    </div>
                    );
                })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[600px] border-collapse">
                <thead>
                <tr>
                    <th className="px-4 md:px-6 py-3.5 font-medium w-10 bg-slate-100/80 border-b-2 border-slate-200">
                    <button 
                        onClick={toggleSelectAll}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                    >
                        {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                        ) : isSomeSelected ? (
                        <div className="w-4 h-4 bg-primary/20 rounded-sm flex items-center justify-center">
                            <div className="w-2 h-0.5 bg-primary rounded-full" />
                        </div>
                        ) : (
                        <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        )}
                    </button>
                    </th>
                    <SortableHeader label="Tarea" sortKey="title" />
                    <SortableHeader label="Asignado a" sortKey="assignedUserId" />
                    <SortableHeader label="Vencimiento" sortKey="deadline" />
                    <SortableHeader label="Estado" sortKey="status" />
                    <th className="px-4 md:px-6 py-3.5 font-bold text-slate-700 dark:text-slate-200 w-[280px] max-w-[280px] bg-slate-100/80 border-b-2 border-slate-200">
                        <span className="uppercase text-xs tracking-wider">NOTAS</span>
                    </th>
                    <th className="px-4 md:px-6 py-3.5 font-medium w-10 bg-slate-100/80 border-b-2 border-slate-200"></th>
                </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800">
                {sortedTasks.map((task) => {
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
                          className="transition-colors group bg-white hover:bg-slate-50"
                        >
                            <td className="px-4 md:px-6 py-3 align-top">
                            <button 
                                onClick={() => toggleSelect(task.id)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors mt-0.5"
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
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <span 
                                        className="text-[15px] font-bold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-primary hover:underline transition-colors"
                                        onClick={() => setSelectedTask(task)}
                                        >
                                        {task.title}
                                        </span>
                                        {task.subtasks?.length ? (
                                            <span className="text-[9px] bg-primary/15 text-primary font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 border border-primary/40 shrink-0" title="Tiene checklist">
                                                <ListChecks className="w-2.5 h-2.5" /> {task.subtasks.filter((s: {completed?: boolean}) => s.completed).length}/{task.subtasks.length}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                                {isOverdue ? (
                                     <span className="text-[9px] text-rose-600 font-bold px-1.5 py-0.5 bg-rose-50 rounded uppercase tracking-wider flex items-center gap-1 border border-rose-100 w-fit">
                                        <AlertCircle className="w-2.5 h-2.5" /> Vencido
                                    </span>
                                ) : isPriority && (
                                    <span className="text-[9px] text-amber-600 font-bold px-1.5 py-0.5 bg-amber-50 rounded uppercase tracking-wider flex items-center gap-1 border border-amber-100 w-fit">
                                        <AlertTriangle className="w-2.5 h-2.5" /> Urgente
                                    </span>
                                )}
                                {(!isOverdue && !isPriority && isUrgent) && (
                                    <span className="text-[10px] text-amber-600 flex items-center gap-1 font-medium">
                                        <Clock className="w-3 h-3" /> Pronta a vencer
                                    </span>
                                )}
                                </div>
                            </div>
                            </td>
                            <td className="px-4 md:px-6 py-1.5">
                            <span className="text-slate-600 dark:text-slate-400 truncate max-w-[100px]">
                                {assignee?.name || "Sin asignar"}
                            </span>
                            </td>
                            <td
                            className={cn(
                                "px-4 md:px-6 py-4",
                                isUrgent && "text-red-600 font-bold",
                            )}
                            >
                            <div className="flex flex-col gap-1">
                                <span className={cn(
                                    "flex items-center gap-1 font-medium",
                                    isOverdue ? "text-rose-500 font-bold" : isUrgent ? "text-amber-500" : "text-slate-500"
                                )}>
                                <CalendarIcon className={cn("w-3.5 h-3.5", isOverdue ? "text-rose-500" : "text-slate-400")} />
                                {task.frequency === "date_range" && task.startDate
                                  ? `${formatDate(task.startDate)} - ${formatDate(task.deadline)}`
                                  : formatDate(task.deadline)}
                                </span>
                                {task.frequency &&
                                task.frequency !== "one_time" && (
                                    <span className="text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full w-fit flex items-center gap-1 font-normal border border-slate-200">
                                    <RefreshCw className="w-2.5 h-2.5" />
                                    {frequencyLabels[task.frequency] ||
                                        task.frequency}
                                    </span>
                                )}
                            </div>
                            </td>
                            
                            <td className="px-4 md:px-6 py-1.5">
                                <button
                                    onClick={() => toggleStatus(task)}
                                    className={cn(
                                        "flex items-center gap-2 px-2 py-1.5 rounded-md border transition-all text-xs font-medium w-full max-w-[120px] shadow-sm",
                                        task.status === "completed"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-primary hover:border-primary/30"
                                    )}
                                >
                                    {task.status === "completed" ? (
                                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                                    ) : (
                                        <Square className="w-4 h-4 text-slate-300 group-hover:text-primary" />
                                    )}
                                    <span>{statusLabels[task.status]}</span>
                                </button>
                            </td>

                            <td className="px-4 md:px-6 py-4 w-[280px] max-w-[280px]">
                            <div className="flex items-center gap-1 min-w-0">
                                <input
                                className="text-xs border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 bg-transparent focus:outline-none min-w-0 flex-1 dark:text-slate-300 placeholder:text-slate-400"
                                defaultValue={task.notes}
                                onBlur={(e) =>
                                    updateTaskNotes(task.id, e.target.value)
                                }
                                placeholder="Añadir nota..."
                                />
                                <div className="flex items-center gap-0.5 shrink-0 flex-nowrap">
                                {!task.isArchived && (
                                    <>
                                    <TaskFormDialog 
                                        users={users} 
                                        task={task} 
                                        currentUser={currentUser}
                                        trigger={
                                        <button
                                            className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-primary hover:bg-primary/5 rounded transition-all"
                                            title="Editar"
                                        >
                                            <Edit className="w-3 h-3" />
                                            <span>Editar</span>
                                        </button>
                                        }
                                    />
                                    <button
                                      onClick={async () => {
                                        if (confirm("¿Archivar esta tarea?")) {
                                          await bulkArchiveTasks([task.id]);
                                        }
                                      }}
                                      className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-primary hover:bg-primary/5 dark:hover:bg-slate-800 rounded transition-all"
                                      title="Archivar"
                                    >
                                      <Archive className="w-3 h-3" />
                                      <span>Archivar</span>
                                    </button>
                                    </>
                                )}
                                <button
                                    onClick={async () => {
                                    if (confirm("¿ELIMINAR esta tarea definitivamente?")) {
                                        await deleteTask(task.id);
                                    }
                                    }}
                                    className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                                    title="Eliminar"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Eliminar</span>
                                </button>
                                </div>
                            </div>
                            </td>
                        </tr>
                        );
                    })}
                </tbody>
            </table>
            </div>
      </div>
      )}
      
      <TaskDetailModal 
        task={selectedTask} 
        tasks={tasks}
        isOpen={!!selectedTask} 
        onClose={() => setSelectedTask(null)} 
      />
    </div>
  );
}