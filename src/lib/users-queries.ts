import { sql } from '@/lib/db';
import { User } from '@/types';
import { QueryResultRow } from '@/lib/db';

function mapUser(row: QueryResultRow): User {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as 'admin' | 'editor' | 'viewer',
    avatarUrl:
      (row.avatar_url as string) ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.name}`,
    isActive: row.is_active !== false,
    canViewAllTasks: row.can_view_all_tasks === true,
  };
}

/** Uso interno (cron, reportes). No exponer como Server Action. */
export async function fetchAllUsers(): Promise<User[]> {
  const { rows } = await sql`SELECT * FROM users ORDER BY name ASC`;
  return rows.map(mapUser);
}

export function toPublicUserList(users: User[]): User[] {
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    avatarUrl: u.avatarUrl,
    email: '',
    role: 'viewer' as const,
    isActive: u.isActive,
    canViewAllTasks: false,
  }));
}
