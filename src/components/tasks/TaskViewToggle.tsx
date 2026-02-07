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
    <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
      <button
        onClick={() => setView('all')}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
          currentView === 'all'
            ? "bg-white text-primary shadow-sm border border-slate-200"
            : "text-slate-500 hover:text-slate-700"
        )}
        title="Ver todas las tareas"
      >
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline">Todas</span>
      </button>
      <button
        onClick={() => setView('mine')}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
          currentView === 'mine'
            ? "bg-white text-primary shadow-sm border border-slate-200"
            : "text-slate-500 hover:text-slate-700"
        )}
        title="Solo mis tareas asignadas"
      >
        <User className="w-4 h-4" />
        <span className="hidden sm:inline">Solo mías</span>
      </button>
    </div>
  );
}
