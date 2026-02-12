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
 * GET /api/debug-task-create
 * Endpoint temporal para depurar errores al crear tareas.
 * Intenta un INSERT de prueba y devuelve el error completo.
 * Requiere Authorization: Bearer <DB_CHECK_SECRET> en producción.
 *
 * ELIMINAR tras resolver el problema.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
  };

  try {
    // 1. Obtener columnas de la tabla tasks
    const cols = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'tasks'
      ORDER BY ordinal_position
    `;
    result.columnas_tasks = cols.rows.map((r) => `${r.column_name} (${r.data_type})`);
    result.tiene_start_date = cols.rows.some((r) => r.column_name === 'start_date');
  } catch (err) {
    result.columnas_error = err instanceof Error ? err.message : String(err);
  }

  let userId: string | null = null;
  try {
    // 2. Obtener un usuario para asignar
    const { rows } = await sql`SELECT id FROM users LIMIT 1`;
    userId = rows[0]?.id ?? null;

    // 3. Intentar INSERT de prueba
    await sql`
      INSERT INTO tasks (title, description, assigned_user_id, deadline, start_date, status, notes, created_at, subtasks, frequency, priority)
      VALUES ('Test debug', '', ${userId}, NULL, NULL, 'pending', '', NOW(), '[]', 'one_time', 'normal')
    `;
    result.insert = { ok: true, mensaje: 'INSERT de prueba exitoso' };
  } catch (err) {
    const e = err as Error;
    const msg = e.message.toLowerCase();

    // Ya no aplicamos migraciones desde este endpoint; solo informamos claramente.
    if (msg.includes('start_date') && msg.includes('column')) {
      result.insert = {
        ok: false,
        error: e.message,
        motivo: 'Falta la columna start_date en tasks. Ejecuta /api/seed (en desarrollo) o aplica las migraciones correspondientes.',
      };
    } else {
      result.insert = {
        ok: false,
        error: e.message,
        stack: process.env.NODE_ENV !== 'production' ? e.stack : undefined,
        name: e.name,
      };
    }
  }

  return NextResponse.json(result);
}
