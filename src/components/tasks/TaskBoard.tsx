"use client";

import React, { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task, User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Calendar as CalendarIcon, MoreVertical } from "lucide-react";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { updateTaskStatus } from "@/actions/tasks";
import { TaskFormDialog } from "./TaskFormDialog";

// --- COMPONENTE DE TARJETA ARRSTRABLE ---
function SortableTaskItem({ task, users, currentUser }: { task: Task, users: User[], currentUser: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const assignee = users.find(u => u.id === task.assignedUserId);
  const isPriority = task.priority === 'urgent';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-white dark:bg-slate-900 p-3 rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all touch-none",
        isPriority ? "border-l-4 border-l-red-500" : "border-l-4 border-l-primary"
      )}
    >
        <div className="flex justify-between items-start mb-2">
            <span className="font-semibold text-sm line-clamp-2 text-slate-800 dark:text-slate-100">
                {task.title}
            </span>
            <TaskFormDialog 
                users={users} 
                task={task} 
                currentUser={currentUser}
                trigger={
                    <button className="text-slate-400 hover:text-slate-600">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                }
            />
        </div>
        
        <div className="flex items-center justify-between text-xs text-slate-500 mt-3">
             <div className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                {formatDate(task.deadline)}
             </div>
             {assignee && (
                <Avatar className="h-5 w-5">
                    <AvatarImage src={assignee.avatarUrl} />
                    <AvatarFallback className="text-[9px]">{assignee.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
             )}
        </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL DEL TABLERO ---
interface TaskBoardProps {
  tasks: Task[];
  users: User[];
  currentUser?: any;
}

export function TaskBoard({ tasks, users, currentUser }: TaskBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Distancia para evitar clicks accidentales
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Columnas definidas
  const columns = {
    pending: { label: "Pendiente", color: "bg-slate-100 dark:bg-slate-800/50" },
    in_progress: { label: "En Progreso", color: "bg-blue-50 dark:bg-blue-900/10" },
    completed: { label: "Finalizado", color: "bg-green-50 dark:bg-green-900/10" },
  };

  // Agrupar tareas por estado
  const tasksByStatus = useMemo(() => {
    const groups: Record<string, Task[]> = { pending: [], in_progress: [], completed: [] };
    tasks.forEach(task => {
        // Aseguramos que el estado exista, si no va a pending
        const status = groups[task.status] ? task.status : 'pending';
        groups[status].push(task);
    });
    return groups;
  }, [tasks]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string; // El ID del contenedor droppable es el estado

    // Solo actualizamos si el estado es diferente
    const currentTask = tasks.find(t => t.id === taskId);
    if (currentTask && currentTask.status !== newStatus && (newStatus in columns)) {
        // Llamada optimista (la UI ya se movió visualmente, aquí confirmamos al server)
        await updateTaskStatus(taskId, newStatus as any);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex flex-col md:flex-row gap-4 h-full overflow-x-auto pb-4 items-start">
        {(Object.entries(columns) as [string, { label: string, color: string }][]).map(([status, config]) => (
          <div key={status} className="flex-1 min-w-[280px] flex flex-col h-full rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            {/* Header de Columna */}
            <div className={`p-3 border-b dark:border-slate-800 flex items-center justify-between rounded-t-xl ${config.color}`}>
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">{config.label}</h3>
              <Badge variant="secondary" className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {tasksByStatus[status].length}
              </Badge>
            </div>

            {/* Zona de Drop */}
            <SortableContext items={tasksByStatus[status]} strategy={verticalListSortingStrategy}>
                <div 
                    id={status} // El ID de la zona es el estado (pending, completed, etc)
                    // Usamos Droppable implícito con SortableContext, pero necesitamos un ref para el DndKit core si quisiéramos drop vacío
                    // Por simplicidad, DndKit detecta el contenedor sortable.
                    className="p-3 flex flex-col gap-3 min-h-[150px]"
                    // Truco para permitir soltar en columna vacía:
                    ref={(node) => {
                        // @ts-ignore
                        useSortable({ id: status }).setNodeRef(node); 
                    }}
                >
                {tasksByStatus[status].map((task) => (
                    <SortableTaskItem key={task.id} task={task} users={users} currentUser={currentUser} />
                ))}
                {tasksByStatus[status].length === 0 && (
                    <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-xs text-slate-400">
                        Arrastra aquí
                    </div>
                )}
                </div>
            </SortableContext>
          </div>
        ))}
      </div>
    </DndContext>
  );
}