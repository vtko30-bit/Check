import pg from 'pg';

export function getPostgresConnectionString(): string {
  const cs =
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.DATABASE_URL?.trim();

  if (!cs) {
    throw new Error('POSTGRES_URL is not configured');
  }

  return cs;
}

/** Query puntual con pg (fiable en callbacks OAuth serverless). */
export async function queryPg<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const pool = new pg.Pool({
    connectionString: getPostgresConnectionString(),
    max: 1,
    connectionTimeoutMillis: 15_000,
  });

  try {
    const result = await pool.query<T>(text, params);
    return result.rows;
  } finally {
    await pool.end();
  }
}
