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
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DropAnimation
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task, User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Calendar as CalendarIcon, MoreVertical } from "lucide-react";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { updateTaskStatus } from "@/actions/tasks";
import { TaskFormDialog } from "./TaskFormDialog";
import { createPortal } from "react-dom";

// --- 1. COMPONENTE DE TARJETA (Item) ---
function TaskCard({ task, users, currentUser, isOverlay }: { task: Task, users: User[], currentUser: any, isOverlay?: boolean }) {
  const assignee = users.find(u => u.id === task.assignedUserId);
  const isPriority = task.priority === 'urgent';

  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-900 p-3 rounded-lg border shadow-sm touch-none select-none",
        isPriority ? "border-l-4 border-l-red-500" : "border-l-4 border-l-primary",
        isOverlay ? "cursor-grabbing shadow-xl scale-105 rotate-2" : "cursor-grab active:cursor-grabbing hover:shadow-md"
      )}
    >
        <div className="flex justify-between items-start mb-2">
            <span className="font-semibold text-sm line-clamp-2 text-slate-800 dark:text-slate-100 leading-tight">
                {task.title}
            </span>
            {!isOverlay && (
                <div onPointerDown={(e) => e.stopPropagation()}>
                    <TaskFormDialog 
                        users={users} 
                        task={task} 
                        currentUser={currentUser}
                        trigger={
                            <button className="text-slate-400 hover:text-slate-600 p-1">
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        }
                    />
                </div>
            )}
        </div>
        
        <div className="flex items-center justify-between text-xs text-slate-500 mt-3">
             <div className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                {formatDate(task.deadline)}
             </div>
             {assignee && (
                <Avatar className="h-5 w-5 border border-slate-200 dark:border-slate-700">
                    <AvatarImage src={assignee.avatarUrl} />
                    <AvatarFallback className="text-[9px]">{assignee.name?.slice(0, 1)}</AvatarFallback>
                </Avatar>
             )}
        </div>
    </div>
  );
}

// --- 2. ENVOLTORIO SORTABLE PARA LA TARJETA ---
function SortableTaskItem({ task, users, currentUser }: { task: Task, users: User[], currentUser: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: task.id,
    data: {
        type: "Task",
        task,
    } 
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <TaskCard task={task} users={users} currentUser={currentUser} />
    </div>
  );
}

// --- 3. COMPONENTE DE COLUMNA (Aquí estaba el error antes) ---
// Ahora es un componente separado para poder usar useSortable correctamente
function BoardColumn({ 
    status, 
    tasks, 
    config, 
    users, 
    currentUser 
}: { 
    status: string, 
    tasks: Task[], 
    config: { label: string, color: string },
    users: User[],
    currentUser: any
}) {
    // Hacemos que la columna también sea un área droppable/sortable
    const { setNodeRef } = useSortable({
        id: status,
        data: {
            type: "Column",
            status
        }
    });

    return (
        <div 
            ref={setNodeRef}
            className="flex-1 min-w-[280px] flex flex-col h-full rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm"
        >
            {/* Header */}
            <div className={`p-3 bg-white dark:bg-slate-900 rounded-t-xl border-b dark:border-slate-800 flex items-center justify-between ${config.color}`}>
                <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">{config.label}</h3>
                <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {tasks.length}
                </Badge>
            </div>

            {/* Area de Tareas */}
            <div className="p-3 flex flex-col gap-3 min-h-[150px] flex-1">
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                        <SortableTaskItem key={task.id} task={task} users={users} currentUser={currentUser} />
                    ))}
                </SortableContext>
                
                {tasks.length === 0 && (
                    <div className="h-full min-h-[100px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-xs text-slate-400 italic bg-slate-50/50 dark:bg-slate-900/20">
                        Arrastra tareas aquí
                    </div>
                )}
            </div>
        </div>
    );
}

// --- 4. COMPONENTE PRINCIPAL ---
interface TaskBoardProps {
  tasks: Task[];
  users: User[];
  currentUser?: any;
}

export function TaskBoard({ tasks, users, currentUser }: TaskBoardProps) {
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const columns = {
    pending: { label: "Pendiente", color: "border-t-4 border-t-slate-300 dark:border-t-slate-600" },
    in_progress: { label: "En Progreso", color: "border-t-4 border-t-blue-500" },
    completed: { label: "Finalizado", color: "border-t-4 border-t-green-500" },
  };

  const tasksByStatus = useMemo(() => {
    const groups: Record<string, Task[]> = { pending: [], in_progress: [], completed: [] };
    tasks.forEach(task => {
        const status = groups[task.status] ? task.status : 'pending';
        groups[status].push(task);
    });
    return groups;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
     if (event.active.data.current?.type === "Task") {
         setActiveTask(event.active.data.current.task);
     }
  };

  const handleDragOver = (event: DragOverEvent) => {
     // Lógica visual opcional para reordenar mientras arrastras (podemos dejarlo simple por ahora)
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Identificar a dónde se soltó
    let newStatus = overId;

    // Si soltamos sobre otra tarea, buscamos su estado
    const overTask = tasks.find(t => t.id === overId);
    if (overTask) {
        newStatus = overTask.status;
    }

    // Verificar si es una columna válida
    if (newStatus in columns) {
        const currentTask = tasks.find(t => t.id === taskId);
        if (currentTask && currentTask.status !== newStatus) {
            const result = await updateTaskStatus(taskId, newStatus as any);
            if (!result?.success && result?.error) {
                toast.error(result.error);
            }
        }
    }
  };

  const dropAnimation: DropAnimation = {
      sideEffects: defaultDropAnimationSideEffects({
          styles: {
              active: { opacity: '0.5' },
          },
      }),
  };

  return (
    <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col md:flex-row gap-4 h-full overflow-x-auto pb-4 items-start min-h-[500px]">
        {(Object.entries(columns) as [string, { label: string, color: string }][]).map(([status, config]) => (
            <BoardColumn 
                key={status}
                status={status}
                config={config}
                tasks={tasksByStatus[status]}
                users={users}
                currentUser={currentUser}
            />
        ))}
      </div>

      {/* Overlay que sigue al mouse al arrastrar */}
      {createPortal(
        <DragOverlay dropAnimation={dropAnimation}>
            {activeTask ? (
                <TaskCard 
                    task={activeTask} 
                    users={users} 
                    currentUser={currentUser} 
                    isOverlay 
                />
            ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}