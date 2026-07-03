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
  | { ok: false; reason: 'inactive' | 'db_error' };

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

export async function findUserByEmail(email: string): Promise<DbAuthUser | null> {
  const normalized = email.trim().toLowerCase();
  const rows = await queryPg<Record<string, unknown>>(
    `SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1`,
    [normalized]
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

/** Busca usuario por email o lo crea como viewer al iniciar sesión con Google. */
export async function findOrCreateGoogleUser(
  email: string,
  name?: string | null,
  image?: string | null
): Promise<GoogleUserResult> {
  try {
    const normalized = email.trim().toLowerCase();
    const existing = await findUserByEmail(normalized);

    if (existing) {
      if (!existing.is_active) {
        return { ok: false, reason: 'inactive' };
      }
      await syncGoogleProfile(existing.id, name, image);
      return { ok: true, user: existing };
    }

    const displayName = name?.trim() || normalized.split('@')[0];
    const avatarUrl = safeAvatarUrl(
      image,
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`
    );

    const inserted = await queryPg<Record<string, unknown>>(
      `INSERT INTO users (name, email, role, avatar_url, password, can_view_all_tasks)
       VALUES ($1, $2, 'viewer', $3, NULL, FALSE)
       RETURNING *`,
      [displayName, normalized, avatarUrl]
    );

    if (!inserted.length) {
      return { ok: false, reason: 'db_error' };
    }

    return { ok: true, user: mapDbUser(inserted[0]) };
  } catch (error) {
    console.error('findOrCreateGoogleUser error:', error);

    try {
      const retry = await findUserByEmail(email.trim().toLowerCase());
      if (retry) {
        if (!retry.is_active) return { ok: false, reason: 'inactive' };
        return { ok: true, user: retry };
      }
    } catch (retryError) {
      console.error('findOrCreateGoogleUser retry error:', retryError);
    }

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
