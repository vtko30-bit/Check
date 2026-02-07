import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const secret = process.env.DB_CHECK_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

/**
 * GET /api/db-check
 * Verifica la conexión a la base de datos y el estado de las tablas.
 * Requiere Authorization: Bearer <DB_CHECK_SECRET> en producción.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (process.env.NODE_ENV === 'production' && !process.env.DB_CHECK_SECRET) {
    return NextResponse.json({ error: 'Deshabilitado en producción' }, { status: 403 });
  }

  const checks: Record<string, { ok: boolean; detail?: string; error?: string }> = {};

  try {
    // 1. Probar conexión
    await sql`SELECT 1 as ping`;
    checks.conexion = { ok: true, detail: 'Conexión exitosa' };
  } catch (err) {
    checks.conexion = {
      ok: false,
      error: err instanceof Error ? err.message : 'Error desconocido',
    };
    return NextResponse.json({ ok: false, checks }, { status: 500 });
  }

  try {
    // 2. Verificar tabla users
    const users = await sql`SELECT COUNT(*) as count FROM users`;
    const userCount = Number(users.rows[0]?.count ?? 0);
    checks.tabla_users = {
      ok: true,
      detail: `${userCount} usuario(s)`,
    };
  } catch (err) {
    checks.tabla_users = {
      ok: false,
      error: err instanceof Error ? err.message : 'Tabla no existe o error',
    };
  }

  try {
    // 3. Verificar tabla tasks
    const tasks = await sql`SELECT COUNT(*) as count FROM tasks`;
    checks.tabla_tasks = {
      ok: true,
      detail: `${tasks.rows[0]?.count ?? 0} tarea(s)`,
    };
  } catch (err) {
    checks.tabla_tasks = {
      ok: false,
      error: err instanceof Error ? err.message : 'Tabla no existe',
    };
  }

  try {
    // 4. Verificar usuario admin
    const admin = await sql`SELECT id, email FROM users WHERE email = 'admin@check.com' LIMIT 1`;
    if (admin.rows.length > 0) {
      checks.usuario_admin = {
        ok: true,
        detail: 'admin@check.com existe',
      };
    } else {
      checks.usuario_admin = {
        ok: false,
        error: 'No existe admin@check.com. Ejecuta /api/seed',
      };
    }
  } catch (err) {
    checks.usuario_admin = {
      ok: false,
      error: err instanceof Error ? err.message : 'Error al verificar',
    };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  return NextResponse.json({
    ok: allOk,
    checks,
    accion: !checks.usuario_admin?.ok ? 'Visita /api/seed para crear tablas y usuario demo' : undefined,
  });
}
