'use server';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';
import { z } from 'zod';

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get('email') as string;
  if (!email || !z.string().email().safeParse(email).success) {
    return { success: false, error: 'Introduce un email válido.' };
  }

  try {
    const { rows } = await sql`SELECT id, name, is_active FROM users WHERE email = ${email} LIMIT 1`;
    if (!rows?.length) {
      return { success: true }; // No revelar si el email existe
    }
    const user = rows[0];
    if (user.is_active === false) {
      return { success: true };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await sql`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${user.id}, ${token}, ${expiresAt.toISOString()})
    `;

    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000';
    const resetLink = `${baseUrl}/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, resetLink, user.name);

    return { success: true };
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return { success: false, error: 'No se pudo enviar el correo. Intenta de nuevo.' };
  }
}

export async function resetPassword(token: string, newPassword: string) {
  const parsed = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').safeParse(newPassword);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Contraseña inválida.' };
  }

  try {
    const { rows } = await sql`
      SELECT prt.user_id FROM password_reset_tokens prt
      JOIN users u ON u.id = prt.user_id
      WHERE prt.token = ${token} AND prt.used = FALSE AND prt.expires_at > NOW() AND u.is_active IS NOT FALSE
      LIMIT 1
    `;
    if (!rows?.length) {
      return { success: false, error: 'El enlace ha expirado o no es válido. Solicita uno nuevo.' };
    }
    const userId = rows[0].user_id;

    const hashed = await bcrypt.hash(parsed.data, 10);
    await sql`UPDATE users SET password = ${hashed} WHERE id = ${userId}`;
    await sql`UPDATE password_reset_tokens SET used = TRUE WHERE token = ${token}`;

    return { success: true };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { success: false, error: 'No se pudo restablecer la contraseña.' };
  }
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    const result = await signIn('credentials', {
      redirect: false,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    });

    if (result?.error) {
      if (result.error === 'CredentialsSignin') {
        return 'Credenciales inválidas.';
      }
      return 'Algo salió mal.';
    }

    if (result?.ok) {
      redirect('/');
    }

    return 'Algo salió mal.';
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error &&
        String((error as { digest?: string }).digest)?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Credenciales inválidas.';
        default:
          return 'Algo salió mal.';
      }
    }
    return 'Algo salió mal.';
  }
}
