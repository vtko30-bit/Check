import { queryPg } from '@/lib/db-pg';

export type DbAuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  is_active: boolean;
  can_view_all_tasks: boolean;
};

export type GoogleUserResult =
  | { ok: true; user: DbAuthUser }
  | { ok: false; reason: 'inactive' | 'not_registered' | 'db_error' };

function mapDbUser(row: Record<string, unknown>): DbAuthUser {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: (row.role as string) || 'viewer',
    avatar_url: (row.avatar_url as string | null) ?? null,
    is_active: row.is_active !== false,
    can_view_all_tasks: row.can_view_all_tasks === true,
  };
}

export function resolveGoogleSignIn(existing: DbAuthUser | null): GoogleUserResult {
  if (!existing) {
    return { ok: false, reason: 'not_registered' };
  }
  if (!existing.is_active) {
    return { ok: false, reason: 'inactive' };
  }
  return { ok: true, user: existing };
}

export async function findUserByEmail(email: string): Promise<DbAuthUser | null> {
  const normalized = email.trim().toLowerCase();
  const rows = await queryPg<Record<string, unknown>>(
    `SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1`,
    [normalized]
  );
  if (!rows.length) return null;
  return mapDbUser(rows[0]);
}

export async function findUserById(id: string): Promise<DbAuthUser | null> {
  const rows = await queryPg<Record<string, unknown>>(
    `SELECT * FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!rows.length) return null;
  return mapDbUser(rows[0]);
}

function safeAvatarUrl(image?: string | null, fallback?: string): string {
  const url = image?.trim() || fallback || '';
  if (!url) {
    return 'https://api.dicebear.com/7.x/avataaars/svg?seed=Check';
  }
  return url.length > 2000 ? url.slice(0, 2000) : url;
}

/** Solo permite iniciar sesión con Google si el usuario ya existe en la BD. */
export async function findGoogleUserForSignIn(
  email: string,
  name?: string | null,
  image?: string | null
): Promise<GoogleUserResult> {
  try {
    const normalized = email.trim().toLowerCase();
    const existing = await findUserByEmail(normalized);
    const resolved = resolveGoogleSignIn(existing);

    if (!resolved.ok) {
      return resolved;
    }

    await syncGoogleProfile(resolved.user.id, name, image);
    return resolved;
  } catch (error) {
    console.error('findGoogleUserForSignIn error:', error);
    return { ok: false, reason: 'db_error' };
  }
}

export async function syncGoogleProfile(
  userId: string,
  name?: string | null,
  image?: string | null
): Promise<void> {
  try {
    const safeImage = image ? safeAvatarUrl(image) : null;
    if (safeImage) {
      await queryPg(`UPDATE users SET avatar_url = $1 WHERE id = $2`, [safeImage, userId]);
    }
    const trimmedName = name?.trim();
    if (trimmedName) {
      await queryPg(`UPDATE users SET name = $1 WHERE id = $2`, [trimmedName, userId]);
    }
  } catch (error) {
    console.error('syncGoogleProfile error:', error);
  }
}

export function applyDbUserToAuthUser(
  user: { id?: string; role?: string; email?: string | null },
  dbUser: DbAuthUser
): void {
  user.id = dbUser.id;
  user.role = dbUser.role;
  (user as { can_view_all_tasks?: boolean }).can_view_all_tasks = dbUser.can_view_all_tasks;
}

export function isGoogleAuthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
}

export function isPostgresConfigured(): boolean {
  return !!(
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.DATABASE_URL?.trim()
  );
}
