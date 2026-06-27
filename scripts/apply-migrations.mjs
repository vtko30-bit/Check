#!/usr/bin/env node
/**
 * Aplica migraciones SQL pendientes desde db/migrations/
 * Uso: node scripts/apply-migrations.mjs
 * Requiere POSTGRES_URL en el entorno (.env.local cargado manualmente o exportado).
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '../db/migrations');

async function main() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error('Error: define POSTGRES_URL antes de ejecutar migraciones.');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW()
      );
    `);

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let appliedCount = 0;
    for (const file of files) {
      const existing = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [file]
      );
      if ((existing.rowCount ?? 0) > 0) {
        console.log(`Omitida (ya aplicada): ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      console.log(`Aplicada: ${file}`);
      appliedCount++;
    }

    console.log(
      appliedCount === 0
        ? 'No hay migraciones pendientes.'
        : `Listo. ${appliedCount} migración(es) aplicada(s).`
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error aplicando migraciones:', err);
  process.exit(1);
});
