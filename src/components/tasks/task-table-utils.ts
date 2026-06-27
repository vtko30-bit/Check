import { Task } from '@/types';

export const frequencyLabels: Record<string, string> = {
  one_time: 'Una vez',
  daily: 'Diario',
  weekly: 'Semanal',
  weekly_0: 'Domingos',
  weekly_1: 'Lunes',
  weekly_2: 'Martes',
  weekly_3: 'Miércoles',
  weekly_4: 'Jueves',
  weekly_5: 'Viernes',
  weekly_6: 'Sábados',
  monday: 'Lunes',
  monthly: 'Mensual',
  date_range: 'Rango de fechas',
};

export const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  completed: 'Finalizado',
};

export type FilterType = 'all' | 'pending' | 'completed';
export type DateFilterType = 'all' | 'today' | 'week' | 'overdue';
export type ViewMode = 'active' | 'archived';
export type SortDirection = 'asc' | 'desc';
export type SortKey = 'title' | 'assignedUserId' | 'deadline' | 'status' | 'priority';

export const SORT_STORAGE_KEY = 'check-task-sort';

export function validDate(str: string) {
  return !!str && !Number.isNaN(new Date(str).getTime());
}

export function isOverdue(deadline: string, status: Task['status']) {
  if (!validDate(deadline)) return false;
  const deadlineDate = new Date(deadline);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return deadlineDate.getTime() < todayStart.getTime() && status !== 'completed';
}

export function isNearDeadline(deadline: string, status: Task['status']) {
  if (!validDate(deadline) || status === 'completed') return false;
  const d = new Date(deadline);
  const now = new Date();
  const diffTime = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 2 && diffDays >= 0;
}

export function confirmAction(message: string) {
  if (typeof window === 'undefined') return false;
  return window.confirm(message);
}

export function getStoredSort(): { key: SortKey; direction: SortDirection } | null {
  if (typeof window === 'undefined') return null;
  try {
    const s = localStorage.getItem(SORT_STORAGE_KEY);
    if (!s) return null;
    const parsed = JSON.parse(s) as { key: SortKey; direction: SortDirection };
    if (
      ['title', 'assignedUserId', 'deadline', 'status', 'priority'].includes(parsed?.key) &&
      ['asc', 'desc'].includes(parsed?.direction)
    ) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export function filterAndSortTasks(
  tasks: Task[],
  options: {
    currentUserRole?: string;
    viewMode: ViewMode;
    filter: FilterType;
    dateFilter: DateFilterType;
    sortConfig: { key: SortKey; direction: SortDirection } | null;
    getAssignedUserName: (id: string) => string;
  }
): Task[] {
  const baseTasks =
    options.currentUserRole === 'admin'
      ? tasks
      : tasks.filter((t) => !!t.assignedUserId);

  let result =
    options.viewMode === 'archived'
      ? baseTasks.filter((t) => t.isArchived)
      : baseTasks.filter((t) => !t.isArchived);

  if (options.viewMode !== 'archived') {
    if (options.filter === 'pending') {
      result = result.filter((t) => t.status === 'pending' || t.status === 'in_progress');
    } else if (options.filter === 'completed') {
      result = result.filter((t) => t.status === 'completed');
    }
    if (options.dateFilter !== 'all') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;
      const weekEnd = todayStart + 7 * 24 * 60 * 60 * 1000 - 1;
      result = result.filter((t) => {
        const d = validDate(t.deadline) ? new Date(t.deadline).getTime() : 0;
        if (options.dateFilter === 'today') return d >= todayStart && d <= todayEnd;
        if (options.dateFilter === 'week') return d >= todayStart && d <= weekEnd;
        if (options.dateFilter === 'overdue') {
          return d > 0 && d < todayStart && t.status !== 'completed';
        }
        return true;
      });
    }
  }

  if (options.sortConfig) {
    const { key, direction } = options.sortConfig;
    result.sort((a, b) => {
      let valA: string | number = a[key] as string;
      let valB: string | number = b[key] as string;

      if (key === 'assignedUserId') {
        valA = options.getAssignedUserName(valA as string);
        valB = options.getAssignedUserName(valB as string);
      }
      if (key === 'deadline') {
        valA = new Date(valA as string).getTime();
        valB = new Date(valB as string).getTime();
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return result;
}
