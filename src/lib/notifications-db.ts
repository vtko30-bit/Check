import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/db';

/** Inserción interna; no invocable desde el cliente. */
export async function insertNotification(userId: string, message: string): Promise<void> {
  await insertNotificationsForUsers([userId], message);
}

/** Inserta la misma notificación para varios usuarios en una sola query. */
export async function insertNotificationsForUsers(
  userIds: string[],
  message: string
): Promise<void> {
  if (userIds.length === 0) return;

  const idList = `{${userIds.join(',')}}`;
  await sql`
    INSERT INTO notifications (user_id, message)
    SELECT unnest(${idList}::uuid[]), ${message}
  `;
  revalidatePath('/');
}
