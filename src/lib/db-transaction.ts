import pg from 'pg';
import { getPostgresConnectionString } from '@/lib/db-pg';

export type PgQueryFn = <T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
) => Promise<pg.QueryResult<T>>;

/** Ejecuta varias sentencias en una transacción con pg (conexión directa). */
export async function withPgTransaction<T>(fn: (query: PgQueryFn) => Promise<T>): Promise<T> {
  const pool = new pg.Pool({
    connectionString: getPostgresConnectionString(),
    max: 1,
    connectionTimeoutMillis: 15_000,
  });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const query: PgQueryFn = (text, params = []) => client.query(text, params);
    const result = await fn(query);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('ROLLBACK failed:', rollbackError);
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
