'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutGrid, User } from 'lucide-react';

interface TaskViewToggleProps {
  currentView: 'all' | 'mine';
  canToggle?: boolean;
}

export function TaskViewToggle({ currentView, canToggle = true }: TaskViewToggleProps) {
  if (!canToggle) return null;
  const router = useRouter();
  const searchParams = useSearchParams();

  function setView(view: 'all' | 'mine') {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (view === 'mine') {
      params.set('view', 'mine');
    } else {
      params.delete('view');
    }
    router.push(params.toString() ? `/?${params}` : '/');
  }

  return (
    <div className="flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-0.5 sm:p-1">
      <button
        onClick={() => setView('all')}
        className={cn(
          "flex items-center gap-1 px-2 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all",
          currentView === 'all'
            ? "bg-white text-primary shadow-sm border border-slate-200"
            : "text-slate-500 hover:text-slate-700"
        )}
        title="Ver todas las tareas"
      >
        <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
        <span>Todas</span>
      </button>
      <button
        onClick={() => setView('mine')}
        className={cn(
          "flex items-center gap-1 px-2 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all",
          currentView === 'mine'
            ? "bg-white text-primary shadow-sm border border-slate-200"
            : "text-slate-500 hover:text-slate-700"
        )}
        title="Solo mis tareas asignadas"
      >
        <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
        <span className="whitespace-nowrap">Solo mías</span>
      </button>
    </div>
  );
}
