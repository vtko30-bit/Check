'use client';

import React from 'react';
import { Task } from '@/types';
import { cn } from '@/lib/utils';
import { PinOff, CheckCircle2, Circle, Clock, ExternalLink } from 'lucide-react';

interface NoteUIProps {
  task: Task;
  rotation: number;
  colorClass: string;
  isFloating?: boolean;
  onUnpin: (e: React.MouseEvent) => void;
  onToggleStatus: (e: React.MouseEvent) => void;
  onFloat?: (e: React.MouseEvent) => void;
}

export function NoteUI({ 
  task, 
  rotation, 
  colorClass, 
  isFloating = false, 
  onUnpin, 
  onToggleStatus, 
  onFloat 
}: NoteUIProps) {
  return (
    <div 
      style={{ transform: `rotate(${rotation}deg)` }}
      className={cn(
        "relative p-4 shadow-xl border-t-4 transition-all group font-handwritten text-left",
        isFloating ? "w-[180px] h-[180px]" : "w-48 h-40 hover:scale-105",
        colorClass,
        "flex flex-col gap-0.5"
      )}
    >
      {/* Actions */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {!isFloating && onFloat && (
          <button 
            onClick={onFloat}
            className="p-1 rounded-full hover:bg-black/5 text-black/40 hover:text-black transition-colors"
            title="Flotar en escritorio"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
        <button 
          onClick={onUnpin}
          className="p-1 rounded-full hover:bg-black/5 text-black/40 hover:text-black transition-colors"
          title="Desanclar"
        >
          <PinOff className="w-4 h-4" />
        </button>
      </div>

      {/* Title */}
      <h3 className="text-2xl font-bold leading-[1.1] line-clamp-2 pr-6">
        {task.title}
      </h3>

      {/* Description */}
      <p className="text-lg opacity-100 flex-1 italic line-clamp-3 leading-snug">
        {task.description || "Sin descripción..."}
      </p>

      {/* Footer info */}
      <div className="flex items-center justify-between pt-4 border-t border-black/10 mt-auto">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Clock className="w-4 h-4" />
          {task.deadline ? new Date(task.deadline).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'S/F'}
        </div>
        
        <button 
          onClick={onToggleStatus}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded transition-colors",
            task.status === 'completed' ? "text-green-700 bg-green-500/10" : "text-black/60 hover:text-black"
          )}
        >
          {task.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
        </button>
      </div>

      {/* Post-it "tape" effect */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-6 bg-white/30 backdrop-blur-sm -rotate-1 hidden md:block" />
    </div>
  );
}
