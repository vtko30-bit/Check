'use client';

import React from 'react';
import { Task } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Plus,
  ListTodo,
} from "lucide-react";
import { toggleSubtask, addSubtask } from "@/actions/tasks";

interface TaskDetailModalProps {
  task: Task | null;
  tasks: Task[]; // Needed to find the latest state of the task
  isOpen: boolean;
  onClose: () => void;
}

export function TaskDetailModal({ task, tasks, isOpen, onClose }: TaskDetailModalProps) {
  if (!task) return null;

  const currentTask = tasks.find(t => t.id === task.id);
  if (!currentTask) return null;

  const subtasks = currentTask.subtasks || [];
  const completedCount = subtasks.filter(st => st.completed).length;
  const progress = subtasks.length > 0 
    ? Math.round((completedCount / subtasks.length) * 100)
    : (currentTask.status === 'completed' ? 100 : 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px] bg-slate-50 p-0 overflow-hidden shadow-2xl border border-white/20 backdrop-blur-xl">
        <div className="bg-primary/5 px-6 py-4 border-b border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                <ListTodo className="w-5 h-5" />
              </div>
              {currentTask.title}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2 mt-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {subtasks.length > 0 ? (
              subtasks.map((st) => (
                <div 
                  key={st.id} 
                  className={cn(
                    "flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer group",
                    st.completed 
                      ? "bg-slate-50 border-slate-100" 
                      : "bg-white border-slate-200 hover:border-primary/30 hover:shadow-sm"
                  )}
                  onClick={() => toggleSubtask(currentTask.id, st.id, !st.completed)}
                >
                  <span className={cn(
                    "text-sm font-medium transition-colors flex-1",
                    st.completed ? "text-slate-400 line-through" : "text-slate-700"
                  )}>
                    {st.title}
                  </span>
                  <div className={cn(
                    "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
                    st.completed 
                      ? "bg-green-500 border-green-500 text-white" 
                      : "border-slate-300 group-hover:border-primary"
                  )}>
                    {st.completed && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </div>
              ))
            ) : (
                <div className="text-center py-6 text-slate-400 italic text-sm">
                    No hay subpasos definidos.
                </div>
            )}
          </div>

          <div className="space-y-3 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Progreso de la tarea</span>
              <span className="text-sm font-bold text-primary">
                {progress}%
              </span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-primary transition-all duration-700 ease-out" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 hover:border-primary/50 transition-colors">
              <Plus className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Agregar otro paso..."
                className="text-base w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0 placeholder:text-slate-400"
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    if (val.trim()) {
                      await addSubtask(currentTask.id, val);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
