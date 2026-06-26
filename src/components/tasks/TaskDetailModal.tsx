'use client';

import React, { useEffect, useState } from 'react';
import { Task } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  ListTodo,
} from 'lucide-react';
import { toast } from 'sonner';
import { toggleSubtask, updateTaskNotes } from '@/actions/tasks';
import { VoiceInputButton } from '@/components/tasks/VoiceInputButton';

interface TaskDetailModalProps {
  task: Task | null;
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
}

export function TaskDetailModal({ task, tasks, isOpen, onClose }: TaskDetailModalProps) {
  const currentTask = task ? tasks.find((t) => t.id === task.id) : null;
  const [notes, setNotes] = useState(currentTask?.notes ?? '');

  useEffect(() => {
    if (currentTask) {
      setNotes(currentTask.notes ?? '');
    }
  }, [currentTask?.id, currentTask?.notes]);

  if (!task || !currentTask) return null;

  const subtasks = currentTask.subtasks || [];
  const completedCount = subtasks.filter((st) => st.completed).length;
  const progress =
    subtasks.length > 0
      ? Math.round((completedCount / subtasks.length) * 100)
      : currentTask.status === 'completed'
        ? 100
        : 0;

  const handleVoiceTranscription = async (text: string) => {
    const next = notes ? `${notes.trimEnd()} ${text}` : text;
    setNotes(next);
    const result = await updateTaskNotes(currentTask.id, next);
    if (result.success) {
      toast.success('Nota actualizada');
    } else {
      toast.error(result.error ?? 'No se pudo guardar la nota.');
    }
  };

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
          {currentTask.description?.trim() ? (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Descripción
              </span>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-white rounded-lg border border-slate-200 p-3">
                {currentTask.description}
              </p>
            </div>
          ) : null}

          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {subtasks.length > 0 ? (
              subtasks.map((st) => (
                <div
                  key={st.id}
                  className={cn(
                    'flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer group',
                    st.completed
                      ? 'bg-slate-50 border-slate-100'
                      : 'bg-white border-slate-200 hover:border-primary/30 hover:shadow-sm'
                  )}
                  onClick={() => toggleSubtask(currentTask.id, st.id, !st.completed)}
                >
                  <span
                    className={cn(
                      'text-sm font-medium transition-colors flex-1',
                      st.completed ? 'text-slate-400 line-through' : 'text-slate-700'
                    )}
                  >
                    {st.title}
                  </span>
                  <div
                    className={cn(
                      'w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all shrink-0',
                      st.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-slate-300 group-hover:border-primary'
                    )}
                  >
                    {st.completed && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-slate-400 italic text-sm">
                No hay subpasos definidos.
              </div>
            )}
          </div>

          <div className="space-y-3 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Progreso de la tarea
              </span>
              <span className="text-sm font-bold text-primary">{progress}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Nota de la tarea
              </span>
              <VoiceInputButton onTranscription={handleVoiceTranscription} />
            </div>
            <textarea
              className="w-full text-sm bg-white rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/40 p-2 placeholder:text-slate-400 min-h-[80px] resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escribe una nota sobre esta tarea..."
              onBlur={async (e) => {
                const result = await updateTaskNotes(currentTask.id, e.target.value);
                if (!result.success && result.error) {
                  toast.error(result.error);
                }
              }}
            />
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
