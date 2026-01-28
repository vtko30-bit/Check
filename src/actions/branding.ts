'use server';

import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';

export async function getBranding() {
  try {
    const result = await sql`SELECT value FROM settings WHERE key = 'company_logo' LIMIT 1`;
    return result.rows[0]?.value || null;
  } catch (error) {
    console.error('Error fetching branding:', error);
    return null;
  }
}

export async function updateBranding(logoBase64: string) {
  try {
    // Check if key exists
    const exists = await sql`SELECT id FROM settings WHERE key = 'company_logo'`;
    
    if (exists.rowCount && exists.rowCount > 0) {
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
