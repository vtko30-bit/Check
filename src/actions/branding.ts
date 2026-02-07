'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

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

export async function updateBranding(logoBase64: string) {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== 'admin') {
    return { success: false, error: 'No autorizado. Solo administradores pueden cambiar el logo.' };
  }
  if (!process.env.POSTGRES_URL) {
    return { success: false, error: 'Base de datos no configurada. Añade POSTGRES_URL en .env' };
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
    return { success: true };
  } catch (error) {
    console.error('Error updating branding:', error);
    return { success: false, error: (error as Error).message };
  }
}
