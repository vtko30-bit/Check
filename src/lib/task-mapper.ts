import { QueryResultRow } from '@/lib/db';
import { Task } from '@/types';

export function mapTask(row: QueryResultRow): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || '',
    assignedUserId: (row.assigned_user_id as string) || '',
    deadline: row.deadline ? new Date(row.deadline as string).toISOString().split('T')[0] : '',
    status: row.status as Task['status'],
    notes: (row.notes as string) || '',
    createdAt: row.created_at
      ? new Date(row.created_at as string).toISOString()
      : new Date().toISOString(),
    subtasks: (row.subtasks as Task['subtasks']) || [],
    frequency: (row.frequency as string) || 'one_time',
    startDate: row.start_date
      ? new Date(row.start_date as string).toISOString().split('T')[0]
      : undefined,
    priority: (row.priority as Task['priority']) || 'normal',
    isArchived: !!row.is_archived,
    isPinned: !!row.is_pinned,
    groupId: (row.group_id as string | null) ?? null,
  };
}
