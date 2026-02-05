'use server';

import { revalidatePath } from 'next/cache';
import { sql, QueryResultRow } from '@/lib/db';
import { Notification } from '@/types';

function mapNotification(row: QueryResultRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  try {
    const { rows } = await sql`
      SELECT * FROM notifications 
      WHERE user_id = ${userId} 
      ORDER BY created_at DESC 
      LIMIT 20
    `;
    return rows.map(mapNotification);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

export async function markAsRead(notificationId: string) {
  try {
    await sql`UPDATE notifications SET is_read = TRUE WHERE id = ${notificationId}`;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false };
  }
}

export async function markAllAsRead(userId: string) {
  try {
    await sql`UPDATE notifications SET is_read = TRUE WHERE user_id = ${userId}`;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return { success: false };
  }
}

export async function createNotification(userId: string, message: string) {
  try {
    await sql`
      INSERT INTO notifications (user_id, message)
      VALUES (${userId}, ${message})
    `;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { success: false };
  }
}

export async function sendTestNotification() {
  try {
    const { rows } = await sql`SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1`;
    if (rows.length > 0) {
      return await createNotification(rows[0].id, "🔔 ¡Prueba de sonido de notificación exitosa!");
    }
    return { success: false, error: "Admin not found" };
  } catch (error) {
     return { success: false, error: (error as Error).message };
  }
}
