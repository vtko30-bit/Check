#!/usr/bin/env node
/**
 * Sincroniza la base de datos de Vercel (producción) a local.
 * Uso:
 *   1. Crea .env.vercel con: POSTGRES_URL_VERCEL="url-de-vercel"
 *   2. npm install pg
 *   3. node scripts/sync-db-from-vercel.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import pg from 'pg';

const { Client } = pg;

function loadEnv(filename) {
  try {
    const p = resolve(process.cwd(), filename);
    const content = readFileSync(p, 'utf8');
    const env = {};
    for (const raw of content.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx <= 0) continue;
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      val = val.replace(/^["']|["']$/g, '');
      env[key] = val;
    }
    return env;
  } catch {
    return {};
  }
}

const vercelEnv = loadEnv('.env.vercel');
const localEnv = loadEnv('.env.local');
const defEnv = loadEnv('.env');

const PROD_URL = vercelEnv.POSTGRES_URL_VERCEL || process.env.POSTGRES_URL_VERCEL;
const LOCAL_URL = localEnv.POSTGRES_URL || defEnv.POSTGRES_URL || process.env.POSTGRES_URL;

if (!PROD_URL) {
  console.error('Error: POSTGRES_URL_VERCEL no encontrado.');
  console.error('Crea .env.vercel con: POSTGRES_URL_VERCEL="tu-url-de-vercel"');
  process.exit(1);
}
if (!LOCAL_URL) {
  console.error('Error: POSTGRES_URL no encontrado en .env.local o .env');
  process.exit(1);
}

const TABLES = ['users', 'settings', 'tasks', 'notifications', 'password_reset_tokens'];

function formatVal(val) {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object' && val !== null) return JSON.stringify(val);
  return val;
}

async function main() {
  const prod = new Client({ connectionString: PROD_URL });
  const local = new Client({ connectionString: LOCAL_URL });

  await prod.connect();
  await local.connect();

  console.log('Sincronizando desde Vercel a local...\n');

  for (const table of TABLES) {
    try {
      const res = await prod.query(`SELECT * FROM ${table}`);
      const rows = res.rows || [];
      if (rows.length === 0) {
        console.log(`  ${table}: 0 filas (vacía)`);
        continue;
      }
      const cols = Object.keys(rows[0]);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      const colList = cols.map((c) => `"${c}"`).join(', ');

      try {
        await local.query(`TRUNCATE TABLE "${table}" CASCADE`);
      } catch (trErr) {
        if (trErr.message?.includes('does not exist')) {
          console.log(`  ${table}: omitida (tabla no existe en local)`);
          continue;
        }
        throw trErr;
      }
      for (const row of rows) {
        const vals = cols.map((c) => formatVal(row[c]));
        await local.query(
          `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`,
          vals
        );
      }
      console.log(`  ${table}: ${rows.length} filas copiadas`);
    } catch (err) {
      console.error(`  ${table}: error -`, err.message);
    }
  }

  await prod.end();
  await local.end();
  console.log('\nSincronización completada.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
