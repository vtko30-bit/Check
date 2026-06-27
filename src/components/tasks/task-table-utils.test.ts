import { describe, expect, it } from 'vitest';
import { filterAndSortTasks } from '@/components/tasks/task-table-utils';
import { Task } from '@/types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: '1',
    title: 'Tarea',
    description: '',
    assignedUserId: 'user-1',
    deadline: '2030-01-01',
    status: 'pending',
    notes: '',
    createdAt: new Date().toISOString(),
    subtasks: [],
    frequency: 'one_time',
    priority: 'normal',
    isArchived: false,
    isPinned: false,
    groupId: null,
    ...overrides,
  };
}

describe('filterAndSortTasks', () => {
  const tasks = [
    makeTask({ id: '1', title: 'B', assignedUserId: 'user-1' }),
    makeTask({ id: '2', title: 'A', assignedUserId: '', status: 'completed' }),
    makeTask({ id: '3', title: 'C', assignedUserId: 'user-1', isArchived: true }),
  ];

  it('oculta tareas sin asignar para no-admin', () => {
    const result = filterAndSortTasks(tasks, {
      currentUserRole: 'editor',
      viewMode: 'active',
      filter: 'all',
      dateFilter: 'all',
      sortConfig: null,
      getAssignedUserName: () => '',
    });
    expect(result.map((t) => t.id)).toEqual(['1']);
  });

  it('admin ve tareas sin asignar en activas', () => {
    const result = filterAndSortTasks(tasks, {
      currentUserRole: 'admin',
      viewMode: 'active',
      filter: 'all',
      dateFilter: 'all',
      sortConfig: null,
      getAssignedUserName: () => '',
    });
    expect(result.map((t) => t.id)).toEqual(['1', '2']);
  });

  it('ordena por título ascendente', () => {
    const result = filterAndSortTasks(tasks, {
      currentUserRole: 'admin',
      viewMode: 'active',
      filter: 'all',
      dateFilter: 'all',
      sortConfig: { key: 'title', direction: 'asc' },
      getAssignedUserName: () => '',
    });
    expect(result.map((t) => t.title)).toEqual(['A', 'B']);
  });
});
