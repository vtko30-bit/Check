import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { isBearerAuthorized } from '@/lib/api-auth';
import { applyPendingMigrations } from '@/lib/migrations';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isBearerAuthorized(request, 'SEED_SECRET')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Seed deshabilitado en producción' }, { status: 403 });
  }
  try {
    const appliedMigrations = await applyPendingMigrations();

    const hashedPassword = await bcrypt.hash('123456', 10);
    const demoEmail = 'admin@check.com';
    const adminExists = await sql`SELECT 1 FROM users WHERE email = ${demoEmail} LIMIT 1`;

    if (adminExists.rowCount === 0) {
      await sql`
        INSERT INTO users (name, email, role, avatar_url, password, can_view_all_tasks)
        VALUES (
          'Admin',
          ${demoEmail},
          'admin',
          'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
          ${hashedPassword},
          TRUE
        )
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Base de datos inicializada correctamente.',
      appliedMigrations,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
