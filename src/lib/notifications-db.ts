import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/db';

/** Inserción interna; no invocable desde el cliente. */
export async function insertNotification(userId: string, message: string): Promise<void> {
  await sql`
    INSERT INTO notifications (user_id, message)
    VALUES (${userId}, ${message})
  `;
  revalidatePath('/');
}
