import fs from 'fs';
import path from 'path';
import pg from 'pg';

const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations');

export async function applyPendingMigrations(): Promise<string[]> {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL no está configurada.');
  }

  const client = new pg.Client({ connectionString });
  await client.connect();
  const applied: string[] = [];

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW()
      );
    `);

    if (!fs.existsSync(MIGRATIONS_DIR)) {
      return applied;
    }

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const existing = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [file]
      );
      if ((existing.rowCount ?? 0) > 0) continue;

      const sqlContent = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query(sqlContent);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      applied.push(file);
    }
  } finally {
    await client.end();
  }

  return applied;
}
