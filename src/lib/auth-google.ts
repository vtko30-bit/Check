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

export async function findUserByEmail(email: string): Promise<DbAuthUser | null> {
  const normalized = email.trim().toLowerCase();
  const { rows } = await sql`
    SELECT id, name, email, role, avatar_url, is_active, can_view_all_tasks
    FROM users
    WHERE LOWER(email) = ${normalized}
    LIMIT 1
  `;
  if (!rows.length) return null;
  const row = rows[0];
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

export async function syncGoogleProfile(
  userId: string,
  name?: string | null,
  image?: string | null
): Promise<void> {
  if (!name && !image) return;
  await sql`
    UPDATE users
    SET
      avatar_url = COALESCE(${image ?? null}, avatar_url),
      name = CASE
        WHEN ${name ?? ''} <> '' THEN ${name}
        ELSE name
      END
    WHERE id = ${userId}
  `;
}

export function isGoogleAuthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
}
