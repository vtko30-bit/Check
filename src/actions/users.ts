'use server';

import { revalidatePath } from 'next/cache';
import { sql } from '@vercel/postgres';
import { User } from '@/types';
import bcrypt from 'bcryptjs';

// Helper to map DB row to User type if needed, strict typing
function mapUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as 'admin' | 'editor' | 'viewer',
    avatarUrl: row.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.name}`
  };
}

export async function getUsers(): Promise<User[]> {
  const { rows } = await sql`SELECT * FROM users ORDER BY name ASC`;
  return rows.map(mapUser);
}

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const role = formData.get('role') as string;
  const password = formData.get('password') as string;
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;

  const hashedPassword = await bcrypt.hash(password, 10);

  await sql`
    INSERT INTO users (name, email, role, avatar_url, password)
    VALUES (${name}, ${email}, ${role}, ${avatarUrl}, ${hashedPassword})
  `;

  revalidatePath('/users');
  revalidatePath('/'); // For assignments dropdown
}

export async function updateUserRole(userId: string, newRole: 'admin' | 'editor' | 'viewer') {
  await sql`UPDATE users SET role = ${newRole} WHERE id = ${userId}`;
  revalidatePath('/users');
}
