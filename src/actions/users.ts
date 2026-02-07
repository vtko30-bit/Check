'use server';

import { revalidatePath } from 'next/cache';
import { sql } from '@/lib/db';
import { User } from '@/types';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(255),
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'editor', 'viewer']),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  canViewAllTasks: z.union([z.boolean(), z.literal('on'), z.string()]).optional(),
});

// Helper to map DB row to User type if needed, strict typing
function mapUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as 'admin' | 'editor' | 'viewer',
    avatarUrl: row.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.name}`,
    isActive: row.is_active !== false,
    canViewAllTasks: row.can_view_all_tasks === true,
  };
}

export async function getUsers(): Promise<User[]> {
  try {
    const timeout = new Promise<{ rows: unknown[] }>((resolve) =>
      setTimeout(() => resolve({ rows: [] }), 20000)
    );
    const { rows } = await Promise.race([
      sql`SELECT * FROM users ORDER BY name ASC`,
      timeout,
    ]);
    return rows.map(mapUser);
  } catch (error) {
    console.error('Error in getUsers:', error);
    return [];
  }
}

export async function createUser(formData: FormData) {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== 'admin' && user?.role !== 'editor') {
    return { success: false, error: 'No autorizado. Solo Super Admin y Administradores pueden crear usuarios.' };
  }

  const canViewAllRaw = formData.get('canViewAllTasks') === 'on' || formData.get('canViewAllTasks') === 'true';
  const parsed = createUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    role: formData.get('role'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? 'Datos inválidos' };
  }
  const { name, email, role, password } = parsed.data;
  const canViewAll = role === 'admin' || canViewAllRaw;
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const existing = await sql`
      SELECT 1 FROM users WHERE email = ${email} LIMIT 1
    `;

    if (existing.rowCount && existing.rowCount > 0) {
      return {
        success: false,
        error: 'Ya existe un usuario registrado con ese correo.',
      };
    }

    await sql`
      INSERT INTO users (name, email, role, avatar_url, password, can_view_all_tasks)
      VALUES (${name}, ${email}, ${role}, ${avatarUrl}, ${hashedPassword}, ${canViewAll})
    `;

    revalidatePath('/users');
    revalidatePath('/'); // For assignments dropdown

    return { success: true };
  } catch (error: any) {
    // Manejo defensivo por si el SELECT anterior no detecta un duplicado
    const message = typeof error?.message === 'string' ? error.message : '';
    if (message.includes('users_email_key')) {
      return {
        success: false,
        error: 'Ya existe un usuario registrado con ese correo.',
      };
    }

    console.error('Error al crear usuario:', error);
    return {
      success: false,
      error: 'No se pudo crear el usuario. Intenta de nuevo más tarde.',
    };
  }
}

export async function updateUserRole(userId: string, newRole: 'admin' | 'editor' | 'viewer') {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== 'admin' && user?.role !== 'editor') {
    return { success: false };
  }
  await sql`UPDATE users SET role = ${newRole} WHERE id = ${userId}`;
  revalidatePath('/users');
  return { success: true };
}

const updateUserSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(255),
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'editor', 'viewer']),
  canViewAllTasks: z.boolean().optional(),
  newPassword: z.string().optional(),
});

export async function updateUser(
  userId: string,
  data: { name: string; email: string; role: string; canViewAllTasks?: boolean; newPassword?: string }
) {
  const session = await auth();
  const currentUser = session?.user as { role?: string; id?: string } | undefined;
  if (currentUser?.role !== 'admin' && currentUser?.role !== 'editor') {
    return { success: false, error: 'No autorizado.' };
  }

  const parsed = updateUserSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? 'Datos inválidos' };
  }
  const { name, email, role, canViewAllTasks, newPassword } = parsed.data;
  const finalCanViewAll = role === 'admin' || (canViewAllTasks ?? false);

  const canSetPassword = currentUser?.role === 'admin';
  const passwordToSet = canSetPassword && newPassword && newPassword.trim().length >= 6 ? newPassword.trim() : null;

  try {
    const existing = await sql`SELECT id FROM users WHERE email = ${email} AND id != ${userId}`;
    if (existing.rowCount && existing.rowCount > 0) {
      return { success: false, error: 'Ya existe otro usuario con ese correo.' };
    }
    if (passwordToSet) {
      const hashed = await bcrypt.hash(passwordToSet, 10);
      await sql`UPDATE users SET name = ${name}, email = ${email}, role = ${role}, can_view_all_tasks = ${finalCanViewAll}, password = ${hashed} WHERE id = ${userId}`;
    } else {
      await sql`UPDATE users SET name = ${name}, email = ${email}, role = ${role}, can_view_all_tasks = ${finalCanViewAll} WHERE id = ${userId}`;
    }
    revalidatePath('/users');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return { success: false, error: 'No se pudo actualizar. Intenta de nuevo.' };
  }
}

export async function setUserActive(userId: string, active: boolean) {
  const session = await auth();
  const currentUser = session?.user as { role?: string; id?: string } | undefined;
  if (currentUser?.role !== 'admin' && currentUser?.role !== 'editor') {
    return { success: false, error: 'No autorizado.' };
  }
  if (currentUser?.id === userId) {
    return { success: false, error: 'No puedes desactivarte a ti mismo.' };
  }
  try {
    await sql`UPDATE users SET is_active = ${active} WHERE id = ${userId}`;
    revalidatePath('/users');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    return { success: false, error: 'No se pudo actualizar.' };
  }
}
