import { sql } from '@/lib/db';

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
    role: row.role as string,
    avatar_url: (row.avatar_url as string | null) ?? null,
    is_active: row.is_active !== false,
    can_view_all_tasks: row.can_view_all_tasks === true,
  };
}

export async function findUserByEmail(email: string): Promise<DbAuthUser | null> {
  const normalized = email.trim().toLowerCase();
  const { rows } = await sql`
    SELECT id, name, email, role, avatar_url, is_active, can_view_all_tasks
    FROM users
    WHERE LOWER(email) = ${normalized}
    LIMIT 1
  `;
  if (!rows.length) return null;
  return mapDbUser(rows[0] as Record<string, unknown>);
}

/** Busca usuario por email o lo crea como viewer al iniciar sesión con Google. */
export async function findOrCreateGoogleUser(
  email: string,
  name?: string | null,
  image?: string | null
): Promise<GoogleUserResult> {
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
  const avatarUrl =
    image ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;

  try {
    const { rows } = await sql`
      INSERT INTO users (name, email, role, avatar_url, can_view_all_tasks, is_active)
      VALUES (${displayName}, ${normalized}, 'viewer', ${avatarUrl}, FALSE, TRUE)
      RETURNING id, name, email, role, avatar_url, is_active, can_view_all_tasks
    `;
    return { ok: true, user: mapDbUser(rows[0] as Record<string, unknown>) };
  } catch (error) {
    console.error('Error creating Google user:', error);
    const retry = await findUserByEmail(normalized);
    if (retry) {
      if (!retry.is_active) return { ok: false, reason: 'inactive' };
      await syncGoogleProfile(retry.id, name, image);
      return { ok: true, user: retry };
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
    if (image) {
      await sql`UPDATE users SET avatar_url = ${image} WHERE id = ${userId}`;
    }
    const trimmedName = name?.trim();
    if (trimmedName) {
      await sql`UPDATE users SET name = ${trimmedName} WHERE id = ${userId}`;
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
