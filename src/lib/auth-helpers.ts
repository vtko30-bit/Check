import { auth } from '@/auth';
import type { Session } from 'next-auth';

export type SessionUser = NonNullable<Session['user']>;

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return null;
  return session.user;
}

export function isAdmin(user: { role?: string } | null | undefined): boolean {
  return user?.role === 'admin';
}

export function isAdminOrEditor(user: { role?: string } | null | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'editor';
}

export function canAssignAdminRole(actor: { role?: string } | null | undefined): boolean {
  return isAdmin(actor);
}
