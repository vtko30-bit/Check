'use server';

import { revalidatePath } from 'next/cache';
import { sql, QueryResultRow } from '@/lib/db';
import { Notification } from '@/types';
import { auth } from '@/auth';

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
    const session = await auth();
    const currentUser = session?.user as { id?: string } | undefined;

    if (!currentUser?.id) {
      console.warn('[Notifications] getNotifications sin usuario autenticado');
      return [];
    }

    if (currentUser.id !== userId) {
      console.warn('[Notifications] Intento de leer notificaciones de otro usuario');
      return [];
    }

    const { rows } = await sql`
      SELECT * FROM notifications 
      WHERE user_id = ${currentUser.id} 
      ORDER BY created_at DESC 
      LIMIT 20
    `;
    return rows.map(mapNotification);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

export async function markAsRead(notificationId: string, userId: string) {
  try {
    const session = await auth();
    const currentUser = session?.user as { id?: string } | undefined;

    if (!currentUser?.id) {
      return { success: false, error: 'No autenticado' };
    }

    if (currentUser.id !== userId) {
      console.warn('[Notifications] Intento de marcar notificación de otro usuario');
      return { success: false, error: 'No autorizado' };
    }

    const { rowCount } = await sql`
      UPDATE notifications SET is_read = TRUE 
      WHERE id = ${notificationId} AND user_id = ${currentUser.id}
    `;
    revalidatePath('/');

    if (!rowCount) {
      return { success: false, error: 'Notificación no encontrada' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: 'No se pudo marcar la notificación como leída.' };
  }
}

export async function markAllAsRead(userId: string) {
  try {
    const session = await auth();
    const currentUser = session?.user as { id?: string } | undefined;

    if (!currentUser?.id) {
      return { success: false, error: 'No autenticado' };
    }

    if (currentUser.id !== userId) {
      console.warn('[Notifications] Intento de marcar todas como leídas para otro usuario');
      return { success: false, error: 'No autorizado' };
    }

    await sql`UPDATE notifications SET is_read = TRUE WHERE user_id = ${currentUser.id}`;
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: 'No se pudieron marcar las notificaciones como leídas.' };
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
    console.error('Error creating notification:', error);
    return { success: false, error: 'No se pudo crear la notificación.' };
  }
}

export async function sendTestNotification() {
  try {
    const session = await auth();
    const currentUser = session?.user as { role?: string } | undefined;

    if (currentUser?.role !== 'admin') {
      return { success: false, error: 'No autorizado. Solo administradores pueden enviar notificaciones de prueba.' };
    }

    const { rows } = await sql`SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1`;
    if (rows.length > 0) {
      return await createNotification(rows[0].id, '🔔 ¡Prueba de sonido de notificación exitosa!');
    }
    return { success: false, error: 'No se encontró un usuario administrador.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
     return { success: false, error: message };
  }
}
