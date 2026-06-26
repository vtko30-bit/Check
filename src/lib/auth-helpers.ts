import { auth } from '@/auth';

export type SessionUser = {
  id?: string;
  role?: string;
  name?: string | null;
  email?: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export function isAdmin(user: SessionUser | null | undefined): boolean {
  return user?.role === 'admin';
}

export function isAdminOrEditor(user: SessionUser | null | undefined): boolean {
  return user?.role === 'admin' || user?.role === 'editor';
}

export function canAssignAdminRole(actor: SessionUser | null | undefined): boolean {
  return isAdmin(actor);
}
