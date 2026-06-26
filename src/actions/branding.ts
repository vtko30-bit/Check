'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { validateLogoBase64 } from '@/lib/branding-validation';

export async function getBranding() {
  if (!process.env.POSTGRES_URL) return null;
  try {
    const timeout = new Promise<{ rows: { value?: string }[] }>((resolve) =>
      setTimeout(() => resolve({ rows: [] }), 8000)
    );
    const result = await Promise.race([
      sql`SELECT value FROM settings WHERE key = 'company_logo' LIMIT 1`,
      timeout,
    ]) as { rows: { value?: string }[] };
    return result?.rows?.[0]?.value || null;
  } catch (error) {
    console.error('Error fetching branding:', error);
    return null;
  }
}

async function assertAdminBrandingAccess() {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== 'admin') {
    return { success: false as const, error: 'No autorizado. Solo administradores pueden cambiar el logo.' };
  }
  if (!process.env.POSTGRES_URL) {
    return { success: false as const, error: 'Base de datos no configurada. Añade POSTGRES_URL en .env' };
  }
  return null;
}

export async function removeBranding() {
  const accessError = await assertAdminBrandingAccess();
  if (accessError) return accessError;

  try {
    await sql`DELETE FROM settings WHERE key = 'company_logo'`;

    revalidatePath('/');
    revalidatePath('/login');
    revalidatePath('/settings');
    return { success: true as const };
  } catch (error) {
    console.error('Error removing branding:', error);
    return { success: false as const, error: (error as Error).message };
  }
}

export async function updateBranding(logoBase64: string) {
  const accessError = await assertAdminBrandingAccess();
  if (accessError) return accessError;

  const validation = validateLogoBase64(logoBase64);
  if (!validation.ok) {
    return { success: false, error: validation.error };
  }

  try {
    // Check if key exists
    const exists = await sql`SELECT id FROM settings WHERE key = 'company_logo'`;
    
    if (exists.rows?.length > 0) {
      await sql`
        UPDATE settings 
        SET value = ${logoBase64}, updated_at = NOW() 
        WHERE key = 'company_logo'
      `;
    } else {
      await sql`
        INSERT INTO settings (key, value) 
        VALUES ('company_logo', ${logoBase64})
      `;
    }
    
    revalidatePath('/');
    revalidatePath('/login');
    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Error updating branding:', error);
    return { success: false, error: (error as Error).message };
  }
}
