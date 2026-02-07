// DB wrapper that supports BOTH Neon "direct" and "pooled" URLs.
//
// - If your URL is a pooled/pgbouncer URL, we use a Pool (recommended for serverless).
// - If your URL is a direct URL, we fall back to a Client (avoids "invalid_connection_string").
import {
  createClient,
  createPool,
  type QueryResult,
  type QueryResultRow,
} from '@vercel/postgres';

type SqlResult<O extends QueryResultRow> = Pick<QueryResult<O>, 'rows' | 'rowCount'>;

let pool: ReturnType<typeof createPool> | null = null;
let client: ReturnType<typeof createClient> | null = null;
let clientConnectPromise: Promise<void> | null = null;

function getConnectionString(): string {
  const cs = process.env.POSTGRES_URL;
  if (!cs) throw new Error('POSTGRES_URL is not configured');
  try {
    const url = new URL(cs);
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '10');
    }
    return url.toString();
  } catch {
    return cs;
  }
}

function isProbablyPooled(connectionString: string): boolean {
  // Heuristics that match Neon pooled URLs:
  // - host contains "-pooler."
  // - query contains "pgbouncer=true"
  // - pooled port 6543 (common)
  try {
    const url = new URL(connectionString);
    if (url.hostname.includes('-pooler.')) return true;
    if (url.searchParams.get('pgbouncer') === 'true') return true;
    if (url.port === '6543') return true;
    return false;
  } catch {
    // If parsing fails, be conservative and treat as direct.
    return false;
  }
}

function getPool() {
  const connectionString = getConnectionString();
  if (!pool) {
    pool = createPool({ connectionString });
  }
  return pool;
}

async function getClient() {
  const connectionString = getConnectionString();
  if (!client) {
    client = createClient({ connectionString });
  }
  if (!clientConnectPromise) {
    clientConnectPromise = client.connect().then(() => undefined);
  }
  await clientConnectPromise;
  return client;
}

export async function sql<O extends QueryResultRow = QueryResultRow>(
  strings: TemplateStringsArray,
  ...values: (string | number | boolean | undefined | null)[]
): Promise<SqlResult<O>> {
  const connectionString = getConnectionString();

  if (isProbablyPooled(connectionString)) {
    const result = await getPool().sql<O>(strings, ...values);
    return { rows: result.rows, rowCount: result.rowCount || 0 };
  }

  const c = await getClient();
  const result = await c.sql<O>(strings, ...values);
  return { rows: result.rows, rowCount: result.rowCount || 0 };
}

export type { QueryResultRow };
