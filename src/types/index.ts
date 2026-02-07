export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  isActive?: boolean;
  canViewAllTasks?: boolean;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedUserId: string; // Foreign key to User.id
  deadline: string; // ISO 8601 Date string
  status: TaskStatus;
  notes: string;
  createdAt: string;
  subtasks: SubTask[];
  frequency: string;
  priority: 'normal' | 'urgent';
  isArchived: boolean;
  isPinned: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface DataStore {
  users: User[];
  tasks: Task[];
  notifications: Notification[];
}
